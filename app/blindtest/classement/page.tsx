import { Medal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BackToGame from "@/components/BackToGame";
import GameTabBar from "@/components/GameTabBar";

export const metadata = {
  title: "Classement — DailyRapFrance",
};

export const revalidate = 60;

/*
 * Classement par jeu — filtre via l'URL (?jeu=tracklist), donc la page reste un Server
 * Component (pas de client JS supplémentaire, le filtre est juste un lien). Tous les
 * jeux de l'arcade écrivent dans blindtest_scores : "blindtest" = tout thème qui ne
 * commence PAS par "jeu-", chaque autre jeu = son thème exact ("jeu-tracklist"...).
 * Le Tribunal n'a pas d'entrée ici : c'est un vote, pas un score.
 */
const GAMES = [
  { id: "blindtest", label: "Blind Test", cover: "/jeux/blind-test.png", theme: null },
  { id: "artists-manager", label: "Artists Manager 26", cover: "/jeux/artists-manager.svg", theme: "jeu-artists-manager" },
  { id: "tracklist", label: "La Tracklist", cover: "/jeux/tracklist.png", theme: "jeu-tracklist" },
  { id: "plus-haut", label: "Plus Haut, Plus Bas", cover: "/jeux/plus-haut.png", theme: "jeu-plus-haut" },
  { id: "pronos", label: "Coach A&R", cover: "/jeux/coach-ar.png", theme: "jeu-pronos" },
  { id: "punchline", label: "La Punchline", cover: "/jeux/punchline.png", theme: "jeu-punchline" },
  { id: "ghostwriter", label: "Ghostwriter", cover: "/jeux/ghostwriter.png", theme: "jeu-ghostwriter" },
] as const;

export default async function ClassementPage({
  searchParams,
}: {
  searchParams: Promise<{ jeu?: string }>;
}) {
  const { jeu } = await searchParams;
  const activeGame = GAMES.find((g) => g.id === jeu) ?? GAMES[0];

  const supabase = await createClient();
  let query = supabase
    .from("blindtest_scores")
    .select("id, points, rounds, theme, created_at, profiles(username, display_name, avatar_url)")
    .gt("points", 0); // un 0 pointé n'a rien à faire dans un classement — inutile et décourageant

  query = activeGame.theme ? query.eq("theme", activeGame.theme) : query.not("theme", "like", "jeu-%");

  const { data: scores } = await query.order("points", { ascending: false }).limit(50);

  return (
    <>
    <section className="max-w-2xl mx-auto px-6 pt-16 pb-32">
      <BackToGame />

      {/* Sélecteur de jeu — pilules à covers, scrollables horizontalement sur mobile */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-6 px-6 pb-1 mb-8">
        {GAMES.map((g) => {
          const isActive = g.id === activeGame.id;
          return (
            <a
              key={g.id}
              href={g.id === "blindtest" ? "/blindtest/classement" : `/blindtest/classement?jeu=${g.id}`}
              className={`shrink-0 inline-flex items-center gap-2 rounded-full pl-1.5 pr-4 py-1.5 text-sm font-medium border transition-colors ${
                isActive
                  ? "bg-gold/15 border-gold/50 text-gold"
                  : "bg-white/5 border-white/10 text-ink-muted hover:text-ink hover:border-white/20"
              }`}
            >
              <img src={g.cover} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
              {g.label}
            </a>
          );
        })}
      </div>

      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">{activeGame.label}</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Classement</h1>
      <p className="text-ink-muted mb-10">
        {activeGame.id === "blindtest"
          ? "Les meilleurs scores solo, tous thèmes confondus. Connecte-toi et termine une partie pour y apparaître."
          : `Les meilleurs scores sur ${activeGame.label}. Connecte-toi et joue pour y apparaître.`}
      </p>

      {!scores || scores.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted text-sm">
          Personne n&apos;a encore de score enregistré sur ce jeu — sois le premier.
        </div>
      ) : (
        <div className="card divide-y divide-white/8 overflow-hidden">
          {scores.map((s, i) => {
            const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
            return (
              <a
                key={s.id}
                href={profile?.username ? `/profil/${profile.username}` : "#"}
                className={`flex items-center gap-4 py-4 px-5 transition-colors ${
                  profile?.username ? "hover:bg-white/5" : "pointer-events-none"
                }`}
              >
                <span className="font-display text-lg w-7 text-center shrink-0">
                  {i < 3 ? (
                    <Medal size={18} className={i === 0 ? "text-gold" : "text-ink-faint"} />
                  ) : (
                    <span className="text-ink-faint text-sm">{i + 1}</span>
                  )}
                </span>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs shrink-0">
                    {(profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.display_name ?? "Joueur"}</p>
                  <p className="text-xs text-ink-faint">
                    {activeGame.id === "blindtest"
                      ? `${s.theme} · ${s.rounds} manches`
                      : `${s.rounds} manche${s.rounds > 1 ? "s" : ""}`}
                  </p>
                </div>
                <span className="font-mono text-gold shrink-0">{s.points} pts</span>
              </a>
            );
          })}
        </div>
      )}
    </section>
    <GameTabBar />
    </>
  );
}
