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
const STYLE_ARTISTS: Record<string, string[]> = {
  hardcore: ["kaaris", "kalash criminel", "alkpote", "seth gueko", "rohff"],
  drill: ["gazo", "ziak", "freeze corleone", "ashe 22", "bolémvn", "guy2bezbar"],
  trap: ["niska", "gradur", "maes", "koba lad"],
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
  "59": ["gradur"],
};
DEPT_ARTISTS["idf"] = Array.from(new Set([...DEPT_ARTISTS["93"], ...DEPT_ARTISTS["91"], ...DEPT_ARTISTS["92"], ...DEPT_ARTISTS["77"], ...DEPT_ARTISTS["78"]]));

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

    if (artistListsById[themeId]) {
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
