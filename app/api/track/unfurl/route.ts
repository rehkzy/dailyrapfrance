import { NextRequest, NextResponse } from "next/server";
import { deezerFetch, type DeezerTrackSummary } from "@/lib/deezerTrack";

/*
 * Un lien Spotify / Deezer collé dans la messagerie → une carte (titre, artiste, pochette,
 * extrait Deezer quand on le retrouve). Spotify : oEmbed public (pas de clé), puis on
 * cherche le même titre chez Deezer pour avoir un extrait jouable.
 * GET /api/track/unfurl?url=…
 */
export const revalidate = 3600;

type Card = { provider: "spotify" | "deezer"; url: string; title: string; artist: string; cover: string | null; preview: string | null; deezerId: number | null };

const SPOTIFY_RE = /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]+)/;
const DEEZER_RE = /deezer\.(?:com|page\.link)\/(?:[a-z]{2}\/)?track\/(\d+)/;

async function fromDeezer(id: number, url: string): Promise<Card | null> {
  const t = await deezerFetch<DeezerTrackSummary & { error?: unknown }>(`/track/${id}`);
  if (!t || t.error || !t.title) return null;
  return { provider: "deezer", url, title: t.title, artist: t.artist?.name ?? "", cover: t.album?.cover_medium ?? null, preview: (t.preview ?? "").replace(/^http:/, "https:") || null, deezerId: t.id };
}

export async function GET(req: NextRequest) {
  const url = (new URL(req.url).searchParams.get("url") ?? "").trim();
  try {
    const dz = url.match(DEEZER_RE);
    if (dz) return NextResponse.json(await fromDeezer(Number(dz[1]), url));
    const sp = url.match(SPOTIFY_RE);
    if (sp) {
      const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${sp[1]}`)}`, { next: { revalidate: 3600 } });
      if (!res.ok) return NextResponse.json(null);
      const o = (await res.json()) as { title?: string; thumbnail_url?: string };
      const title = o.title ?? "";
      // oEmbed ne donne que « Titre » : on retrouve l'artiste et l'extrait chez Deezer.
      let match: DeezerTrackSummary | undefined;
      if (title) {
        const s = await deezerFetch<{ data?: DeezerTrackSummary[] }>(`/search/track?q=${encodeURIComponent(title)}&limit=5`);
        match = (s.data ?? []).find((t) => t.title.toLowerCase().startsWith(title.toLowerCase().slice(0, 12)));
      }
      return NextResponse.json({ provider: "spotify", url, title: match?.title ?? title, artist: match?.artist?.name ?? "", cover: match?.album?.cover_medium ?? o.thumbnail_url ?? null, preview: match ? (match.preview ?? "").replace(/^http:/, "https:") || null : null, deezerId: match?.id ?? null } satisfies Card);
    }
    return NextResponse.json(null);
  } catch (err) {
    console.error("[track/unfurl] —", err instanceof Error ? err.message : err);
    return NextResponse.json(null);
  }
}
