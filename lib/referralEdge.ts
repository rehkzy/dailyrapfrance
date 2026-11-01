import { geolocation, ipAddress } from "@vercel/functions/headers";
import { createClient } from "@supabase/supabase-js";
import type { NextFetchEvent, NextRequest } from "next/server";

/*
 * Parrainage — partie exécutée dans le middleware (edge) : détecte ?ref=CODE, renvoie le
 * cookie à poser et journalise le clic dans referral_visits en tâche de fond.
 */
const REF_COOKIE = "drf_ref";
const MAX_AGE = 30 * 24 * 3600;

async function hashIp(ip: string | null | undefined): Promise<string | null> {
  if (!ip) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "|drf-ref"));
  return Array.from(new Uint8Array(buf)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function captureReferral(req: NextRequest, event: NextFetchEvent) {
  const raw = req.nextUrl.searchParams.get("ref");
  if (!raw || !/^[A-Za-z0-9]{4,12}$/.test(raw)) return null;
  const code = raw.toUpperCase();
  // Premier lien gagnant : on n'écrase pas un cookie déjà posé par un autre parrain.
  const already = req.cookies.get(REF_COOKIE)?.value;

  event.waitUntil(
    (async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return;
        const db = createClient(url, key, { auth: { persistSession: false } });
        const { data: owner } = await db.from("profiles").select("id").eq("referral_code", code).maybeSingle();
        const geo = geolocation(req);
        await db.from("referral_visits").insert({
          code,
          referrer_id: owner?.id ?? null,
          path: req.nextUrl.pathname,
          ip_hash: await hashIp(ipAddress(req)),
          country: geo.country ?? null,
          user_agent: req.headers.get("user-agent"),
          referer: req.headers.get("referer"),
        });
      } catch {}
    })()
  );

  if (already && /^[A-Z0-9]{4,12}$/.test(already)) return null;
  return { name: REF_COOKIE, value: code, maxAge: MAX_AGE, path: "/", sameSite: "lax" as const, httpOnly: true, secure: process.env.NODE_ENV === "production" };
}
