import "server-only";
import { createClient } from "@/lib/supabase/server";

/*
 * Mode « Devine le clip » — pour chaque morceau Deezer, on retrouve le clip officiel sur
 * YouTube. La recherche YouTube Data API coûte 100 unités (quota : 10 000 / jour), donc :
 *   1. on lit d'abord le cache Supabase (table clip_videos, une ligne par morceau) ;
 *   2. sinon on cherche UNE fois, on garde la durée (pour choisir un point de départ qui
 *      évite l'intro où le titre et l'artiste sont incrustés), et on met en cache.
 * Sans clé YOUTUBE_API_KEY, le mode est simplement indisponible (null partout).
 */

export type Clip = { videoId: string; duration: number; title: string };

type Track = { id: string; title: string; artistName: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function parseIsoDuration(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

async function readCache(ids: string[]): Promise<Record<string, Clip | null>> {
  const out: Record<string, Clip | null> = {};
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("clip_videos").select("track_id, video_id, duration, video_title").in("track_id", ids.map(cacheKey));
    for (const row of data ?? []) {
      const id = String(row.track_id).slice(CACHE_VERSION.length + 1);
      out[id] = row.video_id ? { videoId: row.video_id, duration: row.duration ?? 0, title: row.video_title ?? "" } : null;
    }
  } catch {
    /* cache indisponible — on cherchera en direct */
  }
  return out;
}

async function writeCache(trackId: string, clip: Clip | null) {
  try {
    const supabase = await createClient();
    await supabase.from("clip_videos").upsert({
      track_id: cacheKey(trackId),
      video_id: clip?.videoId ?? null,
      duration: clip?.duration ?? null,
      video_title: clip?.title ?? null,
    });
  } catch {
    /* pas grave : on recherchera à nouveau la prochaine fois */
  }
}

// Version de la logique de sélection — préfixe des clés de cache. À incrémenter quand les
// règles changent, pour que les anciens résultats (plus permissifs) soient ignorés.
const CACHE_VERSION = "v2";
const cacheKey = (trackId: string) => `${CACHE_VERSION}:${trackId}`;

const NOT_A_CLIP = /lyrics?|paroles?|audio|visuali[sz]er|live|cover|reaction|react|karaok|instrumental|remix|speed ?up|slowed|nightcore|8d|teaser|extrait|snippet|interview|making[- ]of|behind|bande[- ]annonce|freestyle/i;

/** La chaîne est-elle la chaîne officielle de l'artiste ? (nom identique, ou nom + officiel / VEVO) */
function isOfficialChannel(channelTitle: string, artist: string): boolean {
  const ch = norm(channelTitle);
  const a = norm(artist);
  if (!a) return false;
  if (ch === a) return true;
  const stripped = ch.replace(/\b(officiel|official|vevo|music|musique|tv|channel|chaine|officielle)\b/g, "").trim();
  if (stripped === a) return true;
  // "ninhovevo", "jul officiel" collés sans espace
  if (ch.replace(/\s+/g, "") === a.replace(/\s+/g, "") + "vevo") return true;
  if (ch.replace(/\s+/g, "") === a.replace(/\s+/g, "") + "officiel") return true;
  // Chaînes "Sujet" (Topic) : contenu audio auto-généré, jamais un clip.
  return false;
}

async function searchYouTube(track: Track, key: string): Promise<Clip | null> {
  const q = `${track.artistName} ${track.title} clip officiel`;
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=10&regionCode=FR&relevanceLanguage=fr` +
    `&q=${encodeURIComponent(q)}&key=${key}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`YouTube search HTTP ${res.status}`);
  const json = (await res.json()) as { items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }[] };
  const items = json.items ?? [];
  const title = norm(track.title);
  const titleWords = title.split(" ").filter((w) => w.length > 1);
  // Règle : UNIQUEMENT la chaîne officielle de l'artiste (ou du groupe), un titre qui
  // correspond au morceau, et rien qui indique autre chose qu'un clip (audio, lyrics, live…).
  const candidates = items
    .filter((it) => isOfficialChannel(it.snippet.channelTitle, track.artistName))
    .filter((it) => {
      const t = norm(it.snippet.title);
      return t.includes(title) || (titleWords.length > 0 && titleWords.every((w) => t.includes(w)));
    })
    .filter((it) => !NOT_A_CLIP.test(it.snippet.title))
    .sort((a, b) => Number(/clip|video/i.test(b.snippet.title)) - Number(/clip|video/i.test(a.snippet.title)));
  const best = candidates[0];
  if (!best) return null;
  const dres = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${best.id.videoId}&key=${key}`);
  const djson = (await dres.json()) as { items?: { contentDetails: { duration: string }; status?: { embeddable?: boolean } }[] };
  const v = djson.items?.[0];
  if (!v || v.status?.embeddable === false) return null;
  const duration = parseIsoDuration(v.contentDetails.duration);
  if (duration < 90) return null; // moins d'1 min 30 : pas un clip exploitable après l'intro
  return { videoId: best.id.videoId, duration, title: best.snippet.title };
}

export async function findClips(tracks: Track[]): Promise<Record<string, Clip | null>> {
  const key = process.env.YOUTUBE_API_KEY;
  const result: Record<string, Clip | null> = {};
  if (!key) {
    for (const t of tracks) result[t.id] = null;
    return result;
  }
  const cached = await readCache(tracks.map((t) => t.id));
  const missing = tracks.filter((t) => !(t.id in cached));
  for (const t of tracks) if (t.id in cached) result[t.id] = cached[t.id];
  // Recherches en parallèle mais plafonnées (quota) : au plus 12 nouvelles recherches par partie.
  const toSearch = missing.slice(0, 12);
  await Promise.all(
    toSearch.map(async (t) => {
      try {
        const clip = await searchYouTube(t, key);
        result[t.id] = clip;
        await writeCache(t.id, clip);
      } catch {
        result[t.id] = null; // quota épuisé ou erreur réseau : pas mis en cache, on retentera
      }
    })
  );
  for (const t of missing.slice(12)) result[t.id] = null;
  return result;
}

/** Point de départ : jamais l'intro (titre/artiste incrustés), jamais la fin (crédits). */
export function pickClipStart(duration: number): number {
  const min = 40;
  const max = Math.max(min + 1, duration - 45);
  return Math.floor(min + Math.random() * (max - min));
}
