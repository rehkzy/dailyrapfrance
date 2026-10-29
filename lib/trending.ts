/*
 * Tendances — ce qui s'écoute en ce moment, via les playlists éditoriales Deezer France (pas de clé).
 *   rap   : genre 116 (Rap/Hip-Hop), le cœur du média
 *   tout  : chart général France (pop, urbain, tout ce qui tourne)
 *   sorties : nouveautés rap FR
 * Mis en cache 30 min côté serveur ; chaque titre garde son extrait de 30 s pour l'écouter
 * sur place et son artiste pour lancer un blind test dessus.
 */
export type TrendTrack = { id: number; title: string; artist: string; artistId: number; cover: string; preview: string | null; link: string; rank: number };
export type TrendKind = "rap" | "tout";

type DzTrack = { id: number; title_short?: string; title: string; preview?: string; link: string; artist: { id: number; name: string }; album: { cover_medium?: string; cover_big?: string } };

async function dz<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.deezer.com${path}`, { next: { revalidate: 1800 }, headers: { "User-Agent": "DailyRapFrance/1.0" } });
    if (!res.ok) return null;
    const j = await res.json();
    return (j?.data ?? null) as T | null;
  } catch {
    return null;
  }
}

/* Playlists éditoriales Deezer France — stables quel que soit le pays du serveur (les charts
   /chart/… dépendent de l'IP, ce qui donnait du rap US depuis l'hébergeur). */
const PLAYLISTS = {
  rap: 1071669561, // « Actu Rap » — Deezer Rap & R&B France
  tout: 1109890291, // « Top France » — Deezer Charts
  sorties: 5449454322, // « Nouveautés Rap français » — Filtr France
} as const;

type DzPlaylistTrack = DzTrack & { time_add?: number };

async function playlistTracks(id: number, limit: number, newestFirst = false): Promise<TrendTrack[]> {
  const data = (await dz<DzPlaylistTrack[]>(`/playlist/${id}/tracks?limit=${Math.min(100, limit * 2)}`)) ?? [];
  const rows = newestFirst ? [...data].sort((a, b) => (b.time_add ?? 0) - (a.time_add ?? 0)) : data;
  return rows.slice(0, limit).map((t, i) => ({
    id: t.id,
    title: t.title_short ?? t.title,
    artist: t.artist?.name ?? "",
    artistId: t.artist?.id ?? 0,
    cover: t.album?.cover_medium ?? t.album?.cover_big ?? "",
    preview: t.preview || null,
    link: t.link,
    rank: i + 1,
  }));
}

export async function getTrending(kind: TrendKind = "rap", limit = 20): Promise<TrendTrack[]> {
  return playlistTracks(PLAYLISTS[kind], limit);
}

/** Dernières sorties rap FR (les ajouts les plus récents de la playlist nouveautés). */
export async function getNewReleases(limit = 20): Promise<TrendTrack[]> {
  return playlistTracks(PLAYLISTS.sorties, limit, true);
}
