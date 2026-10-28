import { Medal, Flame, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BackToGame from "@/components/BackToGame";
import GameTabBar from "@/components/GameTabBar";
import { THEME_OPTIONS } from "@/lib/themes";
import { weeklyNumberFor } from "@/lib/dailyStreak";

// "survival:93" → "Survie · Rappeurs du 93" ; "93" → "Rappeurs du 93"
function themeLabel(raw: string) {
  if (raw === "custom") return "Blind test perso";
  if (raw.startsWith("defi:")) return `Défi de la semaine #${weeklyNumberFor(raw.slice(5))}`;
  const [a, b] = raw.includes(":") ? raw.split(":") : [null, raw];
  const label = THEME_OPTIONS.find((t) => t.id === b)?.label ?? b;
  const variant = a === "survival" ? "Survie" : a === "sprint" ? "Sprint" : null;
  return variant ? `${variant} · ${label}` : label;
}

export const metadata = {
  title: "Classement du Blind Test Rap Français — DailyRapFrance",
  description:
    "Les meilleurs scores du blind test rap français en ligne. Joue gratuitement, enregistre ton score et grimpe dans le classement.",
  alternates: { canonical: "https://dailyrapfrance.best/blindtest/classement" },
};

export const revalidate = 60;

/*
 * Classement — blind test uniquement (seul jeu du site). L'ancien sélecteur
 * multi-jeux (Artists Manager, Tracklist...) est retiré ; les scores des anciens
 * jeux (thèmes "jeu-*") restent en base mais sont exclus de l'affichage.
 */
export default async function ClassementPage() {
  const supabase = await createClient();
  const { data: scores } = await supabase
    .from("blindtest_scores")
    .select("id, points, rounds, theme, created_at, profiles(username, display_name, avatar_url)")
    .gt("points", 0) // un 0 pointé n'a rien à faire dans un classement
    .not("theme", "like", "jeu-%")
    .order("points", { ascending: false })
    .limit(50);

  return (
    <>
    <section className="max-w-2xl mx-auto px-6 pt-16 pb-32">
      <BackToGame />

      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Classement</h1>
      <p className="text-ink-muted mb-6">
        Les meilleurs scores solo, tous thèmes confondus. Connecte-toi et termine une partie pour y apparaître.
      </p>
      <a href="/blindtest/defi" className="ticket p-4 mb-8 flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-gold/15 text-gold grid place-items-center shrink-0"><Flame size={18} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold">Défi de la semaine</span>
          <span className="block text-xs text-ink-faint">Qui a participé, qui mène — un thème imposé du lundi au dimanche.</span>
        </span>
        <ChevronRight size={16} className="text-ink-faint shrink-0" />
      </a>

      {!scores || scores.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted text-sm">
          Personne n&apos;a encore de score enregistré — sois le premier.
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
                    {themeLabel(s.theme)} · {s.rounds} manches
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
