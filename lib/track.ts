/**
 * Wrapper autour de gtag pour les clics qu'on veut suivre (réseaux sociaux, partage...).
 * No-op silencieux si Google Analytics n'est pas chargé (pas d'erreur en local/dev, ni si
 * un bloqueur de pub coupe le script).
 */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === "function") gtag("event", name, params);
}
