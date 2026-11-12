import { NextRequest, NextResponse } from "next/server";
import { resolveArtist } from "@/lib/deezerArtist";
import { deezerFetch, fetchTrackDetail, toGameTrack, isPlayableTrack, type DeezerTrackSummary, type DeezerTrackFull } from "@/lib/deezerTrack";
import { THEME_PLAYLISTS, THEME_ARTISTS, ALL_DECADE_PLAYLISTS } from "@/lib/themeSources";
import { isSoundbiteTheme, soundbitesFor } from "@/lib/gimmicks";

// Pool de titres du blind test — 100% en direct depuis l'API Deezer, aucune base de données.
// Volontairement sans persistance : rien à peupler, rien qui puisse être "pas encore prêt".
//
// Les sources (playlists éditoriales par époque/style, listes d'artistes par scène, région
// ou artiste unique) vivent dans lib/themeSources.ts — une seule curation partagée avec
// les pochettes de thème.
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
      429974992, 700948842, 2570360062, 1718052197, 562148732, 1084245712, 429975052, 1389360732, 1593201331, 2004821007,
      // Jul
      3689236742, 378114151, 75867424, 701987352, 519797762, 3330198511, 994675552,
      // Tiakola
      4059400101, 2964716561, 3000573551, 1759430967, 1481109202,
      // Oboy
      708702202, 3450361821, 453609962, 2977780751, 453609952,
    ],
  },
  // MMZ : la page Deezer du groupe (id 1002485) est contaminée par les titres de MGMT
  // (« Kids », « Little Dark Age »…) dans son top. Liste figée depuis leurs vrais albums
  // (Tout pour le gang, N'DA, Trop N'DA, Sayonara1), triée par popularité, le 05/11/2026.
  "artist-mmz": {
    trackIds: [
      133517142, 133517134, 133517146, 426217282, 654209982, 133517124, 426217372, 654209852, 133517122, 426217322,
      654209882, 133517126, 654209862, 654209872, 654209972, 654210012, 426217302, 426217352, 654209912, 133517138,
      654209892, 654210002, 133517120, 514874182, 654209942, 133517128, 426217432, 133517148, 514874172, 654209952,
      426217292, 514874162, 133517130, 654209902, 654209962, 426217312, 133517132, 654209922, 133517136,
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
// GET /api/blindtest/pool?theme=mix|90s|2000s|2010s|recent|pop|cloud|hardcore|drill|trap|boombap|melodique|conscient|93|91|92|77|78|13|59|idf|artist-*&count=15
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const themeId = searchParams.get("theme") ?? "mix";
  const count = Math.min(Math.max(Number(searchParams.get("count")) || 15, 1), 50);

  try {
    let raw: DeezerTrackSummary[] = [];

    // Blind test personnalisé : liste d'IDs Deezer choisie par la personne (constructeur).
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const ids = idsParam.split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 40);
      const detailed = await Promise.all(ids.map((id) => fetchTrackDetail(id)));
      const ordered = detailed.filter((t): t is NonNullable<typeof t> => !!t && !!t.preview).map(toGameTrack).filter(isPlayableTrack);
      const shuffle = searchParams.get("order") !== "keep";
      const tracks = (shuffle ? [...ordered].sort(() => Math.random() - 0.5) : ordered).slice(0, count);
      return NextResponse.json({ tracks });
    }

    // Gimmicks / mèmes : les clips maison tiennent lieu d'extraits. Même forme qu'un titre
    // Deezer (le moteur ne voit pas la différence), photo de l'artiste en pochette.
    if (isSoundbiteTheme(themeId)) {
      const bites = [...soundbitesFor(themeId)].sort(() => Math.random() - 0.5).slice(0, count);
      const artists = [...new Set(bites.map((b) => b.artist))];
      const photos = new Map<string, string | null>();
      await Promise.all(artists.map(async (a) => photos.set(a, (await resolveArtist(a).catch(() => null))?.picture_medium ?? null)));
      const tracks = bites.map((b, i) => ({
        id: `bite-${b.id}`,
        title: b.label,
        artistName: b.artist,
        unplayable: false,
        previewUrl: `/audio/gimmicks/${b.id}.mp3`,
        coverUrl: photos.get(b.artist) ?? null,
        feats: [] as string[],
      }));
      return NextResponse.json({ tracks });
    }

    const artistListsById = THEME_ARTISTS;

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
        })
        .filter(isPlayableTrack);
      return NextResponse.json({ tracks });
    }

    if (THEME_PLAYLISTS[themeId] && themeId !== "90s" && themeId !== "2000s" && themeId !== "2010s" && themeId !== "recent") {
      const lists = await Promise.all(THEME_PLAYLISTS[themeId].map(fetchPlaylistTracks));
      raw = lists.flat();
    } else if (themeId.startsWith("classics-") && artistListsById[themeId]) {
      // Classiques : les titres d'albums sortis il y a 5 ans ou plus, les plus écoutés
      // d'abord. Pas de nouveautés, pas de single de la semaine — ce qui a fait l'artiste.
      const artist = await resolveArtist(artistListsById[themeId][0]);
      if (artist) {
        const cutoff = new Date(Date.now() - 5 * 365 * 86_400_000).toISOString().slice(0, 10);
        const albums = await deezerFetch<{ data?: { id: number; release_date?: string; record_type?: string }[] }>(`/artist/${artist.id}/albums?limit=60`);
        const old = (albums.data ?? [])
          .filter((a) => (a.release_date ?? "9999") <= cutoff && (a.record_type === "album" || a.record_type === "ep" || a.record_type === "single"))
          .slice(0, 14);
        const lists = await Promise.all(old.map((a) => deezerFetch(`/album/${a.id}/tracks?limit=25`).then((r) => r.data ?? []).catch(() => [])));
        const seenTitle = new Set<string>();
        const all = lists.flat().filter((t) => t.preview && (!t.artist?.name || t.artist.name.toLowerCase() === artist.name.toLowerCase()));
        const dedup = all.filter((t) => { const k = t.title.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").trim(); if (seenTitle.has(k)) return false; seenTitle.add(k); return true; });
        raw = dedup.sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0)).slice(0, 40);
      }
    } else if (artistListsById[themeId]) {
      // Thèmes à liste d'artistes (départements, régions, styles) : chaque artiste pèse
      // pareil. On tire en tourniquet, artiste par artiste, au lieu de piocher au hasard
      // dans la pile — sinon ceux qui ont le plus de titres (ou dont l'appel a réussi)
      // trustent la partie (« que Maes et Diddi Trix dans le 93 »). Un appel raté est retenté.
      const names = artistListsById[themeId];
      const lists = await Promise.all(names.map(async (n) => {
        const first = await fetchArtistTopTracks(n);
        return first.length ? first : fetchArtistTopTracks(n);
      }));
      const perArtist = lists.map((l) => [...l.filter((t) => t.preview)].sort(() => Math.random() - 0.5)).filter((l) => l.length);
      const picked: DeezerTrackSummary[] = [];
      const seen = new Set<number>();
      for (let round = 0; picked.length < count * 2 && perArtist.some((l) => l.length > round); round++) {
        for (const l of perArtist.sort(() => Math.random() - 0.5)) {
          const t = l[round];
          if (t && !seen.has(t.id)) { seen.add(t.id); picked.push(t); }
        }
      }
      raw = picked;
    } else if (themeId === "sorties") {
      // Sorti cette semaine : la playlist éditoriale « nouveautés rap FR », triée par date
      // d'ajout, fenêtre de 15 jours (élargie si trop maigre). Le thème se renouvelle seul.
      const list = (await fetchPlaylistTracks(THEME_PLAYLISTS.recent[0])).filter((t) => t.preview);
      const sorted = [...list].sort((a, b) => (b.time_add ?? 0) - (a.time_add ?? 0));
      const now = Date.now() / 1000;
      let fresh = sorted.filter((t) => (t.time_add ?? 0) >= now - 15 * 86_400);
      if (fresh.length < 10) fresh = sorted.filter((t) => (t.time_add ?? 0) >= now - 30 * 86_400);
      if (fresh.length < 10) fresh = sorted.slice(0, 25);
      raw = fresh;
    } else if (themeId === "pop") {
      const lists = await Promise.all(ALL_DECADE_PLAYLISTS.map(fetchPlaylistTracks));
      raw = lists.flat().sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
    } else if (themeId === "mix") {
      const lists = await Promise.all(ALL_DECADE_PLAYLISTS.map(fetchPlaylistTracks));
      raw = lists.flat();
    } else {
      const ids = THEME_PLAYLISTS[themeId] ?? ALL_DECADE_PLAYLISTS;
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
      .filter(isPlayableTrack);

    if (tracks.length < 3) {
      // Diagnostic renvoyé au client (affiché dans l'erreur de lancement) : on sait d'où ça vient.
      const reason = raw.length === 0 ? "Deezer n'a renvoyé aucun titre (quota ou indisponibilité)" : withPreview.length < 3 ? `${raw.length} titres mais ${withPreview.length} avec extrait audio` : `${shuffled.length} tirés, ${tracks.length} jouables`;
      console.error("[blindtest/pool] pool insuffisant —", themeId, reason);
      return NextResponse.json({ tracks, reason }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ tracks });
  } catch (err) {
    console.error("[blindtest/pool] erreur —", err instanceof Error ? err.message : err);
    return NextResponse.json({ tracks: [], reason: err instanceof Error ? err.message : "erreur" }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
