import { NextRequest, NextResponse } from "next/server";
import { deezerFetch, toGameTrack, type DeezerTrackSummary } from "@/lib/deezerTrack";
import { spotifyPlaylist, matchOnDeezer, mapLimited, type Wanted } from "@/lib/spotifyPlaylist";

/*
 * Import d'une playlist pour le constructeur de blind test.
 *
 *  - Deezer (publique) : les titres sont pris tels quels (extraits officiels de 30 s).
 *  - Spotify (publique) : on lit la liste titre/artiste de la playlist (page d'intégration
 *    publique de Spotify, ou l'API officielle si SPOTIFY_CLIENT_ID/SECRET sont définis), puis
 *    on retrouve chaque morceau dans le catalogue Deezer. Ceux qui n'y sont pas sont renvoyés
 *    dans `missing` pour être signalés à la personne — ils ne peuvent pas entrer dans le jeu.
 *
 * GET /api/blindtest/playlist?url=…  → { source, title, tracks, missing: [{ title, artist }] }
 */

// Vercel : la correspondance Deezer de 50 titres prend plusieurs secondes — on autorise jusqu'à 60 s.
export const maxDuration = 60;

const MAX_IMPORT = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = (searchParams.get("url") ?? "").trim();

  const dz = url.match(/deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d+)/i) ?? url.match(/^(\d{4,})$/);
  const sp = url.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?playlist\/([A-Za-z0-9]{10,})/i) ?? url.match(/spotify:playlist:([A-Za-z0-9]{10,})/);

  try {
    if (dz) {
      const meta = await deezerFetch<{ title?: string }>(`/playlist/${dz[1]}`);
      const json = await deezerFetch<{ data?: DeezerTrackSummary[] }>(`/playlist/${dz[1]}/tracks?limit=100`);
      const all = json.data ?? [];
      const ok = all.filter((t) => t.preview).slice(0, MAX_IMPORT);
      const missing = all.filter((t) => !t.preview).map((t) => ({ title: t.title, artist: t.artist?.name ?? "" }));
      return NextResponse.json({ source: "deezer", title: meta.title ?? "Playlist", tracks: ok.map((t) => toGameTrack({ ...t, contributors: [] })), missing });
    }
    if (sp) {
      const got = await spotifyPlaylist(sp[1]);
      if (!got) return NextResponse.json({ error: "unreachable", source: "spotify" }, { status: 400 });
      const wanted = got.wanted.slice(0, MAX_IMPORT);
      const found = await mapLimited(wanted, 8, matchOnDeezer);
      const tracks: ReturnType<typeof toGameTrack>[] = [];
      const missing: Wanted[] = [];
      const seen = new Set<number>();
      found.forEach((t, i) => {
        if (t && !seen.has(t.id)) {
          seen.add(t.id);
          tracks.push(toGameTrack({ ...t, contributors: [] }));
        } else if (!t) missing.push(wanted[i]);
      });
      return NextResponse.json({ source: "spotify", title: got.title, tracks, missing, truncated: got.wanted.length > MAX_IMPORT ? got.wanted.length : undefined });
    }
    const other = /music\.apple\.com|youtube\.com|youtu\.be/i.test(url) ? "other" : "invalid";
    return NextResponse.json({ error: other }, { status: 400 });
  } catch (err) {
    console.error("[blindtest/playlist] —", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "unreachable" }, { status: 400 });
  }
}
