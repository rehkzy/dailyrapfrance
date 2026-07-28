"use client";

import { useEffect } from "react";
import { ensurePresence } from "@/lib/presenceStore";

// Monté dans le layout (invisible) : démarre le suivi de présence du site.
// Toute la logique vit dans lib/presenceStore — un seul canal, un seul abonnement,
// quel que soit le nombre de composants qui consomment le compteur.
export default function SitePresence() {
  useEffect(() => {
    ensurePresence();
  }, []);
  return null;
}
