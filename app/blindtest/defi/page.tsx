import VerifiedBadge from "@/components/VerifiedBadge";
import { Medal, Flame, ChevronLeft, ChevronRight, Play, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BackToGame from "@/components/BackToGame";
import GameTabBar from "@/components/GameTabBar";
import { THEME_OPTIONS, getDailyTheme } from "@/lib/themes";
import { weekKey, weeklyNumberFor } from "@/lib/dailyStreak";
import { configToSearch, DEFAULT_CONFIG } from "@/lib/presets";

export const metadata = {
  title: "Défi de la semaine — Classement du Blind Test Rap Français | DailyRapFrance",
  description:
    "Le défi de la semaine du blind test rap français : un thème imposé du lundi au dimanche, le même pour tout le monde. Qui a participé, qui mène, et ton meilleur score.",
  alternates: { canonical: "https://dailyrapfrance.best/blindtest/defi" },
};

export const revalidate = 30;

function isWeekKey(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function shiftWeek(key: string, weeks: number): string {
  return new Date(new Date(`${key}T00:00:00Z`).getTime() + weeks * 7 * 86_400_000).toISOString().slice(0, 10);
}
function frDate(key: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
}

/*
 * Classement du défi de la semaine — un thème imposé du lundi au dimanche, le même pour tout
 * le monde. Les scores de défi sont enregistrés sous le thème "defi:<lundi>", ce qui isole
 * chaque semaine sans migration. Une ligne par joueur : son MEILLEUR score de la semaine
 * (on peut rejouer autant qu'on veut), avec le nombre de tentatives.
 */
export default async function DefiPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const sp = await searchParams;
  const current = weekKey();
  const key = isWeekKey(sp.s) && sp.s <= current ? sp.s : current;
  const isCurrent = key === current;
  const number = weeklyNumberFor(key);
  const theme = isCurrent ? getDailyTheme() : null;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("blindtest_scores")
    .select("id, points, rounds, created_at, user_id, profiles(username, display_name, avatar_url, verified)")
    .eq("theme", `defi:${key}`)
    .order("points", { ascending: false })
    .limit(500);

  type Row = NonNullable<typeof rows>[number];
  const byUser = new Map<string, { best: Row; tries: number }>();
  for (const r of rows ?? []) {
    const cur = byUser.get(r.user_id);
    if (!cur) byUser.set(r.user_id, { best: r, tries: 1 });
    else {
      cur.tries += 1;
      if (r.points > cur.best.points) cur.best = r;
    }
  }
  const ranking = [...byUser.values()].sort((a, b) => b.best.points - a.best.points || a.best.created_at.localeCompare(b.best.created_at));
  const playHref = theme ? `/jouer?${configToSearch({ ...DEFAULT_CONFIG, theme: theme.id }, { daily: "1", autostart: "1" })}` : null;
  const sunday = new Date(new Date(`${key}T00:00:00Z`).getTime() + 6 * 86_400_000).toISOString().slice(0, 10);

  return (
    <>
      <section className="max-w-2xl mx-auto px-6 pt-16 pb-32">
        <BackToGame fallback="/blindtest/classement" />

        <p className="stage-kicker mb-2 flex items-center gap-1.5"><Flame size={13} /> Défi de la semaine #{number}</p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-2">
          {theme ? theme.label : `Semaine du ${frDate(key)}`}
        </h1>
        <p className="text-ink-muted mb-6">
          {isCurrent
            ? `Du lundi ${frDate(key)} au dimanche ${frDate(sunday)}. Le même thème pour tout le monde, autant d'essais que tu veux : seul ton meilleur score compte.`
            : "Défi terminé — voici le classement final."}
        </p>

        {isCurrent && playHref && (
          <a href={playHref} className="sticker h-14 w-full sm:w-auto px-8 mb-6"><Play size={16} fill="currentColor" /> Jouer le défi</a>
        )}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted"><Users size={14} /> {ranking.length} participant{ranking.length > 1 ? "s" : ""}</span>
          <span className="inline-flex items-center gap-1.5">
            <a href={`/blindtest/defi?s=${shiftWeek(key, -1)}`} aria-label="Semaine précédente" className="w-10 h-10 rounded-full glass grid place-items-center text-ink-muted hover:text-ink"><ChevronLeft size={16} /></a>
            <span className="text-xs text-ink-faint px-1">Semaine du {frDate(key)}</span>
            <a href={isCurrent ? "#" : `/blindtest/defi?s=${shiftWeek(key, 1)}`} aria-label="Semaine suivante" aria-disabled={isCurrent} className={`w-10 h-10 rounded-full glass grid place-items-center ${isCurrent ? "opacity-30 pointer-events-none" : "text-ink-muted hover:text-ink"}`}><ChevronRight size={16} /></a>
          </span>
        </div>

        {ranking.length === 0 ? (
          <div className="card p-10 text-center text-ink-muted text-sm">
            {isCurrent ? "Personne n'a encore joué ce défi — ouvre le bal. Connecte-toi pour apparaître ici." : "Personne n'a joué ce défi-là."}
          </div>
        ) : (
          <div className="card divide-y divide-white/8 overflow-hidden">
            {ranking.map(({ best, tries }, i) => {
              const profile = Array.isArray(best.profiles) ? best.profiles[0] : best.profiles;
              return (
                <a key={best.id} href={profile?.username ? `/profil/${profile.username}` : "#"} className={`flex items-center gap-4 py-4 px-5 transition-colors ${profile?.username ? "hover:bg-white/5" : "pointer-events-none"}`}>
                  <span className="font-display text-lg w-7 text-center shrink-0">
                    {i < 3 ? <Medal size={18} className={i === 0 ? "text-gold" : "text-ink-faint"} /> : <span className="text-ink-faint text-sm">{i + 1}</span>}
                  </span>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs shrink-0">{(profile?.display_name ?? "?").slice(0, 1).toUpperCase()}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-1"><span className="truncate">{profile?.display_name ?? "Joueur"}</span>{profile?.verified && <VerifiedBadge size={14} />}</p>
                    <p className="text-xs text-ink-faint">{tries} tentative{tries > 1 ? "s" : ""} · {best.rounds} manches</p>
                  </div>
                  <span className="font-mono text-gold shrink-0">{best.points} pts</span>
                </a>
              );
            })}
          </div>
        )}

        <p className="text-xs text-ink-faint mt-6">
          Les thèmes des semaines : {THEME_OPTIONS.length} possibles, tirés au sort pour tout le monde chaque lundi à minuit (heure de Paris).
        </p>
      </section>
      <GameTabBar />
    </>
  );
}
