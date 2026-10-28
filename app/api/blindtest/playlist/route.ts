import { NextRequest, NextResponse } from "next/server";
import { deezerFetch, toGameTrack, type DeezerTrackSummary } from "@/lib/deezerTrack";

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

type Wanted = { title: string; artist: string };
const MAX_IMPORT = 50;

function cleanForSearch(s: string): string {
  return s
    .replace(/\s*[\(\[][^\)\]]*(remaster|version|edit|live|mix|feat\.?|ft\.?|bonus|explicit)[^\)\]]*[\)\]]/gi, "")
    .replace(/\s+-\s+.*(remaster|version|edit|live|mix).*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function matchOnDeezer(w: Wanted): Promise<DeezerTrackSummary | null> {
  const title = cleanForSearch(w.title);
  const artist = w.artist.split(",")[0].trim();
  const tries = [
    `/search?q=${encodeURIComponent(`artist:"${artist}" track:"${title}"`)}&limit=5`,
    `/search?q=${encodeURIComponent(`${artist} ${title}`)}&limit=5`,
  ];
  for (const path of tries) {
    try {
      const json = await deezerFetch<{ data?: DeezerTrackSummary[] }>(path);
      const list = (json.data ?? []).filter((t) => t.preview);
      if (!list.length) continue;
      const nt = norm(title);
      const na = norm(artist);
      // Priorité : même titre ET même artiste ; sinon même titre ; sinon le premier résultat
      // de la requête ciblée (artist: track:) seulement.
      const exact = list.find((t) => norm(cleanForSearch(t.title)) === nt && norm(t.artist?.name ?? "").includes(na.split(" ")[0]));
      if (exact) return exact;
      const sameTitle = list.find((t) => norm(cleanForSearch(t.title)) === nt);
      if (sameTitle) return sameTitle;
      if (path === tries[0]) return list[0];
    } catch {
      /* on tente la requête suivante */
    }
  }
  return null;
}

async function mapLimited<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/* --- Spotify : liste des titres d'une playlist publique -------------------------------- */
async function spotifyViaApi(id: string): Promise<{ title: string; wanted: Wanted[] } | null> {
  const cid = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!cid || !secret) return null;
  try {
    const tok = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${cid}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
      cache: "no-store",
    }).then((r) => r.json());
    const token = tok.access_token as string | undefined;
    if (!token) return null;
    const h = { Authorization: `Bearer ${token}` };
    const meta = await fetch(`https://api.spotify.com/v1/playlists/${id}?fields=name`, { headers: h }).then((r) => r.json());
    const wanted: Wanted[] = [];
    let next: string | null = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100&fields=next,items(track(name,artists(name)))`;
    while (next && wanted.length < 200) {
      const page: { next: string | null; items?: { track?: { name: string; artists: { name: string }[] } }[] } = await fetch(next, { headers: h }).then((r) => r.json());
      for (const it of page.items ?? []) if (it.track?.name) wanted.push({ title: it.track.name, artist: it.track.artists.map((a) => a.name).join(", ") });
      next = page.next;
    }
    return { title: meta.name ?? "Playlist Spotify", wanted };
  } catch {
    return null;
  }
}

async function spotifyViaEmbed(id: string): Promise<{ title: string; wanted: Wanted[] } | null> {
  try {
    const html = await fetch(`https://open.spotify.com/embed/playlist/${id}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15", "Accept-Language": "fr" },
      cache: "no-store",
    }).then((r) => (r.ok ? r.text() : ""));
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) return null;
    const data = JSON.parse(m[1]);
    const entity = data?.props?.pageProps?.state?.data?.entity;
    const list: { title?: string; subtitle?: string }[] = entity?.trackList ?? [];
    if (!list.length) return null;
    return { title: entity?.name ?? "Playlist Spotify", wanted: list.filter((t) => t.title).map((t) => ({ title: t.title!, artist: t.subtitle ?? "" })) };
  } catch {
    return null;
  }
}

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
      const got = (await spotifyViaApi(sp[1])) ?? (await spotifyViaEmbed(sp[1]));
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
