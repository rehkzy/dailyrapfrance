/*
 * Gimmicks de rappeurs — les ad-libs qui réagissent au jeu (public/audio/gimmicks/*.mp3,
 * normalisés -14 LUFS, 1 à 4 s). Chaque clip a des « humeurs » : on tire au sort dans
 * l'humeur du moment, jamais deux fois le même d'affilée, et pas plus d'un toutes les
 * ~12 s pour que ça reste une surprise, pas un bruit de fond. Désactivable (réglages).
 */
export type GimmickMood = "hit" | "combo" | "miss" | "win" | "lose" | "buzz" | "intro";

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
  { id: "sch-mathafack", artist: "SCH", label: "Mathafack", seconds: 1.0, moods: ["hit", "combo", "buzz"] },
  { id: "ninho-salut", artist: "Ninho", label: "Salut à tous, c'est Ninho", seconds: 5.1, moods: ["intro"] },
  { id: "ninho-binks", artist: "Ninho", label: "Binks to binks", seconds: 2.5, moods: ["hit", "combo"] },
  { id: "ninho-ouais-ni", artist: "Ninho", label: "Ouais Ni", seconds: 1.1, moods: ["hit", "buzz"] },
  { id: "ninho-pas-au-courant", artist: "Ninho", label: "Ils étaient pas au courant…", seconds: 2.1, moods: ["win", "combo"] },
  { id: "ninho-tiens-retiens", artist: "Ninho", label: "Tiens, retiens", seconds: 2.1, moods: ["miss", "lose"] },
  { id: "damso-gimmick", artist: "Damso", label: "Damso", seconds: 1.0, moods: ["hit", "combo", "buzz"] },
  { id: "koba-meme", artist: "Koba LaD", label: "Le mème", seconds: 11.2, moods: ["intro"] },
  { id: "koba-qui-voila", artist: "Koba LaD", label: "Qui voilà…", seconds: 4.9, moods: ["win", "hit"] },
  { id: "koba-bat-les-couilles", artist: "Koba LaD", label: "Je m'en bats les…", seconds: 5.8, moods: ["miss", "lose"] },
  { id: "zola-trop-relou", artist: "Zola", label: "Trop relou", seconds: 3.5, moods: ["miss", "lose"] },
  { id: "soolking-franchement", artist: "Soolking", label: "Franchement c'est ça", seconds: 3.4, moods: ["hit", "win", "combo"] },
  { id: "sofiane-ish-ish", artist: "Sofiane", label: "Ish ish", seconds: 1.0, moods: ["hit", "combo", "buzz"] },
  { id: "heuss-stresse", artist: "Heuss L'enfoiré", label: "Je suis stressé", seconds: 6.3, moods: ["intro", "miss"] },
];

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^la[ -]/, "").replace(/[^a-z0-9]/g, "");
}

/**
 * Les gimmicks d'un artiste : nom de l'artiste du morceau (« Kaaris », « SCH feat. … ») ou
 * id de thème artiste (« artist-kaaris »). Sert à jouer l'ad-lib de l'artiste qu'on vient de
 * révéler, ou celui du thème en cours, plutôt qu'un autre au hasard.
 */
export function gimmicksOf(artistOrTheme: string | null | undefined): Gimmick[] {
  if (!artistOrTheme) return [];
  const key = norm(artistOrTheme.replace(/^artist-/, "").split(/ feat\.?| ft\.?|,|&|\//i)[0]);
  if (!key) return [];
  return GIMMICKS.filter((g) => norm(g.artist) === key);
}

export const GIMMICK_PREF_KEY = "drf-gimmicks";

export function gimmicksEnabled(): boolean {
  try { return localStorage.getItem(GIMMICK_PREF_KEY) !== "off"; } catch { return true; }
}
export function setGimmicksEnabled(on: boolean) {
  try { localStorage.setItem(GIMMICK_PREF_KEY, on ? "on" : "off"); } catch {}
}

/** Premier gimmick de cet artiste (vidéos). */
export function gimmickForArtist(artistName: string): Gimmick | null {
  return gimmicksOf(artistName)[0] ?? null;
}
