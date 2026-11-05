/*
 * Gimmicks de rappeurs — les ad-libs qui réagissent au jeu (public/audio/gimmicks/*.mp3,
 * normalisés -14 LUFS, 1 à 4 s). Chaque clip a des « humeurs » : on tire au sort dans
 * l'humeur du moment, jamais deux fois le même d'affilée, et pas plus d'un toutes les
 * ~12 s pour que ça reste une surprise, pas un bruit de fond. Désactivable (réglages).
 */
export type GimmickMood = "hit" | "combo" | "miss" | "win" | "lose" | "buzz";

export type Gimmick = { id: string; artist: string; label: string; seconds: number; moods: GimmickMood[] };

export const GIMMICKS: Gimmick[] = [
  { id: "gazo-malaganx", artist: "Gazo", label: "Malagangx", seconds: 2.2, moods: ["win", "hit"] },
  { id: "rvfleuze-roh-roh", artist: "La Rvfleuze", label: "Roh roh", seconds: 1.2, moods: ["hit", "combo"] },
  { id: "kaaris-double-fck", artist: "Kaaris", label: "Double fuck", seconds: 1.4, moods: ["hit", "combo"] },
  { id: "kaaris-2-7", artist: "Kaaris", label: "2.7", seconds: 1.2, moods: ["buzz", "hit"] },
  { id: "kaaris-jai-dit", artist: "Kaaris", label: "J'ai dit…", seconds: 2.4, moods: ["lose", "miss"] },
  { id: "kaaris-orhh", artist: "Kaaris", label: "Orhh…", seconds: 3.9, moods: ["miss", "lose"] },
  { id: "kaaris-double-rotor", artist: "Kaaris", label: "K double rotor", seconds: 1.6, moods: ["combo", "hit"] },
  { id: "niska-quel-bail", artist: "Niska", label: "Quel bail ?", seconds: 3.4, moods: ["miss"] },
  { id: "niska-mechant", artist: "Niska", label: "Méchant méchant", seconds: 2.6, moods: ["win", "combo"] },
];

export const GIMMICK_PREF_KEY = "drf-gimmicks";

export function gimmicksEnabled(): boolean {
  try { return localStorage.getItem(GIMMICK_PREF_KEY) !== "off"; } catch { return true; }
}
export function setGimmicksEnabled(on: boolean) {
  try { localStorage.setItem(GIMMICK_PREF_KEY, on ? "on" : "off"); } catch {}
}

/** Gimmick dont l'artiste correspond (pour les vidéos / la révélation d'un son de cet artiste). */
export function gimmickForArtist(artistName: string): Gimmick | null {
  const n = artistName.toLowerCase();
  return GIMMICKS.find((g) => n.includes(g.artist.toLowerCase().replace("la ", ""))) ?? null;
}
