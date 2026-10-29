import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * GET /api/admin/analytics/site?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Toutes les données du site sur une période, calculées depuis nos propres tables :
 *   visit_logs (toutes les visites, anonymes comprises : IP, géo, page, source, appareil)
 *   blindtest_scores (parties), profiles (inscriptions), user_events (actions des connectés)
 * + la même chose sur la période précédente de même longueur, pour les variations.
 */
type Visit = { ip: string | null; country: string | null; city: string | null; path: string | null; referer: string | null; user_agent: string | null; created_at: string };

function day(iso: string) { return iso.slice(0, 10); }
function hostOf(ref: string | null) {
  if (!ref) return "Direct";
  try { const h = new URL(ref).hostname.replace(/^www\./, ""); return h.includes("dailyrapfrance") ? "Interne" : h; } catch { return "Autre"; }
}
function device(ua: string | null) {
  if (!ua) return "Inconnu";
  if (/iPad|Tablet/i.test(ua)) return "Tablette";
  if (/Mobi|Android|iPhone/i.test(ua)) return "Mobile";
  return "Ordinateur";
}
function browser(ua: string | null) {
  if (!ua) return "Inconnu";
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Instagram/.test(ua)) return "Instagram (in-app)";
  if (/TikTok|Bytedance/i.test(ua)) return "TikTok (in-app)";
  return "Autre";
}
function os(ua: string | null) {
  if (!ua) return "Inconnu";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Mac OS/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Autre";
}
function normPath(p: string | null) {
  if (!p) return "/";
  if (p.startsWith("/profil/")) return "/profil/*";
  if (p.startsWith("/b/")) return "/b/*";
  return p;
}
function top(map: Map<string, number>, n = 12) { return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value })); }
function inc(map: Map<string, number>, k: string, by = 1) { map.set(k, (map.get(k) ?? 0) + by); }

