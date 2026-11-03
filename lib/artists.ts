import { THEME_OPTIONS, type ThemeOption } from "@/lib/themes";

/*
 * Pages « Top sons de <artiste> » (/artistes/<slug>) — un artiste par thème « Artistes » du
 * blind test. Le slug est celui du thème sans le préfixe artist- ; le nom est celui du
 * libellé « Blind Test <Nom> », donc exactement ce que résout Deezer pour le jeu.
 */
export type ArtistEntry = { slug: string; name: string; theme: ThemeOption };

export const ARTISTS: ArtistEntry[] = THEME_OPTIONS.filter((t) => t.category === "Artistes" && t.id.startsWith("artist-")).map((t) => ({
  slug: t.id.slice("artist-".length),
  name: t.label.replace(/^Blind Test /i, ""),
  theme: t,
}));

export function findArtist(slug: string): ArtistEntry | undefined {
  return ARTISTS.find((a) => a.slug === slug);
}

/** Retrouve une entrée à partir d'un nom Deezer (artistes liés) — pour ne lier que les pages qui existent. */
export function findArtistByName(name: string): ArtistEntry | undefined {
  const n = name.toLowerCase().replace(/\s+/g, " ").trim();
  return ARTISTS.find((a) => a.name.toLowerCase() === n);
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatFans(n?: number): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "").replace(".", ",")} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return String(n);
}
