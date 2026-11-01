import { NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/*
 * GET /api/admin/referrals — suivi complet du parrainage :
 *   funnel global (partages → clics → inscrits → joueurs), par parrain (clics uniques,
 *   partages, filleuls, joueurs, taux, dernier clic, origine des rattachements), détail de
 *   chaque filleul (e-mail, inscription, parties jouées, même IP que le parrain → suspect),
 *   et les 30 derniers jours pour la courbe.
 */
type Filleul = { id: string; name: string; email: string; at: string; source: string | null; games: number; suspect: boolean };
type Referrer = {
  id: string; name: string; username: string | null; email: string; code: string | null; avatar: string | null;
  clicks: number; uniqueClicks: number; shares: number; count: number; played: number; conversion: number | null;
  lastClickAt: string | null; lastSignupAt: string | null; suspects: number; referred: Filleul[];
};

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const db = adminClient();
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [{ data: refs }, { data: visits }, { data: shares }, { data: coded }] = await Promise.all([
    db.from("referrals").select("referrer_id, referred_id, created_at, source, ip_hash"),
    db.from("referral_visits").select("code, referrer_id, visited_at, ip_hash").order("visited_at", { ascending: false }).limit(20000),
    db.from("referral_shares").select("user_id, channel, created_at"),
    db.from("profiles").select("id").not("referral_code", "is", null),
  ]);

  const ids = [...new Set([
    ...(refs ?? []).flatMap((r) => [r.referrer_id, r.referred_id]),
    ...(visits ?? []).map((v) => v.referrer_id).filter((x): x is string => !!x),
    ...(shares ?? []).map((s) => s.user_id),
  ])];
  const { data: profiles } = ids.length ? await db.from("profiles").select("id, username, display_name, referral_code, avatar_url").in("id", ids) : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  const referredIds = (refs ?? []).map((r) => r.referred_id);
  const gamesBy = new Map<string, number>();
  if (referredIds.length) {
    const { data: scores } = await db.from("blindtest_scores").select("user_id").in("user_id", referredIds);
    for (const s of scores ?? []) gamesBy.set(s.user_id, (gamesBy.get(s.user_id) ?? 0) + 1);
  }

  // Clics par parrain (total + uniques par ip_hash) et empreintes IP vues par parrain.
  const clicksBy = new Map<string, { total: number; ips: Set<string>; last: string | null }>();
  for (const v of visits ?? []) {
    if (!v.referrer_id) continue;
    const c = clicksBy.get(v.referrer_id) ?? { total: 0, ips: new Set<string>(), last: null };
    c.total++; if (v.ip_hash) c.ips.add(v.ip_hash); if (!c.last) c.last = v.visited_at;
    clicksBy.set(v.referrer_id, c);
  }
  const sharesBy = new Map<string, number>();
  for (const s of shares ?? []) sharesBy.set(s.user_id, (sharesBy.get(s.user_id) ?? 0) + 1);

  // Un filleul est « suspect » quand son rattachement vient de la même IP qu'un autre filleul
  // du même parrain (plusieurs comptes créés depuis la même connexion) — un indice, pas une
  // preuve : à vérifier avant le tirage.
  const map = new Map<string, Referrer>();
  function ensure(id: string): Referrer {
    let r = map.get(id);
    if (!r) {
      const p = byId.get(id);
      const c = clicksBy.get(id);
      r = {
        id, name: p?.display_name ?? p?.username ?? id.slice(0, 8), username: p?.username ?? null, email: emailById.get(id) ?? "",
        code: p?.referral_code ?? null, avatar: p?.avatar_url ?? null,
        clicks: c?.total ?? 0, uniqueClicks: c?.ips.size ?? 0, shares: sharesBy.get(id) ?? 0,
        count: 0, played: 0, conversion: null, lastClickAt: c?.last ?? null, lastSignupAt: null, suspects: 0, referred: [],
      };
      map.set(id, r);
    }
    return r;
  }
  for (const id of new Set([...clicksBy.keys(), ...sharesBy.keys()])) ensure(id);

  const ipSeenPerReferrer = new Map<string, Map<string, number>>();
  for (const r of refs ?? []) {
    if (!r.ip_hash) continue;
    const m = ipSeenPerReferrer.get(r.referrer_id) ?? new Map<string, number>();
    m.set(r.ip_hash, (m.get(r.ip_hash) ?? 0) + 1); ipSeenPerReferrer.set(r.referrer_id, m);
  }
  for (const r of refs ?? []) {
    const cur = ensure(r.referrer_id);
    const f = byId.get(r.referred_id);
    const games = gamesBy.get(r.referred_id) ?? 0;
    const dupIp = !!r.ip_hash && (ipSeenPerReferrer.get(r.referrer_id)?.get(r.ip_hash) ?? 0) > 1;
    const suspect = dupIp;
    cur.count += 1; if (games > 0) cur.played += 1; if (suspect) cur.suspects += 1;
    if (!cur.lastSignupAt || r.created_at > cur.lastSignupAt) cur.lastSignupAt = r.created_at;
    cur.referred.push({ id: r.referred_id, name: f?.display_name ?? f?.username ?? r.referred_id.slice(0, 8), email: emailById.get(r.referred_id) ?? "", at: r.created_at, source: r.source ?? null, games, suspect });
  }
  for (const r of map.values()) {
    r.referred.sort((a, b) => (a.at < b.at ? 1 : -1));
    r.conversion = r.uniqueClicks ? Math.round((r.count / r.uniqueClicks) * 100) : null;
  }
  const referrers = [...map.values()].sort((a, b) => b.count - a.count || b.uniqueClicks - a.uniqueClicks);

  // Courbe 30 jours.
  const days: { day: string; clicks: number; signups: number }[] = [];
  for (let i = 29; i >= 0; i--) days.push({ day: new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10), clicks: 0, signups: 0 });
  const byDay = new Map(days.map((d) => [d.day, d]));
  for (const v of visits ?? []) if (v.visited_at >= since30) { const d = byDay.get(v.visited_at.slice(0, 10)); if (d) d.clicks++; }
  for (const r of refs ?? []) if (r.created_at >= since30) { const d = byDay.get(r.created_at.slice(0, 10)); if (d) d.signups++; }

  const allIps = new Set((visits ?? []).map((v) => v.ip_hash).filter(Boolean));
  const bySource: Record<string, number> = {};
  for (const r of refs ?? []) bySource[r.source ?? "inconnu"] = (bySource[r.source ?? "inconnu"] ?? 0) + 1;

  return NextResponse.json({
    funnel: {
      withCode: coded?.length ?? 0,
      sharers: sharesBy.size,
      shares: shares?.length ?? 0,
      clicks: visits?.length ?? 0,
      uniqueClicks: allIps.size,
      signups: refs?.length ?? 0,
      played: (refs ?? []).filter((r) => (gamesBy.get(r.referred_id) ?? 0) > 0).length,
      suspects: referrers.reduce((n, r) => n + r.suspects, 0),
    },
    bySource,
    days,
    total: refs?.length ?? 0,
    referrers,
  });
}
