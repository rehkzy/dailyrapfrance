"use client";

import { useEffect, useState } from "react";
import { Mic2 } from "lucide-react";
import { gimmicksEnabled, setGimmicksEnabled, GIMMICKS } from "@/lib/gimmicks";
import { sfx } from "@/lib/sfx";

/* Réglages → Son : les gimmicks de rappeurs (ad-libs qui réagissent au jeu). */
export default function SoundSettings() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(gimmicksEnabled()), []);
  const artists = [...new Set(GIMMICKS.map((g) => g.artist))].join(", ");
  return (
    <div className="ticket p-5">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0"><Mic2 size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold leading-tight">Gimmicks de rappeurs</p>
          <p className="text-sm text-ink-muted mt-1">{artists} réagissent à tes réponses : bonne réponse, combo, raté, fin de partie. Jamais pendant l&apos;extrait.</p>
          {on && <button type="button" onClick={() => sfx.gimmick("hit", 1, { force: true })} className="text-xs font-semibold text-glow mt-2">Écouter un exemple</button>}
        </div>
        <button type="button" role="switch" aria-checked={on} onClick={() => { const v = !on; setOn(v); setGimmicksEnabled(v); if (v) sfx.gimmick("combo", 1, { force: true }); }} className={`shrink-0 w-12 h-7 rounded-full relative transition-colors ${on ? "bg-gold" : "bg-white/10"}`}>
          <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: on ? "translateX(20px)" : "translateX(0)" }} />
        </button>
      </div>
    </div>
  );
}
