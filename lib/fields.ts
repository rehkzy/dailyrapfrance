import { THEME_OPTIONS } from "@/lib/themes";

export type FieldKey = "title" | "artist" | "feat";
type TrackLite = { artistName: string; feats: string[] };

const norm = (s: string) => s.trim().toLowerCase();

/** Nom de l'artiste d'un thème « artist-* » (depuis le libellé « Blind Test X »), sinon null. */
export function themeArtistName(theme: string | undefined | null): string | null {
  if (!theme) return null;
  const base = theme.includes(":") ? theme.split(":")[1] : theme;
  if (!base.startsWith("artist-")) return null;
  const t = THEME_OPTIONS.find((x) => x.id === base);
  return t ? t.label.replace(/^Blind Test /i, "") : null;
}

/** Le thème est un artiste ET ce morceau n'est pas le sien : il y est invité. */
export function isGuestTrack(theme: string | undefined | null, track: TrackLite): boolean {
  const name = themeArtistName(theme);
  if (!name) return false;
  return norm(track.artistName) !== norm(name) && track.feats.some((f) => norm(f) === norm(name));
}

/*
 * Ce qu'on demande au joueur pour un morceau :
 *  - thème libre : titre + artiste (+ feat s'il y en a)
 *  - thème artiste, morceau de l'artiste : titre (+ feat s'il y en a — un autre que lui)
 *  - thème artiste, l'artiste est INVITÉ : titre + artiste principal (on ne demande jamais
 *    « qui est en feat ? » quand la réponse est l'artiste du thème lui-même)
 */
export function fieldsFor(theme: string | undefined | null, track: TrackLite): FieldKey[] {
  const name = themeArtistName(theme);
  if (!name) return track.feats.length ? ["title", "artist", "feat"] : ["title", "artist"];
  if (isGuestTrack(theme, track)) {
    const otherFeats = track.feats.filter((f) => norm(f) !== norm(name));
    return otherFeats.length ? ["title", "artist", "feat"] : ["title", "artist"];
  }
  return track.feats.length ? ["title", "feat"] : ["title"];
}

/** Feats à deviner (sans l'artiste du thème quand il est l'invité). */
export function guessableFeats(theme: string | undefined | null, track: TrackLite): string[] {
  const name = themeArtistName(theme);
  if (!name) return track.feats;
  return track.feats.filter((f) => norm(f) !== norm(name));
}

/** Libellé de la question / du champ, selon le contexte. */
export function fieldPrompt(field: FieldKey, theme: string | undefined | null, track: TrackLite, kind: "qcm" | "placeholder" = "qcm"): string {
  const name = themeArtistName(theme);
  const guest = isGuestTrack(theme, track);
  if (field === "artist" && guest && name) return kind === "qcm" ? `${name} est invité — qui est l'artiste principal ?` : `Artiste principal (${name} est en feat) · 1 pt`;
  if (field === "title") return kind === "qcm" ? "Quel est le titre ?" : "Titre (1 pt)";
  if (field === "artist") return kind === "qcm" ? "Qui chante ?" : "Artiste (1 pt)";
  return kind === "qcm" ? "Qui est en feat ?" : "Featuring (+2 pts)";
}
