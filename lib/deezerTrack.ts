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

/*
 * Nettoie un titre Deezer pour le jeu : la mention du featuring ("(feat. Hamza)", "ft. SDM",
 * "featuring X", "avec X", "[feat X]", "- feat X"…) donnerait la réponse de l'étape
 * "Qui est en feat ?" — on la retire, et on garde les noms extraits comme featurings
 * s'ils ne sont pas déjà dans les contributeurs.
 */
const FEAT_RE = /\s+[\(\[\-–—]?\s*(?:feat\.?|ft\.?|featuring|avec|with)\s+([^\)\]]+?)\s*[\)\]]?\s*$/i;
const FEAT_INLINE_RE = /\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring|avec|with)\s+([^\)\]]+)[\)\]]/gi;

export function cleanTitle(raw: string): { title: string; featsFromTitle: string[] } {
  let title = raw;
  const found: string[] = [];
  // 1) mentions entre parenthèses/crochets n'importe où : "Titre (feat. X) [Remix]"
  title = title.replace(FEAT_INLINE_RE, (_m, names: string) => {
    found.push(names);
    return "";
  });
  // 2) mention en fin de titre sans parenthèses : "Titre feat. X", "Titre - ft X"
  const m = FEAT_RE.exec(title);
  if (m) {
    found.push(m[1]);
    title = title.slice(0, m.index);
  }
  title = title.replace(/\s{2,}/g, " ").replace(/\s*[\-–—]\s*$/, "").trim();
  const featsFromTitle = found
    .flatMap((n) => n.split(/\s*(?:,|&|\/|\bet\b|\band\b)\s*/i))
    .map((n) => n.trim())
    .filter(Boolean);
  return { title: title || raw, featsFromTitle };
}

export function toGameTrack(t: DeezerTrackFull) {
  const mainId = t.artist?.id;
  const mainName = (t.artist?.name ?? "").toLowerCase();
  const { title, featsFromTitle } = cleanTitle(t.title);
  const feats = [...(t.contributors ?? []).filter((c) => c.id !== mainId).map((c) => c.name), ...featsFromTitle]
    .filter((name) => name.toLowerCase() !== mainName)
    .filter((name, i, arr) => arr.findIndex((x) => x.toLowerCase() === name.toLowerCase()) === i);
  return {
    id: String(t.id),
    title,
    artistName: t.artist?.name ?? "",
    // Deezer renvoie parfois ses liens d'extrait en http:// plutôt qu'en https:// — sur un
    // site servi en HTTPS, ce contenu mixte est bloqué silencieusement par le navigateur.
    // On force https systématiquement.
    previewUrl: (t.preview ?? "").replace(/^http:\/\//, "https://"),
    coverUrl: t.album?.cover_medium || t.album?.cover_big || null,
    feats,
  };
}
