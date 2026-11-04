import "server-only";
import { adminClient } from "@/lib/adminAuth";

/*
 * Parrainage côté serveur — le rattachement ne dépend plus du navigateur :
 *  - le middleware pose un cookie `drf_ref` quand quelqu'un arrive par ?ref=CODE (et journalise
 *    le clic) ;
 *  - /auth/callback (retour Google) lit ce cookie et rattache le compte immédiatement ;
 *  - /api/referral/claim reste le filet (localStorage, ou code saisi à la main).
 */

export const REF_COOKIE = "drf_ref";
export const REF_COOKIE_MAX_AGE = 30 * 24 * 3600; // 30 jours : on vient par un lien, on s'inscrit plus tard
export const CLAIM_WINDOW_MS = 7 * 24 * 3600 * 1000; // compte créé il y a moins de 7 jours

export function isValidCode(code: unknown): code is string {
  return typeof code === "string" && /^[A-Z0-9]{4,12}$/.test(code);
}

export async function hashIp(ip: string | null | undefined): Promise<string | null> {
  if (!ip) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "|drf-ref"));
  return Array.from(new Uint8Array(buf)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type ClaimReason = "ok" | "already" | "invalid" | "self" | "too_old" | "unknown_code" | "no_profile" | "db_error";

/** Rattache `userId` au propriétaire de `code`. Idempotent : un filleul ne compte qu'une fois. */
export async function claimReferral(
  userId: string,
  rawCode: string,
  source: "cookie" | "url" | "local" | "manual",
  ipHash: string | null = null
): Promise<{ ok: boolean; reason: ClaimReason }> {
  const code = rawCode.trim().toUpperCase();
  if (!isValidCode(code)) return { ok: false, reason: "invalid" };
  const db = adminClient();

  const { data: existing } = await db.from("referrals").select("id").eq("referred_id", userId).maybeSingle();
  if (existing) return { ok: true, reason: "already" };

  const { data: me } = await db.from("profiles").select("id, created_at, referral_code").eq("id", userId).maybeSingle();
  if (!me) return { ok: false, reason: "no_profile" };
  if (me.referral_code === code) return { ok: false, reason: "self" };
  if (Date.now() - new Date(me.created_at).getTime() > CLAIM_WINDOW_MS) return { ok: false, reason: "too_old" };

  const { data: referrer } = await db.from("profiles").select("id").eq("referral_code", code).maybeSingle();
  if (!referrer) return { ok: false, reason: "unknown_code" };

  const { error } = await db.from("referrals").insert({ referrer_id: referrer.id, referred_id: userId, source, ip_hash: ipHash });
  if (error && /duplicate|unique/i.test(error.message)) return { ok: true, reason: "already" };
  if (error) return { ok: false, reason: "db_error" };
  // Parrain et filleul deviennent amis d'office : c'est le sens d'une invitation, et ça
  // remplit la page Amis sans demande à accepter. Ignoré si un lien existe déjà.
  await db.from("friendships").upsert(
    { requester_id: referrer.id, addressee_id: userId, status: "accepted" },
    { onConflict: "requester_id,addressee_id", ignoreDuplicates: true }
  );
  return { ok: true, reason: "ok" };
}
