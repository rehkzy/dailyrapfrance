export type DeezerTrackSummary = {
  id: number;
  title: string;
  preview?: string;
  rank?: number;
  artist?: { id?: number; name?: string };
  album?: { cover_medium?: string; cover_big?: string };
};

export type DeezerTrackFull = DeezerTrackSummary & {
  contributors?: { id: number; name: string }[];
};

export async function deezerFetch<T = { data?: DeezerTrackSummary[] }>(path: string): Promise<T> {
  const res = await fetch(`https://api.deezer.com${path}`, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Deezer ${path} → HTTP ${res.status}`);
  const json = await res.json();
  if (json?.error) throw new Error(`Deezer ${path} → ${json.error.message}`);
  return json;
}

export async function fetchTrackDetail(id: number): Promise<DeezerTrackFull | null> {
  try {
    return await deezerFetch<DeezerTrackFull>(`/track/${id}`);
  } catch {
    return null;
  }
}

export function toGameTrack(t: DeezerTrackFull) {
  const mainId = t.artist?.id;
  const feats = (t.contributors ?? [])
    .filter((c) => c.id !== mainId)
    .map((c) => c.name)
    .filter((name, i, arr) => arr.indexOf(name) === i);
  return {
    id: String(t.id),
    title: t.title,
    artistName: t.artist?.name ?? "",
    // Deezer renvoie parfois ses liens d'extrait en http:// plutôt qu'en https:// — sur un
    // site servi en HTTPS, ce contenu mixte est bloqué silencieusement par le navigateur.
    // On force https systématiquement.
    previewUrl: (t.preview ?? "").replace(/^http:\/\//, "https://"),
    coverUrl: t.album?.cover_medium || t.album?.cover_big || null,
    feats,
  };
}
