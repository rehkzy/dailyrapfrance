"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Check, Share2, Flame } from "lucide-react";
import { getDailyTheme } from "@/lib/themes";
import { weeklyNumber, formatCountdownLong, msUntilNextWeekly, playedThisWeek, getStreak } from "@/lib/dailyStreak";
import { configToSearch, DEFAULT_CONFIG } from "@/lib/presets";
import { shareOrCopy } from "@/lib/share";
import BrandMark from "@/components/BrandMark";
import StreakStrip from "@/components/StreakStrip";

/*
 * Le défi de la semaine — le bloc le plus important de l'accueil. Une seule action primaire :
 * jouer. Le thème est imposé et identique pour tout le monde, il change chaque lundi à minuit
 * (Paris) ; le classement du défi est la raison de rejouer dans la semaine.
 */
export default function DailyCard({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const theme = useMemo(() => getDailyTheme(), []);
  const [left, setLeft] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setLeft(msUntilNextWeekly());
    tick();
    const id = setInterval(tick, 1000);
    const refresh = () => {
      setDone(playedThisWeek());
      setStreak(getStreak());
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const number = weeklyNumber();
  const href = `/jouer?${configToSearch({ ...DEFAULT_CONFIG, theme: theme.id }, { daily: "1", autostart: "1" })}`;

  async function invite() {
    const res = await shareOrCopy({
      title: "Défi de la semaine — Blind Test Rap FR",
      text: `Défi DailyRap #${number} : ${theme.label}. Tu fais mieux que moi ? 🎤\nhttps://dailyrapfrance.best${href}`,
    });
    if (res === "copied") {
      setToast("Lien copié — colle-le dans le groupe");
      setTimeout(() => setToast(null), 2200);
    }
  }

  if (variant === "compact") {
    return (
      <a href={href} className="action-row" data-primary={!done}>
        <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${done ? "bg-gold/15 text-gold" : "bg-white/15 text-white"}`}>
          {done ? <Check size={20} strokeWidth={3} /> : <Flame size={20} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Défi de la semaine #{number} — {theme.label}</span>
          <span className={`block text-xs ${done ? "text-ink-faint" : "text-white/80"}`}>
            {done ? "Déjà joué cette semaine — rejoue pour battre ton score" : theme.text}
          </span>
        </span>
        <span className="font-mono text-[11px] shrink-0 opacity-80">{left !== null ? formatCountdownLong(left) : ""}</span>
      </a>
    );
  }

  return (
    <section className="daily-card p-6 sm:p-8" aria-labelledby="daily-title">
      <BrandMark className="mark-watermark text-white" size="58%" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-5">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/85">
            <span className="w-2 h-2 rounded-full bg-glow animate-pulse" aria-hidden="true" />
            Défi de la semaine #{number}
          </span>
          <span className="font-mono text-xs text-white/70" aria-live="off">
            {left !== null ? `Nouveau défi dans ${formatCountdownLong(left)}` : ""}
          </span>
        </div>

        <h2 id="daily-title" className="poster-title text-4xl sm:text-5xl md:text-6xl text-white max-w-xl">
          {theme.label}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-white/80 max-w-md">{theme.text}. 10 extraits, le même thème pour tout le monde du lundi au dimanche. Rejoue autant que tu veux : seul ton meilleur score compte au classement.</p>

        <div className="mt-6 flex flex-col xl:flex-row xl:items-center gap-3">
          <a
            href={href}
            className="game-btn game-btn-primary h-14 px-7 text-base gap-2.5 w-full xl:w-auto"
          >
            <Play size={20} fill="currentColor" />
            {done ? "Rejouer le défi" : "Jouer le défi de la semaine"}
          </a>
          <button
            type="button"
            onClick={invite}
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-medium text-white transition-colors w-full xl:w-auto"
          >
            <Share2 size={16} />
            Défier un pote
          </button>
          <a href="/blindtest/defi" className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full text-sm font-medium text-white/85 hover:text-white w-full xl:w-auto">
            Classement du défi →
          </a>
        </div>

        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between gap-4 flex-wrap">
          <StreakStrip />
          {streak >= 7 && <span className="text-xs text-white/70">Série protégée : un jour manqué est pardonné.</span>}
        </div>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
