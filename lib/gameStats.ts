export type ScoreRow = { theme: string; rounds: number; points: number; created_at: string };

export function computeStats(games: ScoreRow[]) {
  const gamesPlayed = games.length;
  const bestScore = games.reduce((m, g) => Math.max(m, g.points), 0);
  const avgScore = gamesPlayed > 0 ? Math.round(games.reduce((s, g) => s + g.points, 0) / gamesPlayed) : 0;

  // "Compétences" — moyenne de points par thème joué, pour repérer les points forts. Il faut
  // au moins 2 parties sur un thème pour l'afficher (une seule partie n'est pas un signal
  // fiable de compétence).
  const byTheme = new Map<string, { total: number; count: number }>();
  for (const g of games) {
    const cur = byTheme.get(g.theme) ?? { total: 0, count: 0 };
    cur.total += g.points;
    cur.count += 1;
    byTheme.set(g.theme, cur);
  }
  const skills = [...byTheme.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([theme, v]) => ({ theme, avg: Math.round(v.total / v.count), count: v.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6);

  return { gamesPlayed, bestScore, avgScore, skills };
}
