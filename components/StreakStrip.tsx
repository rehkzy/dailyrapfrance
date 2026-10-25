"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { getStreak, recentDays, streakAtRisk } from "@/lib/dailyStreak";

/*
 * Bande de série : 14 pastilles (deux semaines), les jours joués pleins, aujourd'hui cerclé.
 * Rendue côté client seulement (localStorage) — un placeholder neutre évite tout décalage
 * entre le HTML serveur et le premier rendu navigateur.
 */
export default function StreakStrip({ compact = false }: { compact?: boolean }) {
  const [days, setDays] = useState<ReturnType<typeof recentDays>>([]);
  const [streak, setStreak] = useState(0);
  const [atRisk, setAtRisk] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setDays(recentDays(14));
      setStreak(getStreak());
      setAtRisk(streakAtRisk());
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  if (days.length === 0) return <div className={compact ? "h-5" : "h-10"} aria-hidden="true" />;

  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "flex-wrap"}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
          streak > 0 ? "bg-gold/15 text-gold" : "bg-white/6 text-ink-faint"
        }`}
        title={atRisk ? "Joue aujourd'hui pour garder ta série" : undefined}
      >
        <Flame size={13} fill={streak > 0 ? "currentColor" : "none"} />
        {streak > 0 ? `${streak} jour${streak > 1 ? "s" : ""}` : "Pas de série"}
        {atRisk && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-glow animate-pulse" aria-hidden="true" />}
      </span>
      <div className="streak-strip" aria-label="Jours joués sur les deux dernières semaines">
        {days.map((d) => (
          <span key={d.date} className="streak-dot" data-played={d.played} data-today={d.today} title={d.date} />
        ))}
      </div>
    </div>
  );
}
