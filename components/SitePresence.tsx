"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/*
 * Suivi de présence au niveau du SITE (monté dans le layout, invisible).
 *
 * Avant, seul le hub /jouer enregistrait la présence : dès qu'un joueur lançait une
 * partie ou naviguait ailleurs, il sortait du compteur — d'où un "N joueurs en ligne"
 * qui chutait ou disparaissait alors que des gens jouaient réellement. Ici, chaque
 * onglet ouvert du site est compté, où que soit le visiteur.
 *
 * La clé est stockée en sessionStorage : stable pour l'onglet (les remontages du
 * composant ne créent pas de doublon), unique par onglet. On re-track au retour
 * d'onglet (visibilitychange) car certains navigateurs coupent la connexion temps
 * réel en arrière-plan.
 */
export const PRESENCE_CHANNEL = "presence:site";

function tabKey(): string {
  let k = sessionStorage.getItem("drf-presence-key");
  if (!k) {
    k = `v-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("drf-presence-key", k);
  }
  return k;
}

export default function SitePresence() {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: tabKey() } },
    });

    const track = () => channel.track({ at: Date.now() }).catch(() => {});
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") void track();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") void track();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
