"use client";

import { useEffect, useRef, useState } from "react";
import { ensurePresence, onPresenceCount } from "@/lib/presenceStore";

/*
 * Compteur de joueurs en ligne — lit le store de présence partagé (lib/presenceStore),
 * qui possède l'UNIQUE abonnement au canal. Ce composant ne touche jamais à supabase
 * directement : c'est ce qui corrige le crash "tried to subscribe multiple times".
 *
 * Anti-clignotement : les baisses ne sont appliquées qu'après 5 s de stabilité
 * (une reconnexion passagère ne fait plus disparaître le badge) ; les hausses
 * s'affichent immédiatement.
 */
export default function LivePlayersBadge() {
  const [count, setCount] = useState(0);
  const pendingDrop = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    ensurePresence();
    const off = onPresenceCount((next) => {
      latest.current = next;
      setCount((prev) => {
        if (next >= prev) {
          if (pendingDrop.current) {
            clearTimeout(pendingDrop.current);
            pendingDrop.current = null;
          }
          return next;
        }
        if (!pendingDrop.current) {
          pendingDrop.current = setTimeout(() => {
            pendingDrop.current = null;
            setCount(latest.current);
          }, 5000);
        }
        return prev;
      });
    });
    return () => {
      off();
      if (pendingDrop.current) clearTimeout(pendingDrop.current);
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
