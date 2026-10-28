/*
 * Parrainage — un code court par compte, un lien à partager ; chaque filleul qui crée un
 * compte donne une chance au tirage. Le lot en cours est décrit ici (une seule source).
 */
export const REFERRAL_CONTEST = {
  title: "2 places pour Kaaris au Stade de France",
  date: "22 mai 2027",
  short: "Kaaris au Stade de France · 22 mai 2027",
  rule: "Chaque ami qui crée son compte avec ton lien = 1 chance au tirage au sort. Tirage parmi tous les parrains, annoncé sur Instagram @dailyrapfrance.",
  drawLabel: "Tirage au sort avant le concert — date annoncée sur Instagram",
};

export const REF_STORAGE_KEY = "drf-ref";

export function referralLink(code: string): string {
  return `https://dailyrapfrance.best/?ref=${encodeURIComponent(code)}`;
}

/** Mémorise le code de parrainage présent dans l'URL (visite depuis un lien d'ami). */
export function captureReferralFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[A-Z0-9]{4,12}$/i.test(ref) && !localStorage.getItem(REF_STORAGE_KEY)) {
      localStorage.setItem(REF_STORAGE_KEY, ref.toUpperCase());
    }
  } catch {}
}

export function pendingReferral(): string | null {
  try {
    return localStorage.getItem(REF_STORAGE_KEY);
  } catch {
    return null;
  }
}
export function clearPendingReferral() {
  try {
    localStorage.removeItem(REF_STORAGE_KEY);
  } catch {}
}
