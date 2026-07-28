import { NextRequest, NextResponse } from "next/server";
import { resolveArtist } from "@/lib/deezerArtist";

// Pool de titres du blind test — 100% en direct depuis l'API Deezer, aucune base de données.
// Volontairement sans persistance : rien à peupler, rien qui puisse être "pas encore prêt".
//
// Sources par thème — playlists éditoriales par décennie pour les thèmes généraux, recherche
// d'artiste pour les thèmes ciblés (curation manuelle, voir listes ci-dessous).
const DECADE_PLAYLISTS: Record<string, number[]> = {
  "90s": [1182010551],           // Rapstars 90s
  "2000s": [4676814864],         // Rapstars 2000
  "2010s": [5175061384],          // Rapstars 2010
  recent: [9563400362],           // Rapstars 2020
};
const ALL_DECADE_PLAYLISTS = [1182010551, 4676814864, 5175061384, 9563400362];

// Curation manuelle, vérifiée nom par nom le 26/07/2026 (sources : Wikipédia + bios
// officielles). Volontairement courte et à étendre — pas une base de données géographique
// faisant autorité. Deezer ne fournit ni sous-genre ni ville de naissance.
const CLOUD_ARTISTS = ["suikoden", "josman", "fixpen sill", "le wombat", "lomepal"];
// Styles — curation manuelle par sous-genre, mêmes réserves que ci-dessus : listes courtes,
// artistes emblématiques du style, à étendre au fil des retours joueurs.
// Drill & trap sont sourcés par PLAYLISTS et non par artistes : le style est une propriété
// des morceaux, pas des artistes — le top Deezer d'un artiste drill est souvent son hit
// mélodique grand public, d'où des pools hors-sujet avec l'approche par artistes.
// Playlists retenues après inspection du contenu (dominantes vérifiées le 28/07/2026) :
//   drill — éditoriales Digster France (1Pliké140, Ziak, Sokra…) + Filtr France (Kerchak, Gazo, KLM…)
//   trap  — "Hits de Rue" (éditoriale Deezer : Uzi, SDM, Zkr, Maes…) + "Trap style bangers" (Kaaris, SCH, Niska, Koba…)
const STYLE_PLAYLISTS: Record<string, number[]> = {
  drill: [3110361646, 8059169502],
  trap: [14055911981, 11116884244],
};

const STYLE_ARTISTS: Record<string, string[]> = {
  hardcore: ["kaaris", "kalash criminel", "alkpote", "seth gueko", "rohff"],
  boombap: ["iam", "suprême ntm", "oxmo puccino", "kery james"],
  melodique: ["pnl", "hamza", "tiakola", "so la lune"],
  conscient: ["kery james", "médine", "youssoupha"],
};
const LAGUI_SADEK_ARTISTS = ["lagui", "sadek"];
const DEPT_ARTISTS: Record<string, string[]> = {
  "93": ["kaaris", "mac tyer", "vald", "kalash criminel", "maes", "diddi trix"],
  "91": ["pnl", "niska", "koba lad", "ol kainry"],
  "92": ["booba", "ali", "sdm", "benash"],
  "77": ["djadja & dinaz", "rk", "timal", "houdi"],
  "78": ["la fouine"],
  "13": ["jul", "sch", "soprano", "alonzo", "naps", "soso maness", "akhenaton", "shurik'n"],
  "69": ["bouss", "khali", "zeu", "lyonzon"],
  "59": ["gradur"],
};
DEPT_ARTISTS["idf"] = Array.from(new Set([...DEPT_ARTISTS["93"], ...DEPT_ARTISTS["91"], ...DEPT_ARTISTS["92"], ...DEPT_ARTISTS["77"], ...DEPT_ARTISTS["78"]]));

