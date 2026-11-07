/*
 * Contenu d'un message : du texte, ou un objet JSON (toujours chiffré de bout en bout comme
 * le reste). Les « kinds » :
 *  · img       : photo chiffrée dans le bucket dm (clé + iv dans le message)
 *  · track     : un son (Deezer id, ou lien Spotify/Deezer résolu)
 *  · challenge : un défi sur un thème, avec le score à battre
 *  · react     : réaction emoji sur un message (regroupée sous la bulle)
 */
export type DMPayload =
  | { k: "img"; path: string; key: string; iv: string; w: number; h: number; mime?: string }
  | { k: "track"; id: number | null; title: string; artist: string; cover: string | null; preview: string | null; url?: string | null }
  | { k: "challenge"; theme: string; label: string; score: number | null }
  | { k: "react"; to: string; e: string }
  | { k: "voice"; path: string; key: string; iv: string; secs: number; mime: string }
  | { k: "gimmick"; id: string }
  | { k: "poll"; q: string; options: string[] }
  | { k: "vote"; to: string; i: number };

export function parsePayload(text: string | null): DMPayload | null {
  if (!text || text[0] !== "{") return null;
  try {
    const o = JSON.parse(text) as { k?: string };
    return o && typeof o.k === "string" ? (o as DMPayload) : null;
  } catch {
    return null;
  }
}

export function previewOf(text: string | null): string {
  const p = parsePayload(text);
  if (!p) return text ?? "🔒 Message sur un autre appareil";
  switch (p.k) {
    case "img": return "📷 Photo";
    case "track": return `🎵 ${p.title}${p.artist ? ` · ${p.artist}` : ""}`;
    case "challenge": return `⚔️ Défi : ${p.label}`;
    case "react": return `${p.e} Réaction`;
    case "voice": return `🎙️ Vocal · ${p.secs}s`;
    case "gimmick": return "🎤 Gimmick";
    case "poll": return `📊 ${p.q}`;
    case "vote": return "📊 A voté";
  }
}

const SPOTIFY_RE = /https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/[A-Za-z0-9]+[^\s]*/;
const DEEZER_RE = /https?:\/\/(?:www\.)?deezer\.(?:com|page\.link)\/(?:[a-z]{2}\/)?track\/\d+[^\s]*/;
export function musicLinkIn(text: string): string | null {
  return text.match(SPOTIFY_RE)?.[0] ?? text.match(DEEZER_RE)?.[0] ?? null;
}

export const REACTIONS = ["🔥", "😂", "💀", "❤️", "👀", "🎯"] as const;
