"use client";

/*
 * track() — envoie un événement au serveur (/api/track), qui l'associe au joueur
 * connecté (via sa session) et met à jour sa présence "en ligne". Ne fait rien si
 * personne n'est connecté — pas de tracking anonyme ici (cf. visitLogger côté
 * middleware pour le trafic anonyme par IP).
 *
 * Usage dans un composant existant :
 *   import { track } from "@/lib/track";
 *   <a href="https://instagram.com/..." onClick={() => track("click_instagram")}>
 *   <button onClick={() => { track("share", { method: "native" }); ...ta logique... }}>
 *
 * `keepalive: true` garantit l'envoi même si l'utilisateur quitte la page juste après
 * le clic (ex. clic sur un lien externe comme Instagram).
 */
export function track(eventType: string, meta?: Record<string, unknown>) {
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, path: window.location.pathname, meta }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ne jamais faire planter l'UI pour un event de tracking manqué.
  }
}