// Thèmes à liste de titres VERROUILLÉE — quand la page Deezer d'un artiste est contaminée
// (morceaux d'homonymes/tiers rattachés par erreur), on fige la liste exacte des IDs de
// titres au lieu de faire confiance à ses albums. forcedArtistName corrige au passage les
// crédits erronés de Deezer à l'affichage ("Cité" est crédité "Bendo" chez eux).
// IDs vérifiés un par un le 28/07/2026.
const FIXED_TRACK_THEMES: Record<string, { trackIds: number[]; forcedArtistName?: string }> = {
  // "Imène elle give" — curation par ambiance (festif / amour) chez Dadju, Jul, Tiakola,
  // Oboy. Volontairement une liste de titres choisis à la main plutôt qu'un sourçage par
  // top artiste : leurs catalogues mélangent aussi des morceaux de rue/street qui ne
  // colleraient pas au thème. Vérifiés avec preview le 28/07/2026.
  "imene-elle-give": {
    trackIds: [
      // Dadju
      429974992, 869941882, 2570360062, 1718052197, 562148732, 1084245712, 429975052, 1389360732, 1593201331, 2004821007,
      // Jul
      3689236742, 378114151, 75867424, 3380338381, 519797762, 3330198511, 994675552,
      // Tiakola
      4059400101, 2964716561, 3000573551, 3553677491, 1481109202,
      // Oboy
      708702202, 3450361821, 3574259191, 2977780751, 453609952,
    ],
  },
  "artist-benef": {
    trackIds: [
      2935905291, // LOCA
      3491145971, // Mafia Italienne
      3604950312, // IA
      3316851691, // No Limit
      3513695591, // Le Temps
      3129388061, // Tolérance Zéro
      3339779681, // Tolérance 2.0
      2131276367, // Cité (crédité "Bendo" chez Deezer — nom d'artiste forcé ci-dessous)
      3558292351, // Réseaux
    ],
    forcedArtistName: "Benef",
  },
};

// Blind tests dédiés à un seul artiste — que ses propres morceaux.
const SINGLE_ARTIST_THEMES: Record<string, string[]> = {
  "artist-ninho": ["ninho"],
  "artist-booba": ["booba"],
  "artist-pnl": ["pnl"],
  "artist-sch": ["sch"],
  "artist-jul": ["jul"],
  "artist-nekfeu": ["nekfeu"],
  "artist-badara": ["badara"],
  "artist-werenoi": ["werenoi"],
  "artist-benef": ["benef"],
  "artist-djadja-dinaz": ["djadja & dinaz"],
  "artist-bouss": ["bouss"],
};

type DeezerTrackSummary = {
  id: number;
  title: string;
  preview?: string;
  rank?: number;
  artist?: { id?: number; name?: string };
  album?: { cover_medium?: string; cover_big?: string };
};

type DeezerTrackFull = DeezerTrackSummary & {
  contributors?: { id: number; name: string }[];
};

