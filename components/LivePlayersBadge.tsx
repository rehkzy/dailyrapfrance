"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRESENCE_CHANNEL } from "@/components/SitePresence";

/*
 * Compteur de joueurs en ligne — RÉEL, via Supabase Presence.
 * Le suivi est fait au niveau du site par <SitePresence /> (layout) : le compteur
 * inclut donc aussi les joueurs en pleine partie, pas seulement ceux sur le hub.
 * Ce composant ne fait que LIRE l'état de présence (pas de track ici, sinon l'onglet
 * serait compté deux fois).
 *
 * Anti-clignotement : les baisses de compteur ne sont appliquées qu'après 5 s de
 * confirmation — une reconnexion temps réel passagère ne fait plus disparaître le badge.
 * Les hausses, elles, s'affichent immédiatement.
 */
export default function LivePlayersBadge() {
  const [count, setCount] = useState(0);
  const pendingDrop = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(PRESENCE_CHANNEL);

    channel
      .on("presence", { event: "sync" }, () => {
        const next = Object.keys(channel.presenceState()).length;
        setCount((prev) => {
          if (next >= prev) {
            if (pendingDrop.current) {
              clearTimeout(pendingDrop.current);
              pendingDrop.current = null;
            }
            return next;
          }
          // baisse : on attend 5 s de stabilité avant de l'appliquer
          if (!pendingDrop.current) {
            pendingDrop.current = setTimeout(() => {
              pendingDrop.current = null;
              setCount(Object.keys(channel.presenceState()).length);
            }, 5000);
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      if (pendingDrop.current) clearTimeout(pendingDrop.current);
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
