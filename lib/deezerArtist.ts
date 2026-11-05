// Résolution d'artiste Deezer partagée par le pool de titres et les pochettes de thème.
//
// Le bug rapporté : `/search/artist?q=sadek&limit=1` renvoyait "Sadek (MAR)", un artiste
// marocain homonyme, plutôt que le rappeur français attendu par la liste curée. La recherche
// Deezer ne trie pas forcément par pertinence pour un nom d'artiste français précis — prendre
// le tout premier résultat est donc fragile dès qu'un homonyme existe (Sadek, mais
// potentiellement d'autres noms courts de la curation : Ali, RK, SCH, Vald...).
//
// Fix : on récupère plusieurs candidats, on garde ceux dont le nom correspond exactement
// (insensible à la casse) au nom recherché, puis parmi eux on choisit le plus populaire
// (nb_fan) — le rappeur français connu aura presque toujours plus de fans Deezer que
// l'homonyme obscur. S'il n'y a aucune correspondance exacte, on retombe sur le candidat le
// plus populaire tout court plutôt que sur le premier de la liste.

export type DeezerArtistLite = {
  id: number;
  name: string;
  nb_fan?: number;
  picture?: string;
  picture_medium?: string;
  picture_big?: string;
};

async function deezerFetch<T>(path: string): Promise<T> {
  // Tout ce qui renvoie des previews (top, tracks) expire vite (URL signées ~15 min) ;
  // le reste (recherche, albums, similaires) peut vivre 24 h.
  const hasPreviews = /\/(top|tracks)\b/.test(path);
  const res = await fetch(`https://api.deezer.com${path}`, { next: { revalidate: hasPreviews ? 600 : 86400 } });
  if (!res.ok) throw new Error(`Deezer ${path} → HTTP ${res.status}`);
  const json = await res.json();
  if (json?.error) throw new Error(`Deezer ${path} → ${json.error.message}`);
  return json;
}

const norm = (s: string) => s.toLowerCase().trim();

export async function resolveArtist(name: string): Promise<DeezerArtistLite | null> {
  try {
    const search = await deezerFetch<{ data?: DeezerArtistLite[] }>(
      `/search/artist?q=${encodeURIComponent(name)}&limit=10`
    );
    const candidates = search.data ?? [];
    if (candidates.length === 0) return null;

    const exact = candidates.filter((c) => norm(c.name) === norm(name));
    const pool = exact.length > 0 ? exact : candidates;

    return pool.reduce((best, c) => ((c.nb_fan ?? 0) > (best.nb_fan ?? 0) ? c : best), pool[0]);
  } catch {
    return null;
  }
}

/** Top titres d'un artiste (pour enrichir les pages « Blind test <artiste> »). */
export async function artistTopTracks(artistId: number, limit = 6): Promise<{ id: number; title: string; cover: string; album: string; rank: number }[]> {
  try {
    const top = await deezerFetch<{ data?: { id: number; title_short?: string; title: string; rank?: number; album?: { title?: string; cover_medium?: string } }[] }>(`/artist/${artistId}/top?limit=${limit}`);
    return (top.data ?? []).map((t) => ({ id: t.id, title: t.title_short ?? t.title, cover: t.album?.cover_medium ?? "", album: t.album?.title ?? "", rank: t.rank ?? 0 }));
  } catch {
    return [];
  }
}

/* ── Données enrichies pour les pages « Top sons de <artiste> » ───────────────────────── */

export type ArtistTopTrack = { id: number; title: string; album: string; cover: string; rank: number; duration: number; explicit: boolean; preview: string; link: string };
export type ArtistAlbum = { id: number; title: string; cover: string; releaseDate: string; type: string; link: string };
export type ArtistRelated = { id: number; name: string; picture: string };

/** Top titres détaillés (jusqu'à 50), classés par popularité Deezer. */
export async function artistTopTracksFull(artistId: number, limit = 10): Promise<ArtistTopTrack[]> {
  try {
    const top = await deezerFetch<{ data?: { id: number; title_short?: string; title: string; rank?: number; duration?: number; explicit_lyrics?: boolean; preview?: string; link?: string; album?: { title?: string; cover_medium?: string; cover_big?: string } }[] }>(`/artist/${artistId}/top?limit=${limit}`);
    return (top.data ?? []).map((t) => ({
      id: t.id,
      title: t.title_short ?? t.title,
      album: t.album?.title ?? "",
      cover: t.album?.cover_big ?? t.album?.cover_medium ?? "",
      rank: t.rank ?? 0,
      duration: t.duration ?? 0,
      explicit: !!t.explicit_lyrics,
      preview: t.preview ?? "",
      link: t.link ?? "",
    }));
  } catch {
    return [];
  }
}

/** Discographie (albums, EP, singles) — du plus récent au plus ancien. */
export async function artistAlbums(artistId: number, limit = 60): Promise<ArtistAlbum[]> {
  try {
    const res = await deezerFetch<{ data?: { id: number; title: string; cover_medium?: string; release_date?: string; record_type?: string; link?: string }[] }>(`/artist/${artistId}/albums?limit=${limit}`);
    return (res.data ?? [])
      .map((a) => ({ id: a.id, title: a.title, cover: a.cover_medium ?? "", releaseDate: a.release_date ?? "", type: a.record_type ?? "album", link: a.link ?? "" }))
      .sort((a, b) => (a.releaseDate < b.releaseDate ? 1 : -1));
  } catch {
    return [];
  }
}

/** Artistes proches selon Deezer — pour le maillage entre pages. */
export async function artistRelated(artistId: number, limit = 8): Promise<ArtistRelated[]> {
  try {
    const res = await deezerFetch<{ data?: { id: number; name: string; picture_medium?: string }[] }>(`/artist/${artistId}/related?limit=${limit}`);
    return (res.data ?? []).map((a) => ({ id: a.id, name: a.name, picture: a.picture_medium ?? "" }));
  } catch {
    return [];
  }
}
