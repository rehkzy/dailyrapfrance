import { NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/stats — toutes les métriques du tableau de bord en un appel.
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const db = adminClient();
  const now = Date.now();
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  const DAY = 86_400_000;

  const [
    usersTotal,
    users7d,
    users30d,
    gamesTotal,
    games7d,
    roomsActive,
    friendshipsAccepted,
    recentScores,
    recentUsers,
    topScores,
    recentlyOnline,
    onlineNow,
  ] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", iso(7 * DAY)),
    db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", iso(30 * DAY)),
    db.from("blindtest_scores").select("id", { count: "exact", head: true }),
    db.from("blindtest_scores").select("id", { count: "exact", head: true }).gte("created_at", iso(7 * DAY)),
    db.from("rooms").select("id", { count: "exact", head: true }).neq("status", "finished"),
    db.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    // 14 derniers jours de parties — pour la courbe d'activité et les thèmes joués.
    db
      .from("blindtest_scores")
      .select("theme, points, created_at")
      .gte("created_at", iso(14 * DAY))
      .order("created_at", { ascending: false })
      .limit(5000),
    db
      .from("profiles")
      .select("id, display_name, username, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    db
      .from("blindtest_scores")
      .select("points, theme, rounds, created_at, user_id, profiles(display_name, username)")
      .order("points", { ascending: false })
      .limit(10),
    // Joueurs les plus récemment actifs (présence alimentée par ActivityTracker côté site).
    db
      .from("profiles")
      .select("id, display_name, username, last_seen_at")
      .not("last_seen_at", "is", null)
      .order("last_seen_at", { ascending: false })
      .limit(12),
    // En ligne "maintenant" au sens strict : activité dans la dernière minute.
    db.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", iso(60_000)),
  ]);

  // Agrégats côté serveur sur la fenêtre 14 jours
  const scores = recentScores.data ?? [];
  const perDay: Record<string, number> = {};
  const themeCounts: Record<string, number> = {};
  let pointsSum = 0;
  for (const s of scores) {
    const day = (s.created_at as string).slice(0, 10);
    perDay[day] = (perDay[day] ?? 0) + 1;
    themeCounts[s.theme] = (themeCounts[s.theme] ?? 0) + 1;
    pointsSum += s.points ?? 0;
  }
  const days: { day: string; games: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now - i * DAY).toISOString().slice(0, 10);
    days.push({ day, games: perDay[day] ?? 0 });
  }
  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([theme, games]) => ({ theme, games }));

  return NextResponse.json({
    totals: {
      users: usersTotal.count ?? 0,
      users7d: users7d.count ?? 0,
      users30d: users30d.count ?? 0,
      games: gamesTotal.count ?? 0,
      games7d: games7d.count ?? 0,
      roomsActive: roomsActive.count ?? 0,
      friendships: friendshipsAccepted.count ?? 0,
      avgPoints14d: scores.length ? Math.round((pointsSum / scores.length) * 10) / 10 : 0,
      onlineNow: onlineNow.count ?? 0,
    },
    days,
    topThemes,
    recentUsers: recentUsers.data ?? [],
    topScores: topScores.data ?? [],
    recentlyOnline: (recentlyOnline.data ?? []).map((u) => ({
      ...u,
      isOnline: u.last_seen_at ? now - new Date(u.last_seen_at).getTime() < 60_000 : false,
    })),
  });
}
