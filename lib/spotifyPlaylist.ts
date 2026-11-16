import { deezerFetch, type DeezerTrackSummary } from "@/lib/deezerTrack";

/*
 * Playlists Spotify → titres jouables.
 *
 * Le jeu ne lit que des extraits Deezer (30 s officielles). Une playlist Spotify sert donc de
 * liste de courses : on lit ses titres (API officielle si SPOTIFY_CLIENT_ID/SECRET sont là,
 * sinon la page d'intégration publique), puis on retrouve chaque morceau dans le catalogue
 * Deezer. Utilisé par le constructeur (/api/blindtest/playlist) et par les thèmes
 * « Playlists DailyRap » du pool, qui pointent vers les playlists publiques du compte.
 */
export type Wanted = { title: string; artist: string };

export function cleanForSearch(s: string): string {
  return s
    .replace(/\s*[\(\[][^\)\]]*(remaster|version|edit|live|mix|feat\.?|ft\.?|bonus|explicit)[^\)\]]*[\)\]]/gi, "")
    .replace(/\s+-\s+.*(remaster|version|edit|live|mix).*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
export function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function matchOnDeezer(w: Wanted): Promise<DeezerTrackSummary | null> {
  const title = cleanForSearch(w.title);
  const artist = w.artist.split(",")[0].trim();
  const tries = [
    `/search?q=${encodeURIComponent(`artist:"${artist}" track:"${title}"`)}&limit=5`,
    `/search?q=${encodeURIComponent(`${artist} ${title}`)}&limit=5`,
  ];
  for (const path of tries) {
    try {
      const json = await deezerFetch<{ data?: DeezerTrackSummary[] }>(path, 86400);
      const list = (json.data ?? []).filter((t) => t.preview);
      if (!list.length) continue;
      const nt = norm(title);
      const na = norm(artist);
      const exact = list.find((t) => norm(cleanForSearch(t.title)) === nt && norm(t.artist?.name ?? "").includes(na.split(" ")[0]));
      if (exact) return exact;
      const sameTitle = list.find((t) => norm(cleanForSearch(t.title)) === nt);
      if (sameTitle) return sameTitle;
      if (path === tries[0]) return list[0];
    } catch {
      /* requête suivante */
    }
  }
  return null;
}

export async function mapLimited<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
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

export async function spotifyPlaylist(id: string): Promise<{ title: string; wanted: Wanted[] } | null> {
  return (await spotifyViaApi(id)) ?? (await spotifyViaEmbed(id));
}

/*
 * Thèmes « Playlists DailyRap » : la correspondance Deezer d'une playlist prend plusieurs
 * secondes (une recherche par titre). On la garde en mémoire 6 h par playlist — le contenu
 * des playlists change au plus une fois par jour, et une manche ne doit jamais attendre.
 */
const cache = new Map<string, { at: number; tracks: DeezerTrackSummary[] }>();
const TTL = 6 * 3600 * 1000;

export async function spotifyPlaylistTracks(id: string, max = 60): Promise<DeezerTrackSummary[]> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.tracks;
  const got = await spotifyPlaylist(id);
  if (!got) return hit?.tracks ?? [];
  const wanted = got.wanted.slice(0, max);
  const matched = (await mapLimited(wanted, 6, matchOnDeezer)).filter((t): t is DeezerTrackSummary => !!t && !!t.preview);
  const seen = new Set<number>();
  const tracks = matched.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  if (tracks.length) cache.set(id, { at: Date.now(), tracks });
  return tracks;
}
