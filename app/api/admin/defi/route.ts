import { NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";
import { getWeeklyThemeAt } from "@/lib/themes";
import { weekKey, weeklyNumber } from "@/lib/dailyStreak";

export const dynamic = "force-dynamic";

// Défi de la semaine : semaine en cours (participants, top 5), les 2 passées et les 4 à venir.
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const db = adminClient();
  const DAY = 86_400_000;
  const weeks = [-2, -1, 0, 1, 2, 3, 4].map((off) => {
    const d = new Date(Date.now() + off * 7 * DAY);
    const t = getWeeklyThemeAt(off);
    return { offset: off, key: weekKey(d), number: weeklyNumber(d), theme: t.id, label: t.label.replace(/^Blind Test /i, "") };
  });
  const current = weeks.find((w) => w.offset === 0)!;
  const { data: scores } = await db
    .from("blindtest_scores")
    .select("points, user_id, created_at, profiles(display_name, username, verified)")
    .eq("theme", `defi:${current.key}`)
    .order("points", { ascending: false })
    .limit(500);
  const best = new Map<string, { points: number; name: string; verified: boolean }>();
  for (const s of scores ?? []) {
    const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    if (!best.has(s.user_id)) best.set(s.user_id, { points: s.points, name: p?.display_name ?? p?.username ?? "Joueur", verified: !!p?.verified });
  }
  const pastKeys = weeks.filter((w) => w.offset < 0).map((w) => `defi:${w.key}`);
  const { data: past } = pastKeys.length ? await db.from("blindtest_scores").select("theme, user_id").in("theme", pastKeys) : { data: [] };
  const pastCounts = new Map<string, Set<string>>();
  for (const s of past ?? []) { if (!pastCounts.has(s.theme)) pastCounts.set(s.theme, new Set()); pastCounts.get(s.theme)!.add(s.user_id); }
  return NextResponse.json({
    weeks: weeks.map((w) => ({ ...w, participants: w.offset === 0 ? best.size : w.offset < 0 ? pastCounts.get(`defi:${w.key}`)?.size ?? 0 : null })),
    current: { ...current, attempts: scores?.length ?? 0, participants: best.size, top: [...best.values()].sort((a, b) => b.points - a.points).slice(0, 10) },
  });
}
