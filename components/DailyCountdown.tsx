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

  return (
    <div className="flex items-baseline gap-1 font-mono text-ink" aria-label="Temps restant avant le prochain défi">
      {cells.map((v, i) => (
        <span key={i} className="flex items-baseline gap-1">
          {i > 0 && <span className="text-ink-faint">:</span>}
          <span className="glass rounded-lg px-2 py-1 text-sm sm:text-base font-semibold tabular-nums">{v}</span>
        </span>
      ))}
    </div>
  );
}
