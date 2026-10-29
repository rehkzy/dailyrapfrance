import type { SupabaseClient } from "@supabase/supabase-js";
import { computeBadges, type ScoreRow } from "@/lib/badges";

/*
 * Tout ce qu'il faut pour un profil (page publique et Mon compte) en un appel : scores,
 * blind tests créés, parrainages, amis, et les badges calculés — avec, pour les thèmes
 * artiste joués, le meilleur score du site (couronne « Meilleur fan »).
 */
export async function loadProfileBundle(supabase: SupabaseClient, userId: string) {
  const [{ data: scoresRaw }, { data: customs }, { count: referrals }, { count: friends }] = await Promise.all([
    supabase.from("blindtest_scores").select("theme,rounds,points,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
    supabase.from("custom_blindtests").select("id, slug, title, track_ids, plays, is_public").eq("user_id", userId).order("plays", { ascending: false }).limit(12),
    supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", userId),
    supabase.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
  ]);
  const scores = ((scoresRaw ?? []) as ScoreRow[]).filter((s) => !s.theme.startsWith("jeu-"));

  // Meilleur score du site sur chaque thème artiste joué par la personne (au plus 12 requêtes légères)
  const artistThemes = [...new Set(scores.map((s) => (s.theme.includes(":") ? s.theme.split(":")[1] : s.theme)).filter((t) => t.startsWith("artist-")))].slice(0, 12);
  const siteBestByTheme: Record<string, number> = {};
  await Promise.all(
    artistThemes.map(async (t) => {
      const { data } = await supabase.from("blindtest_scores").select("points").eq("theme", t).order("points", { ascending: false }).limit(1).maybeSingle();
      if (data) siteBestByTheme[t] = data.points;
    })
  );

  const customsList = customs ?? [];
  const badges = computeBadges({
    scores,
    customsCount: customsList.length,
    customsPublic: customsList.filter((c) => c.is_public).length,
    referrals: referrals ?? 0,
    friends: friends ?? 0,
    siteBestByTheme,
  });
  return { scores, customs: customsList, referrals: referrals ?? 0, friends: friends ?? 0, badges };
}
