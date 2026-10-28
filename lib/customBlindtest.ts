/*
 * Blind test PERSONNALISÉ — construit par la personne (ses morceaux, son titre), joué avec
 * le moteur habituel. Tout tient dans l'URL : aucun compte, aucune base, un lien à partager.
 *
 *   /jouer?custom=<code>      code = base64url d'un JSON compact { v:1, t:"Titre", i:[ids Deezer] }
 *
 * Les IDs Deezer sont des entiers (~10 chiffres) : 30 titres ≈ 400 caractères, ça passe
 * dans WhatsApp, un QR code ou un lien court. Côté jeu, /api/blindtest/pool?ids=… renvoie
 * les extraits de 30 s de ces titres précis.
 */

export const CUSTOM_THEME_ID = "custom";
export const CUSTOM_MIN = 3;
export const CUSTOM_MAX = 40;

export type CustomSet = {
  v: 1;
  t: string; // titre du blind test
  i: number[]; // IDs de titres Deezer, dans l'ordre choisi
  d?: string; // description courte (optionnelle)
  s?: number; // secondes par extrait (optionnel, sinon réglage du joueur)
  a?: "qcm" | "text"; // mode de réponse imposé (optionnel)
};

export type CustomTrack = {
  id: number;
  title: string;
  artistName: string;
  coverUrl: string | null;
  previewUrl: string;
};

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeCustomSet(set: CustomSet): string {
  const compact: CustomSet = { v: 1, t: set.t.slice(0, 60), i: set.i.slice(0, CUSTOM_MAX) };
  if (set.d) compact.d = set.d.slice(0, 120);
  if (set.s) compact.s = set.s;
  if (set.a) compact.a = set.a;
  return toBase64Url(JSON.stringify(compact));
}

export function decodeCustomSet(code: string | null | undefined): CustomSet | null {
  if (!code) return null;
  try {
    const obj = JSON.parse(fromBase64Url(code)) as Partial<CustomSet>;
    if (!obj || obj.v !== 1 || !Array.isArray(obj.i)) return null;
    const ids = obj.i.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, CUSTOM_MAX);
    if (ids.length < CUSTOM_MIN) return null;
    return {
      v: 1,
      t: typeof obj.t === "string" && obj.t.trim() ? obj.t.trim().slice(0, 60) : "Mon blind test",
      i: ids,
      d: typeof obj.d === "string" ? obj.d.slice(0, 120) : undefined,
      s: typeof obj.s === "number" ? obj.s : undefined,
      a: obj.a === "qcm" || obj.a === "text" ? obj.a : undefined,
    };
  } catch {
    return null;
  }
}

export function customPlayHref(code: string, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams({ custom: code, theme: CUSTOM_THEME_ID, ...extra });
  return `/jouer?${p}`;
}

/* --- Mes blind tests (appareil) — pour retrouver ses créations sans compte --------------- */
const KEY = "drf-custom-blindtests";
export type SavedCustom = { code: string; title: string; count: number; createdAt: string };

export function listSavedCustoms(): SavedCustom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedCustom[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
export function saveCustom(entry: SavedCustom) {
  try {
    const list = listSavedCustoms().filter((e) => e.code !== entry.code);
    localStorage.setItem(KEY, JSON.stringify([entry, ...list].slice(0, 30)));
  } catch {
    /* stockage indisponible */
  }
}
export function removeCustom(code: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(listSavedCustoms().filter((e) => e.code !== code)));
  } catch {
    /* ignore */
  }
}
