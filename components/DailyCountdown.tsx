"use client";

import { useEffect, useState } from "react";

// Compte à rebours jusqu'à minuit, en cellules de verre HH:MM:SS.
// Rendu "--" côté serveur pour éviter tout mismatch d'hydratation.
export default function DailyCountdown() {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const mid = new Date(now);
      mid.setHours(24, 0, 0, 0);
      setLeft(Math.max(0, Math.floor((mid.getTime() - now.getTime()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const cells =
    left === null
      ? ["--", "--", "--"]
      : [
          String(Math.floor(left / 3600)).padStart(2, "0"),
          String(Math.floor((left % 3600) / 60)).padStart(2, "0"),
          String(left % 60).padStart(2, "0"),
        ];

  const units = ["h", "min", "s"];
  return (
    <div className="flex items-start gap-1.5 font-mono text-ink" aria-label="Temps restant avant le prochain défi">
      {cells.map((v, i) => (
        <span key={i} className="flex items-start gap-1.5">
          {i > 0 && <span className="text-ink-faint pt-1.5">:</span>}
          <span className="flex flex-col items-center gap-1">
            <span className="glass rounded-lg px-2.5 py-1 text-sm sm:text-base font-semibold tabular-nums min-w-[2.4em] text-center">
              {v}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-ink-faint">{units[i]}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
