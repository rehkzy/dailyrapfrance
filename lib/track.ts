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

/*
 * trackEvent() — wrapper séparé autour de gtag (Google Analytics), pour les événements
 * qu'on veut voir dans GA4 spécifiquement (clics sociaux, partage salon...). Ne remplace
 * PAS track() ci-dessus (qui alimente ta propre table côté serveur / présence en ligne) —
 * les deux coexistent, appelle l'un, l'autre, ou les deux selon le besoin. No-op
 * silencieux si gtag n'est pas chargé (pas d'erreur en local/dev, ni si un bloqueur de
 * pub coupe le script).
 */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === "function") gtag("event", name, params);
}
