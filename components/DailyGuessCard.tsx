"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { getStreak } from "@/lib/dailyStreak";

// Carte d'entrée vers "Devine du jour" sur le hub — un rituel de 30 secondes, distinct
// de la partie complète du Défi du jour. Affiche la série en cours si elle existe, pour
// donner une raison concrète de cliquer ("ne casse pas ta série").
export default function DailyGuessCard() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setStreak(getStreak());
  }, []);

  return (
    <a
      href="/devine"
      className="tap-press group relative flex items-center gap-4 rounded-2xl p-4 mb-10 overflow-hidden border border-white/10 hover:border-gold/40 transition-colors"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#3a0505] via-transparent to-transparent opacity-80" aria-hidden="true" />
      <div className="icon-tile relative w-12 h-12 shrink-0 bg-gradient-to-br from-gold to-glow text-white">
        <Zap size={20} strokeWidth={2} />
      </div>
      <span className="relative min-w-0 flex-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Nouveau · 30 secondes</span>
        <span className="block text-sm font-semibold mt-0.5">Devine du jour</span>
        <span className="block text-xs text-ink-faint mt-0.5">
          {streak > 1 ? `🔥 ${streak} jours d'affilée — ne casse pas ta série` : "Un son, 6 essais, le même pour tout le monde"}
        </span>
      </span>
    </a>
  );
}