async function deezerFetch<T = { data?: DeezerTrackSummary[] }>(path: string): Promise<T> {
  const res = await fetch(`https://api.deezer.com${path}`, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Deezer ${path} → HTTP ${res.status}`);
  const json = await res.json();
  if (json?.error) throw new Error(`Deezer ${path} → ${json.error.message}`);
  return json;
}

async function fetchPlaylistTracks(id: number): Promise<DeezerTrackSummary[]> {
  try {
    const json = await deezerFetch(`/playlist/${id}/tracks?limit=100`);
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function fetchArtistTopTracks(name: string): Promise<DeezerTrackSummary[]> {
  try {
    const artist = await resolveArtist(name);
    if (!artist) return [];
    const top = await deezerFetch(`/artist/${artist.id}/top?limit=30`);
    let tracks = top.data ?? [];

    // Filet de sécurité pour les thèmes à peu d'artistes (ex. un duo, ou un département
    // curé avec un seul nom) : si le top de l'artiste ne suffit pas à lui seul, on complète
    // avec les titres de ses albums plutôt que de laisser le pool trop maigre.
    if (tracks.filter((t) => t.preview).length < 8) {
      try {
        const albums = await deezerFetch<{ data?: { id: number }[] }>(`/artist/${artist.id}/albums?limit=6`);
        const albumTracks = await Promise.all(
          (albums.data ?? []).map((a) =>
            deezerFetch(`/album/${a.id}/tracks?limit=15`).then((r) => r.data ?? []).catch(() => [])
          )
        );
        const seen = new Set(tracks.map((t) => t.id));
        for (const list of albumTracks) {
          for (const t of list) {
            if (!seen.has(t.id)) {
              seen.add(t.id);
              tracks.push(t);
            }
          }
        }
      } catch {
        // le top seul suffira, ou le thème restera limité — pas bloquant
      }
    }
    return tracks;
  } catch {
    return [];
  }
}

// Détail complet — seulement pour le lot final retenu (pas tout le pool candidat), pour
// récupérer les featurings (`contributors`), absents des objets résumés des playlists.
async function fetchTrackDetail(id: number): Promise<DeezerTrackFull | null> {
  try {
    return await deezerFetch<DeezerTrackFull>(`/track/${id}`);
  } catch {
    return null;
  }
}

function toGameTrack(t: DeezerTrackFull) {
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
    // site servi en HTTPS, ce contenu mixte est bloqué silencieusement par le navigateur
    // (l'audio ne se charge jamais, sans la moindre erreur visible). D'où des extraits muets
    // de façon aléatoire, sur n'importe quel thème. On force https systématiquement.
    previewUrl: (t.preview ?? "").replace(/^http:\/\//, "https://"),
    coverUrl: t.album?.cover_medium || t.album?.cover_big || null,
    feats,
  };
}

// GET /api/blindtest/pool?theme=mix|90s|2000s|2010s|recent|pop|cloud|hardcore|drill|trap|boombap|melodique|conscient|93|91|92|77|78|13|59|idf|artist-*&count=15
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const themeId = searchParams.get("theme") ?? "mix";
  const count = Math.min(Math.max(Number(searchParams.get("count")) || 15, 1), 50);

  try {
    let raw: DeezerTrackSummary[] = [];

    const artistListsById: Record<string, string[]> = {
      cloud: CLOUD_ARTISTS,
      ...STYLE_ARTISTS,
      "lagui-sadek": LAGUI_SADEK_ARTISTS,
      ...DEPT_ARTISTS,
      ...SINGLE_ARTIST_THEMES,
    };

    const fixed = FIXED_TRACK_THEMES[themeId];
    if (fixed) {
      const detailed = await Promise.all(fixed.trackIds.map((id) => fetchTrackDetail(id)));
      const tracks = detailed
        .filter((t): t is NonNullable<typeof t> => !!t && !!t.preview)
        .sort(() => Math.random() - 0.5)
        .slice(0, count)
        .map((full) => {
          const track = toGameTrack(full);
          return fixed.forcedArtistName ? { ...track, artistName: fixed.forcedArtistName } : track;
        });
      return NextResponse.json({ tracks });
    }

    if (STYLE_PLAYLISTS[themeId]) {
      const lists = await Promise.all(STYLE_PLAYLISTS[themeId].map(fetchPlaylistTracks));
      raw = lists.flat();
    } else if (artistListsById[themeId]) {
      const names = artistListsById[themeId];
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

    // Détail complet uniquement sur le lot final (pas sur tout le pool candidat) pour
    // récupérer les featurings sans multiplier les appels API.
    const detailed = await Promise.all(shuffled.map((t) => fetchTrackDetail(t.id)));
    const tracks = detailed
      .map((full, i) => (full ? toGameTrack(full) : toGameTrack({ ...shuffled[i], contributors: [] })))
      .filter((t) => t.previewUrl);

    return NextResponse.json({ tracks });
  } catch (err) {
    console.error("[blindtest/pool] erreur —", err instanceof Error ? err.message : err);
    return NextResponse.json({ tracks: [] });
  }
}
