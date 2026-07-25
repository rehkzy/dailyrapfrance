// Ingestion du pool de titres pour le Blind Test — voir app/blindtest.
//
// Sources : les playlists éditoriales Deezer par décennie, tenues par l'éditrice Rap & R&B
// France de Deezer. Contrairement à ingest-deezer-rap-fr.js, PAS de filtre de fraîcheur ici —
// le blind test a justement besoin de vieux titres pour le thème "à l'ancienne".
//
// Pas d'appel /track/{id} ni /album/{id} : l'objet titre déjà renvoyé par
// /playlist/{id}/tracks contient tout ce qu'il faut (titre, artiste, preview 30s, pochette,
// rank) — ce pipeline est donc rapide, pas besoin du throttle utilisé par le pipeline profond.
//
// ⚠️ Thèmes "cloud" / "dept-93" / "dept-91" : Deezer ne fournit ni sous-genre ni ville de
// naissance via son API publique. Les listes ci-dessous sont une curation manuelle, volontai-
// rement courte et limitée à des cas bien documentés — à compléter vous-même si besoin (ce
// n'est PAS une base de données géographique ou de genre faisant autorité).

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SOURCES = [
  { playlistId: 1182010551, era: "NINETIES" },      // Rapstars '90s
  { playlistId: 4676814864, era: "TWO_THOUSANDS" },  // Rapstars 2000
  { playlistId: 5175061384, era: "TWENTY_TENS" },    // Rapstars 2010
  { playlistId: 9563400362, era: "RECENT" },         // Rapstars 2020
];

// Curation manuelle, à vérifier/étendre — voir avertissement en tête de fichier.
const CLOUD_ARTISTS = ["suikoden", "josman", "fixpen sill", "le wombat", "lomepal"];
const DEPT_93_ARTISTS = ["kaaris", "gradur", "mac tyer", "alkpote"];
const DEPT_91_ARTISTS = ["pnl", "sdm", "kalash criminel"];

function normalize(str) {
  return (str ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function deezerFetch(path, retries = 3) {
  const url = path.startsWith("http") ? path : `https://api.deezer.com${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deezer ${path} → HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json && json.error) {
    if (json.error.code === 4 && retries > 0) {
      await new Promise((r) => setTimeout(r, 2000));
      return deezerFetch(path, retries - 1);
    }
    throw new Error(`Deezer ${path} → erreur ${json.error.code} (${json.error.type}) : ${json.error.message}`);
  }
  return json;
}

async function fetchAllPlaylistTracks(playlistId) {
  const tracks = [];
  let path = `/playlist/${playlistId}/tracks?limit=100`;
  while (path) {
    const page = await deezerFetch(path);
    tracks.push(...(page.data ?? []));
    path = page.next ?? null;
  }
  return tracks;
}

function computeThemes(artistName) {
  const n = normalize(artistName);
  const themes = [];
  if (CLOUD_ARTISTS.includes(n)) themes.push("cloud");
  if (DEPT_93_ARTISTS.includes(n)) themes.push("dept-93");
  if (DEPT_91_ARTISTS.includes(n)) themes.push("dept-91");
  return themes;
}

async function main() {
  let saved = 0;
  let skippedNoPreview = 0;

  for (const source of SOURCES) {
    console.log(`\n${source.era} — playlist ${source.playlistId}`);
    const tracks = await fetchAllPlaylistTracks(source.playlistId);
    console.log(`  ${tracks.length} titres reçus`);

    for (const t of tracks) {
      if (!t.preview) {
        skippedNoPreview++;
        continue;
      }
      await prisma.blindTestTrack.upsert({
        where: { deezerId: String(t.id) },
        update: {
          title: t.title,
          artistName: t.artist?.name ?? "",
          previewUrl: t.preview,
          coverUrl: t.album?.cover_medium || t.album?.cover_big || null,
          rank: t.rank ?? null,
          themes: computeThemes(t.artist?.name),
        },
        create: {
          deezerId: String(t.id),
          title: t.title,
          artistName: t.artist?.name ?? "",
          previewUrl: t.preview,
          coverUrl: t.album?.cover_medium || t.album?.cover_big || null,
          era: source.era,
          rank: t.rank ?? null,
          themes: computeThemes(t.artist?.name),
        },
      });
      saved++;
    }
  }

  console.log(`\nTerminé — ${saved} titre(s) dans le pool, ${skippedNoPreview} ignoré(s) (pas de preview).`);
}

main()
  .catch((err) => {
    console.error("Échec du pipeline :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
