export type DeezerTrackSummary = {
  id: number;
  title: string;
  preview?: string;
  rank?: number;
  time_add?: number; // playlists : date d'ajout (epoch s) — sert au thème « Sorti cette semaine »
  artist?: { id?: number; name?: string };
  album?: { cover_medium?: string; cover_big?: string };
};

export type DeezerTrackFull = DeezerTrackSummary & {
  contributors?: { id: number; name: string }[];
};

export async function deezerFetch<T = { data?: DeezerTrackSummary[] }>(path: string): Promise<T> {
  // Les URL de preview Deezer sont signées et expirent ~15 min après la réponse : un cache
  // plus long sert des extraits morts (« le son ne part pas »). 10 min, pas plus.
  const res = await fetch(`https://api.deezer.com${path}`, { next: { revalidate: 600 } });
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

/*
 * Garde-fous (bug vu en partie : un titre « posse cut » avec 150 contributeurs affichait un
 * mur de noms sur tout l'écran). Un titre de blind test, c'est UN artiste et au plus
 * quelques featurings ; au-delà, ce n'est plus jouable : on le marque et on l'écarte.
 */
export const MAX_FEATS = 3;            // affichés et devinables
const MAX_CONTRIBUTORS = 6;            // au-delà : compilation / posse cut → pas jouable
const MAX_ARTIST_LEN = 48;
const MAX_TITLE_LEN = 90;
const VARIOUS_RE = /^(various|multi|divers|artistes? vari|compilation)/i;

export type GameTrack = ReturnType<typeof toGameTrack>;

/** Un titre que le jeu peut afficher et faire deviner sans surprise. */
export function isPlayableTrack(t: GameTrack): boolean {
  return !!t.previewUrl && !t.unplayable && !!t.artistName && t.artistName.length <= MAX_ARTIST_LEN && t.title.length <= MAX_TITLE_LEN && !VARIOUS_RE.test(t.artistName);
}

export function toGameTrack(t: DeezerTrackFull) {
  const mainId = t.artist?.id;
  const mainName = (t.artist?.name ?? "").toLowerCase();
  const { title, featsFromTitle } = cleanTitle(t.title);
  const allFeats = [...(t.contributors ?? []).filter((c) => c.id !== mainId).map((c) => c.name), ...featsFromTitle]
    .filter((name) => name.toLowerCase() !== mainName)
    .filter((name, i, arr) => arr.findIndex((x) => x.toLowerCase() === name.toLowerCase()) === i);
  const unplayable = allFeats.length > MAX_CONTRIBUTORS;
  const feats = unplayable ? [] : allFeats.slice(0, MAX_FEATS);
  return {
    id: String(t.id),
    title,
    artistName: t.artist?.name ?? "",
    unplayable,
    // Deezer renvoie parfois ses liens d'extrait en http:// plutôt qu'en https:// — sur un
    // site servi en HTTPS, ce contenu mixte est bloqué silencieusement par le navigateur.
    // On force https systématiquement.
    previewUrl: (t.preview ?? "").replace(/^http:\/\//, "https://"),
    coverUrl: t.album?.cover_medium || t.album?.cover_big || null,
    feats,
  };
}
