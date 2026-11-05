import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { weekKey } from "@/lib/dailyStreak";

/*
 * Classement entre amis — le seul classement qu'on peut vraiment gagner.
 * Pour une personne : ses amis acceptés + elle, meilleur score chacun sur un thème (défi de
 * la semaine par défaut) ou toutes parties confondues sur 7 jours.
 */
export type FriendRank = { id: string; name: string; username: string | null; avatar: string | null; best: number; me: boolean };

export async function friendIds(db: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await db
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  return (data ?? []).map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
}

export async function friendsLeaderboard(
  db: SupabaseClient,
  userId: string,
  opts: { theme?: string; sinceDays?: number } = {}
): Promise<{ rows: FriendRank[]; myRank: number | null; above: FriendRank | null; below: FriendRank | null }> {
  const ids = await friendIds(db, userId);
  const everyone = [userId, ...ids];
  const theme = opts.theme ?? `defi:${weekKey()}`;

  let q = db.from("blindtest_scores").select("user_id, points").in("user_id", everyone);
  if (theme !== "*") q = q.eq("theme", theme);
  if (opts.sinceDays) q = q.gte("created_at", new Date(Date.now() - opts.sinceDays * 86_400_000).toISOString());
  const [{ data: scores }, { data: profiles }] = await Promise.all([
    q.limit(5000),
    db.from("profiles").select("id, display_name, username, avatar_url").in("id", everyone),
  ]);
  const best = new Map<string, number>();
  for (const s of scores ?? []) best.set(s.user_id, Math.max(best.get(s.user_id) ?? 0, s.points));

  const rows: FriendRank[] = (profiles ?? [])
    .map((p) => ({ id: p.id, name: p.display_name ?? "Joueur", username: p.username ?? null, avatar: p.avatar_url ?? null, best: best.get(p.id) ?? 0, me: p.id === userId }))
    .sort((a, b) => b.best - a.best || a.name.localeCompare(b.name));

  const i = rows.findIndex((r) => r.me);
  const played = rows.filter((r) => r.best > 0);
  const myRank = i >= 0 && rows[i].best > 0 ? played.findIndex((r) => r.me) + 1 : null;
  return { rows, myRank, above: i > 0 ? rows[i - 1] : null, below: i >= 0 && i < rows.length - 1 ? rows[i + 1] : null };
}
