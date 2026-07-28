"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/*
 * Compteur de joueurs en ligne — RÉEL, via Supabase Presence.
 *
 * Chaque visiteur du hub s'enregistre sur un canal de présence partagé ; le compteur
 * affiche le nombre d'entrées effectivement connectées, mis à jour en direct quand
 * quelqu'un arrive ou part. Aucun chiffre inventé : la variation vient du trafic réel,
 * ce qui rend la preuve sociale crédible ET vérifiable (deux potes qui ouvrent la page
 * voient le compteur bouger).
 *
 * Affichage progressif pour que ce soit toujours valorisant et jamais mensonger :
 * · 1 seul joueur (le visiteur) → on n'affiche rien (un "1 joueur en ligne" fait vide)
 * · 2+ → pastille verte pulsante + "N joueurs en ligne"
 */
export default function LivePlayersBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const key = `visitor-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel("presence:hub", {
      config: { presence: { key } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ at: Date.now() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (count < 2) return null;

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/12 px-3.5 py-1.5 text-xs font-semibold text-ink"
      title="Joueurs actuellement connectés"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3DDC84] opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3DDC84]" />
      </span>
      {count} joueurs en ligne
    </span>
  );
}
