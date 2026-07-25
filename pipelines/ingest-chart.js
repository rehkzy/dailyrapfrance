// Pipeline d'ingestion du chart hebdomadaire → Supabase (via Prisma).
// Lancé chaque semaine par .github/workflows/ingest-chart.yml (gratuit, GitHub Actions).
//
// Source : la playlist Deezer "Rapstars 2020" (id 9563400362, tenue par l'éditrice Rap & R&B
// France de Deezer) — PAS "Rapstars" (id 3272614282, la compilation toutes époques, qui mélange
// des titres 90s/2000s avec l'actualité — repéré après retour utilisateur : trop de titres
// 2017/2020 remontaient). "Rapstars 2020" reste scopée à la décennie en cours. PAS non plus
// /chart/116 (Rap/Hip Hop) : Deezer géolocalise ses endpoints de genre/chart par IP, et un run
// GitHub Actions ne part pas d'une IP française.

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const RAPSTARS_PLAYLIST_ID = 9563400362;
const CHART_LIMIT = 100;

// Deezer renvoie parfois ses erreurs dans le corps JSON avec un statut HTTP 200 (voir
// https://developers.deezer.com/api — table des codes d'erreur). QUOTA (code 4) est retryable
// avec un backoff ; les autres erreurs sont fatales pour cet appel.
async function deezerFetch(path, retries = 3) {
  const res = await fetch(`https://api.deezer.com${path}`);
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

function normalize(str) {
  return (str ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Semaine ISO courante, format "AAAA-Sxx" — cohérent avec l'exemple du schéma Prisma.
function currentIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-S${String(week).padStart(2, "0")}`;
}

async function main() {
  console.log(`Ingestion chart — playlist Rapstars 2020 (${RAPSTARS_PLAYLIST_ID})\n`);

  const chart = await deezerFetch(`/playlist/${RAPSTARS_PLAYLIST_ID}/tracks?limit=${CHART_LIMIT}`);
  const tracks = chart.data ?? [];
  console.log(`  ${tracks.length} titres reçus depuis Deezer`);

  // Roster d'artistes suivis — on ne classe que ce qu'on suit déjà (idem certifications).
  const artists = await prisma.artist.findMany({ select: { id: true, name: true, deezerId: true, aliases: true } });
  const byDeezerId = new Map(artists.filter((a) => a.deezerId).map((a) => [a.deezerId, a]));
  const byName = new Map();
  for (const a of artists) {
    byName.set(normalize(a.name), a);
    for (const alias of a.aliases ?? []) byName.set(normalize(alias), a);
  }

  // Un artiste peut apparaître plusieurs fois (plusieurs titres classés) : on ne garde que
  // son meilleur (plus petit) rang Deezer.
  const bestRankByArtist = new Map();
  const bestReleaseByArtist = new Map();
  tracks.forEach((track, index) => {
    const rank = index + 1;
    const deezerArtistId = String(track.artist?.id ?? "");
    const matched = byDeezerId.get(deezerArtistId) || byName.get(normalize(track.artist?.name));
    if (!matched) return;
    if (!bestRankByArtist.has(matched.id) || rank < bestRankByArtist.get(matched.id)) {
      bestRankByArtist.set(matched.id, rank);
      bestReleaseByArtist.set(matched.id, track.album?.title ?? null);
    }
  });

  if (bestRankByArtist.size === 0) {
    console.log("  ⚠ Aucun artiste suivi trouvé dans ce chart — rien à enregistrer.");
    return;
  }

  const periodKey = currentIsoWeekKey();
  const ranked = [...bestRankByArtist.entries()].sort((a, b) => a[1] - b[1]);

  let saved = 0;
  for (let i = 0; i < ranked.length; i++) {
    const [artistId] = ranked[i];
    const position = i + 1; // repositionné 1..N parmi les seuls artistes suivis
    const albumTitle = bestReleaseByArtist.get(artistId);

    let releaseId = null;
    if (albumTitle) {
      const release = await prisma.release.findFirst({
        where: { title: { equals: albumTitle, mode: "insensitive" }, artists: { some: { artistId } } },
        select: { id: true },
      });
      releaseId = release?.id ?? null;
    }

    await prisma.chartEntry.upsert({
      where: {
        chart_entry_natural_key: { chartType: "DRF_STREAMING", periodKey, artistId },
      },
      update: { position, releaseId },
      create: { chartType: "DRF_STREAMING", periodKey, artistId, position, releaseId },
    });
    saved++;
  }

  console.log(`\n  ✓ ${saved} entrée(s) de chart enregistrée(s) pour ${periodKey} (DRF_STREAMING)`);
}

main()
  .catch((err) => {
    console.error("Échec du pipeline :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
