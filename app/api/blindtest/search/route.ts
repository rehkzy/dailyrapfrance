import { NextRequest, NextResponse } from "next/server";
import { deezerFetch, toGameTrack, type DeezerTrackSummary } from "@/lib/deezerTrack";

// Recherche Deezer pour le constructeur de blind test : titres (avec extrait) et artistes.
// GET /api/blindtest/search?q=…            → { tracks, artists }
// GET /api/blindtest/search?artist=<id>    → { tracks } (top de l'artiste)
type ArtistLite = { id: number; name: string; picture_medium?: string; nb_fan?: number };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const artistId = Number(searchParams.get("artist"));
  try {
    if (artistId) {
      const json = await deezerFetch<{ data?: DeezerTrackSummary[] }>(`/artist/${artistId}/top?limit=25`);
      const tracks = (json.data ?? []).filter((t) => t.preview).map((t) => toGameTrack({ ...t, contributors: [] }));
      return NextResponse.json({ tracks });
    }
    if (q.length < 2) return NextResponse.json({ tracks: [], artists: [] });
    const [tr, ar] = await Promise.all([
      deezerFetch<{ data?: DeezerTrackSummary[] }>(`/search/track?q=${encodeURIComponent(q)}&limit=12`),
      deezerFetch<{ data?: ArtistLite[] }>(`/search/artist?q=${encodeURIComponent(q)}&limit=4`),
    ]);
    const tracks = (tr.data ?? []).filter((t) => t.preview).map((t) => toGameTrack({ ...t, contributors: [] }));
    const artists = (ar.data ?? []).map((a) => ({ id: a.id, name: a.name, picture: a.picture_medium ?? null, fans: a.nb_fan ?? 0 }));
    return NextResponse.json({ tracks, artists });
  } catch (err) {
    console.error("[blindtest/search] —", err instanceof Error ? err.message : err);
    return NextResponse.json({ tracks: [], artists: [] });
  }
}
