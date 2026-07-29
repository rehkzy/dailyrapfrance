"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/*
 * À monter UNE SEULE FOIS dans app/layout.tsx (dans <body>, à côté de
 * <GoogleAnalytics />) :
 *
 *   import ActivityTracker from "@/components/ActivityTracker";
 *   ...
 *   <ActivityTracker />
 *
 * - Envoie un événement "page_view" à chaque changement de page.
 * - Envoie un "heartbeat" toutes les 25 secondes tant que l'onglet reste ouvert,
 *   ce qui permet au back-office de savoir qui est "en ligne maintenant" (dernière
 *   activité de moins de ~1 minute).
 * - Ne fait rien si personne n'est connecté (géré côté serveur par /api/track).
 */
export default function ActivityTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view");
  }, [pathname]);

  useEffect(() => {
    const interval = setInterval(() => track("heartbeat"), 25_000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
