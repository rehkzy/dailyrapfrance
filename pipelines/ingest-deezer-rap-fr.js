// Ingestion "profonde" Deezer — toutes les stats disponibles, scopées rap/hip-hop France
// ET récentes (voir MAX_AGE_YEARS plus bas).
//
// Pourquoi la playlist "Rapstars 2020" (id 9563400362) plutôt que "Rapstars" (id 3272614282) :
// la playlist "Rapstars" est une compilation toutes époques ("toutes les stars du rap
// français"), qui mélange des classiques 90s/2000s avec l'actualité — repéré après retour
// utilisateur : trop de titres 2017/2020 remontaient. "Rapstars 2020" reste scopée à la
// décennie en cours. Le filtre MAX_AGE_YEARS ci-dessous écarte en plus tout titre dont
// l'album a plus de quelques années, pour ne garder que de l'actualité.
//
// Pourquoi pas /chart/116 (Rap/Hip Hop) : Deezer documente que ses endpoints de chart/genre
// sont "geolocalised by country" — c'est-à-dire déduits de l'IP de la requête. Un run GitHub
// Actions ne part pas d'une IP française, donc ce chart n'est pas fiablement "France". Une
// playlist a un ID fixe, indépendant de la géolocalisation. Lancé une fois par mois par
// .github/workflows/ingest-deezer-deep.yml (un appel par titre, donc plus lourd que
// ingest-chart.js — pas besoin de le lancer chaque semaine).
//
// Ce que ce script capture, PAR TITRE (endpoint /track/{id}) :
//   rank (popularité Deezer), isrc, bpm, gain (loudness), explicit_lyrics, durée.
// PAR ALBUM (endpoint /album/{id}, un seul appel par album grâce à un cache en mémoire) :
//   fans, explicit_lyrics, nb_tracks, label.
// PAR ARTISTE :
//   nb_fan (déjà couvert par SocialStat), et création automatique (SKELETON) des artistes
//   nouveaux rencontrés sur cette playlist — légitime ici car la source est éditoriale et déjà
//   scopée rap FR, contrairement à une recherche générique.
// GRAPHE RELATIONNEL — la vraie donnée, plus le mock :
//   chaque titre à plusieurs artistes crédités devient des lignes Credit (PERFORMER pour
//   l'artiste principal, FEATURED pour les autres). Deezer ne fournit PAS de rôle producteur/
//   auteur — uniquement la liste des artistes crédités sur le titre.

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const RAPSTARS_PLAYLIST_ID = 9563400362;
const MAX_TRACKS = 400; // plafond par run, pour rester raisonnable en durée/quota
const MAX_AGE_YEARS = 3; // on ignore les albums sortis avant ça — "récent" demandé explicitement
const REQUEST_DELAY_MS = 130; // ~7-8 req/s, prudent — l'API publique Deezer n'a pas de doc de rate-limit stricte

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Deezer renvoie parfois ses erreurs dans le corps JSON avec un statut HTTP 200 (voir
// https://developers.deezer.com/api — table des codes d'erreur). QUOTA (code 4) est retryable
// avec un backoff ; les autres erreurs sont fatales pour cet appel.
async function deezerFetch(path, retries = 3) {
  const url = path.startsWith("http") ? path : `https://api.deezer.com${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deezer ${path} → HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json && json.error) {
    if (json.error.code === 4 && retries > 0) {
      await sleep(2000);
      return deezerFetch(path, retries - 1);
    }
    throw new Error(`Deezer ${path} → erreur ${json.error.code} (${json.error.type}) : ${json.error.message}`);
  }
  await sleep(REQUEST_DELAY_MS);
  return json;
}

function slugify(name) {
  return (name ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isRecentEnough(date) {
  if (!date) return true; // pas de date connue → on ne filtre pas par excès de prudence
  const ageMs = Date.now() - new Date(date).getTime();
  return ageMs <= MAX_AGE_YEARS * 365 * 86400 * 1000;
}

async function fetchAllPlaylistTracks(playlistId, max) {
  const tracks = [];
  let path = `/playlist/${playlistId}/tracks?limit=100`;
  while (path && tracks.length < max) {
    const page = await deezerFetch(path);
    tracks.push(...(page.data ?? []));
    path = page.next ?? null;
  }
  return tracks.slice(0, max);
}

async function upsertArtistFromDeezer(deezerArtistSummary) {
  // Récupère la fiche complète (nb_fan, photo) plutôt que le résumé embarqué dans le titre.
  const full = await deezerFetch(`/artist/${deezerArtistSummary.id}`);
  const artist = await prisma.artist.upsert({
    where: { deezerId: String(full.id) },
    update: {
      name: full.name,
      photoUrl: full.picture_xl || full.picture_big || null,
    },
    create: {
      slug: slugify(full.name),
      name: full.name,
      deezerId: String(full.id),
      photoUrl: full.picture_xl || full.picture_big || null,
      status: "SKELETON", // créé depuis une source éditoriale rap FR — enrichi ensuite par ingest-spotify.js
      aliases: [],
    },
  });

  await prisma.socialStat.create({
    data: { artistId: artist.id, source: "DEEZER", followers: BigInt(full.nb_fan ?? 0), monthlyListeners: BigInt(0) },
  });

  return artist;
}

async function main() {
  console.log(`Ingestion profonde Deezer — playlist Rapstars 2020 (${RAPSTARS_PLAYLIST_ID}), max ${MAX_AGE_YEARS} ans\n`);

  const tracks = await fetchAllPlaylistTracks(RAPSTARS_PLAYLIST_ID, MAX_TRACKS);
  console.log(`  ${tracks.length} titres à traiter (plafond ${MAX_TRACKS})\n`);

  const artistCache = new Map(); // deezerArtistId -> Artist (base de données)
  const albumCache = new Map();  // deezerAlbumId -> Release (base de données)

  let tracksSaved = 0;
  let tracksTooOld = 0;
  let creditsSaved = 0;
  let artistsCreated = 0;

  for (const summary of tracks) {
    try {
      const trackFull = await deezerFetch(`/track/${summary.id}`);

      // Artiste principal
      const mainDeezerId = String(trackFull.artist.id);
      let mainArtist = artistCache.get(mainDeezerId);
      if (!mainArtist) {
        const existing = await prisma.artist.findUnique({ where: { deezerId: mainDeezerId } });
        mainArtist = existing ?? (await upsertArtistFromDeezer(trackFull.artist));
        if (!existing) artistsCreated++;
        artistCache.set(mainDeezerId, mainArtist);
      }

      // Album — un seul appel /album/{id} par album grâce au cache
      const deezerAlbumId = String(trackFull.album.id);
      let release = albumCache.get(deezerAlbumId);
      if (!release) {
        const existing = await prisma.release.findUnique({ where: { deezerId: deezerAlbumId } });
        if (existing) {
          release = existing;
        } else {
          const albumFull = await deezerFetch(`/album/${deezerAlbumId}`);
          release = await prisma.release.create({
            data: {
              slug: slugify(`${mainArtist.name}-${albumFull.title}`),
              title: albumFull.title,
              type: albumFull.record_type === "single" ? "SINGLE" : "ALBUM",
              status: "RELEASED",
              releaseDate: albumFull.release_date ? new Date(albumFull.release_date) : null,
              coverUrl: albumFull.cover_xl || albumFull.cover_big || null,
              deezerId: deezerAlbumId,
              fans: albumFull.fans != null ? BigInt(albumFull.fans) : null,
              explicit: albumFull.explicit_lyrics ?? null,
              artists: { create: { artistId: mainArtist.id, role: "MAIN" } },
            },
          });
        }
        albumCache.set(deezerAlbumId, release);
      }

      if (!isRecentEnough(release.releaseDate)) {
        tracksTooOld++;
        continue;
      }

      // Titre — toutes les stats publiques disponibles
      const track = await prisma.track.upsert({
        where: { deezerId: String(trackFull.id) },
        update: {
          title: trackFull.title,
          durationSec: trackFull.duration ?? null,
          deezerRank: trackFull.rank ?? null,
          isrc: trackFull.isrc ?? undefined, // undefined = ne touche pas au champ si absent (unique)
          explicit: trackFull.explicit_lyrics ?? null,
          bpm: trackFull.bpm || null,
          gain: trackFull.gain ?? null,
        },
        create: {
          slug: slugify(`${mainArtist.name}-${trackFull.title}-${trackFull.id}`),
          title: trackFull.title,
          releaseId: release.id,
          trackNumber: trackFull.track_position ?? null,
          durationSec: trackFull.duration ?? null,
          deezerId: String(trackFull.id),
          isrc: trackFull.isrc ?? null,
          deezerRank: trackFull.rank ?? null,
          explicit: trackFull.explicit_lyrics ?? null,
          bpm: trackFull.bpm || null,
          gain: trackFull.gain ?? null,
        },
      });
      tracksSaved++;

      // Graphe relationnel réel : un Credit par artiste crédité sur le titre.
      const contributors = trackFull.contributors?.length ? trackFull.contributors : [trackFull.artist];
      for (const contributor of contributors) {
        const contribDeezerId = String(contributor.id);
        let contribArtist = artistCache.get(contribDeezerId);
        if (!contribArtist) {
          const existing = await prisma.artist.findUnique({ where: { deezerId: contribDeezerId } });
          contribArtist = existing ?? (await upsertArtistFromDeezer(contributor));
          if (!existing) artistsCreated++;
          artistCache.set(contribDeezerId, contribArtist);
        }

        const role = contribDeezerId === mainDeezerId ? "PERFORMER" : "FEATURED";
        await prisma.credit.upsert({
          where: { trackId_artistId_role: { trackId: track.id, artistId: contribArtist.id, role } },
          update: {},
          create: { trackId: track.id, artistId: contribArtist.id, role },
        });
        creditsSaved++;
      }

      process.stdout.write(`  ✓ ${trackFull.artist.name} — ${trackFull.title}\n`);
    } catch (err) {
      console.error(`  ✗ Erreur sur le titre ${summary.id} (${summary.title ?? "?"}) :`, err.message);
    }
  }

  console.log(`\nTerminé — ${tracksSaved} titre(s), ${creditsSaved} crédit(s), ${artistsCreated} nouvel(aux) artiste(s), ${tracksTooOld} écarté(s) car trop ancien(s) (> ${MAX_AGE_YEARS} ans).`);
}

main()
  .catch((err) => {
    console.error("Échec du pipeline :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
