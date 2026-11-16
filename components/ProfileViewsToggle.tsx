"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* Vues de profil : activé par défaut. Couper = ne plus voir qui te visite, et ne plus apparaître chez les autres. */
export default function ProfileViewsToggle({ userId, initialOn }: { userId: string; initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function flip() {
    setBusy(true); setErr(null);
    const next = !on;
    const { error } = await createClient().from("profiles").update({ profile_views_on: next }).eq("id", userId);
    setBusy(false);
    if (error) { setErr("Impossible d'enregistrer. Réessaie."); return; }
    setOn(next);
  }
  return (
    <div id="vues" className="ticket p-5">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0">{on ? <Eye size={20} /> : <EyeOff size={20} />}</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold leading-tight">Vues de profil</p>
          <p className="text-sm text-ink-muted mt-1">{on ? <>Tu vois qui a regardé ton profil (30 jours), et les autres voient que tu as regardé le leur. <a href="/profil/vues" className="text-glow font-semibold">Voir les visites →</a></> : "Désactivé : personne ne sait que tu passes, et tu ne vois pas qui passe chez toi."}</p>
          {err && <p className="text-xs text-riseNeg mt-2">{err}</p>}
        </div>
        <button type="button" role="switch" aria-checked={on} aria-label="Vues de profil" disabled={busy} onClick={flip} className={`shrink-0 w-12 h-7 rounded-full relative transition-colors ${on ? "bg-gold" : "bg-white/10"}`}>
          <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: on ? "translateX(20px)" : "translateX(0)" }} />
        </button>
      </div>
    </div>
  );
}
