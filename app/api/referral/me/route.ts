import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";
import { CLAIM_WINDOW_MS } from "@/lib/referralServer";

/*
 * GET /api/referral/me → le tableau de bord de parrainage du compte connecté :
 *   code, lien, clics (total + visiteurs uniques), partages, filleuls (avec « a joué »),
 *   taux de conversion, derniers 14 jours, et si le compte peut encore saisir un code.
 * Crée le code s'il manque.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const db = adminClient();
  const { data: profile } = await db.from("profiles").select("referral_code, created_at").eq("id", user.id).maybeSingle();
  let code = profile?.referral_code as string | null | undefined;
  if (!code) {
    for (let i = 0; i < 5 && !code; i++) {
      const candidate = makeCode();
      const { error } = await db.from("profiles").update({ referral_code: candidate }).eq("id", user.id);
      if (!error) code = candidate;
    }
  }

  const since14 = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
  const [{ data: refs }, { data: visits }, { count: shares }, { data: myRef }] = await Promise.all([
    db
      .from("referrals")
      .select("created_at, referred_id, referred:profiles!referrals_referred_id_fkey(display_name, username, avatar_url)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }),
    db.from("referral_visits").select("visited_at, ip_hash").eq("referrer_id", user.id).order("visited_at", { ascending: false }).limit(5000),
    db.from("referral_shares").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    db.from("referrals").select("referrer:profiles!referrals_referrer_id_fkey(display_name, username)").eq("referred_id", user.id).maybeSingle(),
  ]);

  // Filleuls qui ont vraiment joué (au moins un score enregistré).
  const referredIds = (refs ?? []).map((r) => r.referred_id);
  const played = new Set<string>();
  if (referredIds.length) {
    const { data: scores } = await db.from("blindtest_scores").select("user_id").in("user_id", referredIds);
    for (const s of scores ?? []) played.add(s.user_id);
  }
  const referred = (refs ?? []).map((r) => {
    const p = (Array.isArray(r.referred) ? r.referred[0] : r.referred) as { display_name?: string; username?: string; avatar_url?: string } | null;
    return { name: p?.display_name ?? p?.username ?? "Un ami", avatar: p?.avatar_url ?? null, at: r.created_at, played: played.has(r.referred_id) };
  });

  const v = visits ?? [];
  const uniques = new Set(v.map((x) => x.ip_hash ?? Math.random().toString())).size;
  const days: { day: string; clicks: number; signups: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
    days.push({ day: d, clicks: 0, signups: 0 });
  }
  const byDay = new Map(days.map((d) => [d.day, d]));
  for (const x of v) if (x.visited_at >= since14) { const d = byDay.get(x.visited_at.slice(0, 10)); if (d) d.clicks++; }
  for (const r of refs ?? []) if (r.created_at >= since14) { const d = byDay.get(r.created_at.slice(0, 10)); if (d) d.signups++; }

  const sponsor = myRef?.referrer ? ((Array.isArray(myRef.referrer) ? myRef.referrer[0] : myRef.referrer) as { display_name?: string; username?: string }) : null;
  const canEnterCode = !sponsor && !!profile?.created_at && Date.now() - new Date(profile.created_at).getTime() < CLAIM_WINDOW_MS;

  return NextResponse.json({
    code,
    count: referred.length,
    referred,
    clicks: v.length,
    uniqueClicks: uniques,
    lastClickAt: v[0]?.visited_at ?? null,
    shares: shares ?? 0,
    conversion: uniques ? Math.round((referred.length / uniques) * 100) : null,
    days,
    sponsor: sponsor ? sponsor.display_name ?? sponsor.username ?? "Un ami" : null,
    canEnterCode,
  });
}
