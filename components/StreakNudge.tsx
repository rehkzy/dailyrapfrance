"use client";

import { useEffect, useState } from "react";
import { Flame, Play, X } from "lucide-react";
import { getStreak, streakAtRisk, parisDateString, recentDays } from "@/lib/dailyStreak";
import { getDailyTheme } from "@/lib/themes";
import { configToSearch, DEFAULT_CONFIG } from "@/lib/presets";

/*
 * Relance de série — une seule fois par jour, uniquement quand ça vaut le coup : la personne a
 * joué hier (ou avant-hier avec le joker), pas encore aujourd'hui. Dès le deuxième jour, c'est
 * la mécanique qui fait revenir : on la nomme, on montre les jours, on donne UN bouton.
 */
const SEEN_KEY = "drf-streak-nudge";

export default function StreakNudge() {
  const [streak, setStreak] = useState(0);
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<ReturnType<typeof recentDays>>([]);

  useEffect(() => {
    try {
      const today = parisDateString();
      if (localStorage.getItem(SEEN_KEY) === today) return;
      const s = getStreak();
      if (s >= 1 && streakAtRisk()) {
        setStreak(s);
        setDays(recentDays(7));
        setOpen(true);
        localStorage.setItem(SEEN_KEY, today);
      }
    } catch {}
  }, []);

  if (!open) return null;
  const theme = getDailyTheme();
  const href = `/jouer?${configToSearch({ ...DEFAULT_CONFIG, theme: theme.id }, { daily: "1", autostart: "1" })}`;
  const next = streak + 1;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="streak-title">
      <div className="daily-card w-full max-w-sm p-6 solved-pop">
        <div className="relative">
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-black/40 border border-white/10 grid place-items-center text-white/80"><X size={15} /></button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffd166] text-[#3a0007] px-3 py-1 text-xs font-extrabold">
            <Flame size={13} fill="currentColor" /> {streak} jour{streak > 1 ? "s" : ""} d'affilée
          </span>
          <h2 id="streak-title" className="poster-title text-3xl text-white mt-4">
            {streak === 1 ? "Tu as joué hier. On enchaîne ?" : `Ne casse pas la série.`}
          </h2>
          <p className="text-sm text-white/80 mt-2">
            {streak === 1 ? "Une partie aujourd'hui et ta série démarre pour de bon." : `Une partie aujourd'hui et tu passes à ${next} jours.`}
            {streak >= 6 && " À 7 jours, un jour manqué est pardonné."}
          </p>
          <div className="streak-strip mt-4" aria-label="Les sept derniers jours">
            {days.map((d) => <span key={d.date} className="streak-dot" data-played={d.played} data-today={d.today} />)}
          </div>
          <a href={href} className="game-btn game-btn-primary h-[52px] w-full mt-5 text-base gap-2.5">
            <Play size={18} fill="currentColor" /> Jouer maintenant
          </a>
          <button type="button" onClick={() => setOpen(false)} className="block w-full text-center text-xs text-white/60 mt-3">Plus tard</button>
        </div>
      </div>
    </div>
  );
}