async function fetchAll<T>(q: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, _label: string): Promise<T[]> {
  const { data, error } = await q();
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function period(from: Date, to: Date) {
  const db = adminClient();
  const f = from.toISOString(), t = to.toISOString();
  const [visits, scores, signups, events] = await Promise.all([
    fetchAll<Visit>(() => db.from("visit_logs").select("ip, country, city, path, referer, user_agent, created_at").gte("created_at", f).lt("created_at", t).order("created_at", { ascending: true }).limit(100000), "visits"),
    fetchAll<{ theme: string; points: number; rounds: number; user_id: string | null; created_at: string }>(() => db.from("blindtest_scores").select("theme, points, rounds, user_id, created_at").gte("created_at", f).lt("created_at", t).limit(100000), "scores"),
    fetchAll<{ id: string; created_at: string }>(() => db.from("profiles").select("id, created_at").gte("created_at", f).lt("created_at", t).limit(100000), "signups"),
    fetchAll<{ user_id: string; event_type: string; path: string | null; meta: Record<string, unknown> | null; created_at: string }>(() => db.from("user_events").select("user_id, event_type, path, meta, created_at").gte("created_at", f).lt("created_at", t).neq("event_type", "heartbeat").limit(100000), "events"),
  ]);

  // Jours de la période
  const days: string[] = [];
  for (let d = new Date(from); d < to; d = new Date(d.getTime() + 86_400_000)) days.push(d.toISOString().slice(0, 10));
  const perDay = Object.fromEntries(days.map((d) => [d, { visits: 0, visitors: 0, games: 0, signups: 0 }]));
  const visitorsPerDay = new Map<string, Set<string>>();
  const visitorsAll = new Set<string>();
  const pages = new Map<string, number>(), sources = new Map<string, number>(), countries = new Map<string, number>(), cities = new Map<string, number>();
  const devices = new Map<string, number>(), browsers = new Map<string, number>(), oses = new Map<string, number>();
  const hours = Array.from({ length: 24 }, () => 0);
  const weekdays = Array.from({ length: 7 }, () => 0);
  const landing = new Map<string, number>();
  const firstSeen = new Set<string>();
  for (const v of visits) {
    const d = day(v.created_at); if (!perDay[d]) continue;
    const vid = `${v.ip ?? "?"}|${device(v.user_agent)}`;
    perDay[d].visits++;
    if (!visitorsPerDay.has(d)) visitorsPerDay.set(d, new Set());
    visitorsPerDay.get(d)!.add(vid); visitorsAll.add(vid);
    inc(pages, normPath(v.path)); inc(sources, hostOf(v.referer));
    if (v.country) inc(countries, v.country); if (v.city) inc(cities, `${v.city}${v.country ? ` (${v.country})` : ""}`);
    inc(devices, device(v.user_agent)); inc(browsers, browser(v.user_agent)); inc(oses, os(v.user_agent));
    const dt = new Date(v.created_at); hours[(dt.getUTCHours() + 1) % 24]++; weekdays[(dt.getUTCDay() + 6) % 7]++; // ≈ heure de Paris
    if (!firstSeen.has(vid)) { firstSeen.add(vid); inc(landing, normPath(v.path)); }
  }
  for (const [d, set] of visitorsPerDay) perDay[d].visitors = set.size;

  const themes = new Map<string, number>(), modes = new Map<string, number>();
  const players = new Set<string>(); let points = 0;
  for (const s of scores) {
    const d = day(s.created_at); if (perDay[d]) perDay[d].games++;
    const base = s.theme.startsWith("defi:") ? "Défi de la semaine" : s.theme === "custom" ? "Blind test perso" : s.theme.includes(":") ? s.theme.split(":")[1] : s.theme;
    inc(themes, base);
    inc(modes, s.theme.startsWith("defi:") ? "Défi" : s.theme.startsWith("survival:") ? "Survie" : s.theme.startsWith("sprint:") ? "Sprint" : s.theme === "custom" ? "Perso" : "Classique");
    if (s.user_id) players.add(s.user_id); points += s.points ?? 0;
  }
  for (const p of signups) { const d = day(p.created_at); if (perDay[d]) perDay[d].signups++; }

  const eventTypes = new Map<string, number>(); const activeUsers = new Set<string>();
  const gameStartModes = new Map<string, number>(); let starts = 0, ends = 0;
  for (const e of events) {
    inc(eventTypes, e.event_type); activeUsers.add(e.user_id);
    if (e.event_type === "game_start") { starts++; inc(gameStartModes, String(e.meta?.mode ?? "?")); }
    if (e.event_type === "game_end") ends++;
  }

  return {
    totals: {
      pageviews: visits.length, visitors: visitorsAll.size, games: scores.length, players: players.size, signups: signups.length,
      activeUsers: activeUsers.size, avgPoints: scores.length ? Math.round((points / scores.length) * 10) / 10 : 0,
      shares: eventTypes.get("share") ?? 0, instagram: eventTypes.get("click_instagram") ?? 0, starts, ends,
      completion: starts ? Math.round((ends / starts) * 100) : null,
    },
    days: days.map((d) => ({ day: d, ...perDay[d] })),
    pages: top(pages, 15), landing: top(landing, 10), sources: top(sources, 12), countries: top(countries, 10), cities: top(cities, 12),
    devices: top(devices, 4), browsers: top(browsers, 8), oses: top(oses, 6), hours, weekdays,
    themes: top(themes, 15), modes: top(modes, 6), eventTypes: top(eventTypes, 12), gameStartModes: top(gameStartModes, 6),
    truncated: visits.length >= 100000,
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const sp = req.nextUrl.searchParams;
  const to = sp.get("to") ? new Date(`${sp.get("to")}T00:00:00Z`) : new Date(new Date().setUTCHours(0, 0, 0, 0));
  const toExcl = new Date(to.getTime() + 86_400_000); // inclusif
  const from = sp.get("from") ? new Date(`${sp.get("from")}T00:00:00Z`) : new Date(toExcl.getTime() - 28 * 86_400_000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(toExcl.getTime()) || from >= toExcl) return NextResponse.json({ error: "période invalide" }, { status: 400 });
  const len = toExcl.getTime() - from.getTime();
  if (len > 400 * 86_400_000) return NextResponse.json({ error: "période trop longue (400 jours max)" }, { status: 400 });
  try {
    const [cur, prev] = await Promise.all([period(from, toExcl), period(new Date(from.getTime() - len), from)]);
    return NextResponse.json({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), current: cur, previous: { totals: prev.totals } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
