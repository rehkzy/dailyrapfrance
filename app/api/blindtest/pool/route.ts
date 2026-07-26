import { NextRequest, NextResponse } from "next/server";

// Pool de titres du blind test — 100% en direct depuis l'API Deezer, aucune base de données.
// Volontairement sans persistance : plus simple à déployer (rien à peupler, rien qui puisse
// être "pas encore prêt"), au prix d'un léger délai de chargement à chaque partie.
//
// Sources par thème — mêmes playlists/curation que documentées dans le README, mais
// interrogées à la demande plutôt que pré-ingérées :
const DECADE_PLAYLISTS: Record<string, number[]> = {
  old: [1182010551, 4676814864], // Rapstars 90s + 2000
  "2010s": [5175061384],          // Rapstars 2010
  recent: [9563400362],           // Rapstars 2020
};
const ALL_DECADE_PLAYLISTS = [1182010551, 4676814864, 5175061384, 9563400362];

// Curation manuelle vérifiée le 26/07/2026 (voir historique) — courte et à étendre, pas une
// base de données géographique faisant autorité. Deezer ne fournit ni sous-genre ni ville.
const CLOUD_ARTISTS = ["suikoden", "josman", "fixpen sill", "le wombat", "lomepal"];
const DEPT_93_ARTISTS = ["kaaris", "mac tyer", "vald", "kalash criminel", "maes", "diddi trix"];
const DEPT_91_ARTISTS = ["pnl", "niska", "koba lad", "ol kainry"];

type DeezerTrack = {
  id: number;
  title: string;
  preview?: string;
  rank?: number;
  artist?: { name?: string };
  album?: { cover_medium?: string; cover_big?: string };
};

async function deezerFetch(path: string): Promise<{ data?: DeezerTrack[]; error?: { message: string } }> {
  const res = await fetch(`https://api.deezer.com${path}`, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Deezer ${path} → HTTP ${res.status}`);
  const json = await res.json();
  if (json?.error) throw new Error(`Deezer ${path} → ${json.error.message}`);
  return json;
}

async function fetchPlaylistTracks(id: number): Promise<DeezerTrack[]> {
  try {
    const json = await deezerFetch(`/playlist/${id}/tracks?limit=100`);
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function fetchArtistTopTracks(name: string): Promise<DeezerTrack[]> {
  try {
    const search = await deezerFetch(`/search/artist?q=${encodeURIComponent(name)}&limit=1`);
    const artist = (search.data as unknown as { id: number }[] | undefined)?.[0];
    if (!artist) return [];
    const top = await deezerFetch(`/artist/${artist.id}/top?limit=10`);
    return top.data ?? [];
  } catch {
    return [];
  }
}

function toGameTrack(t: DeezerTrack) {
  return {
    id: String(t.id),
    title: t.title,
    artistName: t.artist?.name ?? "",
    previewUrl: t.preview ?? "",
    coverUrl: t.album?.cover_medium || t.album?.cover_big || null,
  };
}

// GET /api/blindtest/pool?theme=mix|old|2010s|recent|pop|cloud|93|91&count=15
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const themeId = searchParams.get("theme") ?? "mix";
  const count = Math.min(Math.max(Number(searchParams.get("count")) || 15, 1), 50);

  try {
    let raw: DeezerTrack[] = [];

    if (themeId === "cloud" || themeId === "93" || themeId === "91") {
      const names = themeId === "cloud" ? CLOUD_ARTISTS : themeId === "93" ? DEPT_93_ARTISTS : DEPT_91_ARTISTS;
      const lists = await Promise.all(names.map(fetchArtistTopTracks));
      raw = lists.flat();
    } else if (themeId === "pop") {
      const lists = await Promise.all(ALL_DECADE_PLAYLISTS.map(fetchPlaylistTracks));
      raw = lists.flat().sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
    } else if (themeId === "mix") {
      const lists = await Promise.all(ALL_DECADE_PLAYLISTS.map(fetchPlaylistTracks));
      raw = lists.flat();
    } else {
      const ids = DECADE_PLAYLISTS[themeId] ?? ALL_DECADE_PLAYLISTS;
      const lists = await Promise.all(ids.map(fetchPlaylistTracks));
      raw = lists.flat();
    }

    const withPreview = raw.filter((t) => t.preview);
    const pool = themeId === "pop" ? withPreview.slice(0, count * 4) : withPreview;
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);

    return NextResponse.json({ tracks: shuffled.map(toGameTrack) });
  } catch (err) {
    console.error("[blindtest/pool] erreur —", err instanceof Error ? err.message : err);
    return NextResponse.json({ tracks: [] });
  }
}
