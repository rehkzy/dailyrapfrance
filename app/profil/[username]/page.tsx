import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AddFriendButton from "@/components/AddFriendButton";
import FriendPlayButtons from "@/components/FriendPlayButtons";
import StatsBlock from "@/components/StatsBlock";
import BackToGame from "@/components/BackToGame";
import GameTabBar from "@/components/GameTabBar";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${username} — Profil DailyRapFrance` };
}

/*
 * Répartition des scores par jeu — tous les jeux de l'arcade écrivent dans
 * blindtest_scores avec un thème préfixé "jeu-" ; tout le reste = blind test.
 * La cover officielle de chaque jeu (dans /public/jeux) sert de fond de carte.
 */
const GAME_META: Record<string, { label: string; cover: string; href: string }> = {
  "jeu-tracklist": { label: "La Tracklist", cover: "/jeux/tracklist.png", href: "/jeux/tracklist" },
  "jeu-plus-haut": { label: "Plus Haut, Plus Bas", cover: "/jeux/plus-haut.png", href: "/jeux/plus-haut" },
  "jeu-pronos": { label: "Coach A&R", cover: "/jeux/coach-ar.png", href: "/jeux/pronos" },
  "jeu-punchline": { label: "La Punchline", cover: "/jeux/punchline.png", href: "/jeux/punchline" },
  "jeu-ghostwriter": { label: "Ghostwriter", cover: "/jeux/ghostwriter.png", href: "/jeux/ghostwriter" },
};
const BLIND_TEST_META = { label: "Blind Test", cover: "/jeux/blind-test.png", href: "/jouer?play=1" };

type ScoreRow = { theme: string; rounds: number; points: number; created_at: string };

function perGameStats(scores: ScoreRow[]) {
  const groups = new Map<string, { label: string; cover: string; href: string; games: number; points: number; best: number }>();
  for (const s of scores) {
    const meta = GAME_META[s.theme] ?? BLIND_TEST_META;
    const key = meta.label;
    const g = groups.get(key) ?? { ...meta, games: 0, points: 0, best: 0 };
    g.games += 1;
    g.points += s.points;
    g.best = Math.max(g.best, s.points);
    groups.set(key, g);
  }
  // Tri : le plus joué en premier — le profil raconte ce que la personne joue vraiment.
  return [...groups.values()].sort((a, b) => b.games - a.games);
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,created_at")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const { data: scores } = await supabase
    .from("blindtest_scores")
    .select("theme,rounds,points,created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const memberSince = new Date(profile.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const gameStats = perGameStats((scores ?? []) as ScoreRow[]);

  return (
    <>
    <section className="max-w-2xl mx-auto px-6 pt-16 pb-32">
      <BackToGame />
      {/* En-tête responsive : empilé sur mobile (pseudo lisible, boutons pleine largeur),
          horizontal à partir de sm: — voir le correctif d'audit précédent. */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-10">
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-white/10 shrink-0" />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold/20 text-gold flex items-center justify-center text-2xl font-medium shrink-0">
              {(profile.display_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold truncate">{profile.display_name ?? "Joueur"}</h1>
            {profile.username && <p className="text-ink-faint text-sm truncate">@{profile.username}</p>}
            <p className="flex items-center gap-1.5 text-xs text-ink-faint mt-1.5">
              <Calendar size={12} />
              Membre depuis {memberSince}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 w-full sm:w-auto sm:items-end sm:shrink-0 [&>*]:w-full sm:[&>*]:w-auto">
          <AddFriendButton targetId={profile.id} />
          <FriendPlayButtons friendName={profile.display_name ?? profile.username ?? "Toi"} />
        </div>
      </div>

      {/* Répartition par jeu — le profil couvre désormais TOUTE l'arcade, pas juste le
          blind test. Cover officielle en fond, parties / points / record par jeu. */}
      {gameStats.length > 0 && (
        <div className="mb-10">
          <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Ses jeux</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gameStats.map((g) => (
              <a
                key={g.label}
                href={g.href}
                className="game-thumb p-3 min-h-[150px] flex flex-col justify-end"
              >
                <span
                  className="thumb-bg"
                  style={{
                    background: `linear-gradient(180deg, rgba(10,7,7,0.25) 0%, rgba(10,7,7,0.94) 80%), url(${g.cover}) center/cover`,
                  }}
                  aria-hidden="true"
                />
                <img src="/icon.svg" alt="" aria-hidden="true" className="cover-logo" />
                <p className="font-display text-sm font-semibold leading-tight mb-1">{g.label}</p>
                <p className="text-[11px] text-ink-muted leading-snug">
                  {g.games} partie{g.games > 1 ? "s" : ""} · {g.points} pts
                  <span className="block text-gold font-mono text-[10px] mt-0.5">Record : {g.best}</span>
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      <StatsBlock games={scores ?? []} />
    </section>
    <GameTabBar />
    </>
  );
}
