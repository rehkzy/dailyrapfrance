import { createClient } from "@/lib/supabase/client";

/*
 * Store de présence partagé — UN SEUL canal, un seul abonnement.
 *
 * Le bug qu'il corrige : supabase-js renvoie la MÊME instance de canal pour un même nom.
 * SitePresence (layout) s'abonnait à "presence:site", puis LivePlayersBadge récupérait
 * cette même instance et rappelait .subscribe() dessus → supabase-js jette
 * "tried to subscribe multiple times to the same channel" → écran d'erreur client sur
 * toute page affichant le badge (/jouer). Ici, l'initialisation est idempotente et les
 * consommateurs ne font que s'abonner au compteur en mémoire.
 */

const CHANNEL_NAME = "presence:site";

let started = false;
let count = 0;
const listeners = new Set<(n: number) => void>();

function tabKey(): string {
  let k = sessionStorage.getItem("drf-presence-key");
  if (!k) {
    k = `v-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("drf-presence-key", k);
  }
  return k;
}

/** Démarre le suivi de présence (une seule fois par onglet, appels suivants sans effet). */
export function ensurePresence(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  const supabase = createClient();
  const channel = supabase.channel(CHANNEL_NAME, { config: { presence: { key: tabKey() } } });

  const track = () => channel.track({ at: Date.now() }).catch(() => {});

  channel
    .on("presence", { event: "sync" }, () => {
      count = Object.keys(channel.presenceState()).length;
      listeners.forEach((l) => l(count));
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") void track();
    });

  // Re-track au retour d'onglet : certains navigateurs coupent le temps réel en arrière-plan.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void track();
  });
}

/** S'abonne au compteur de présence. Renvoie la fonction de désabonnement. */
export function onPresenceCount(cb: (n: number) => void): () => void {
  listeners.add(cb);
  cb(count);
  return () => {
    listeners.delete(cb);
  };
}
