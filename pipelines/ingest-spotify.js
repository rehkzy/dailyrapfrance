// Pipeline d'ingestion Deezer → Supabase (via Prisma).
// Lancé toutes les heures par .github/workflows/ingest-spotify.yml (gratuit, GitHub Actions).
//
// Pourquoi Deezer plutôt que Spotify : l'API Web Spotify exige désormais que le compte
// propriétaire de l'app ait un abonnement Premium actif pour les endpoints de recherche —
// une restriction imposée par Spotify, indépendante de ce code. L'API publique Deezer,
// elle, est gratuite et sans authentification, ce qui correspond à l'esprit "rien à payer"
// du projet (voir 00_MASTER_PROMPT.md, P7).

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SEED_ARTISTS = [
  "Gazo", "Tiakola", "Ninho", "SDM", "Luv Resval", "Josman", "Fresh la Peufra",
  "Chily", "Werenoi", "Leto", "Damso", "Naps", "Jul", "Alonzo", "Kaaris",
  "Freeze Corleone", "Zola", "Hamza", "Laylow", "Dinos",
];

async function deezerFetch(path) {
  const res = await fetch(`https://api.deezer.com${path}`);
  if (!res.ok) throw new Error(`Deezer ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ingestArtist(name) {
  const search = await deezerFetch(`/search/artist?q=${encodeURIComponent(name)}&limit=1`);
  const item = search.data?.[0];
  if (!item) {
    console.log(`  ⚠ Introuvable sur Deezer : ${name}`);
    return null;
  }

  const artist = await prisma.artist.upsert({
    where: { deezerId: String(item.id) },
    update: {
      name: item.name,
      photoUrl: item.picture_xl || item.picture_big || null,
      status: "STANDARD",
    },
    create: {
      slug: slugify(item.name),
      name: item.name,
      deezerId: String(item.id),
      photoUrl: item.picture_xl || item.picture_big || null,
      status: "STANDARD",
      aliases: [],
    },
  });

  // Signal temporel : fans Deezer (vraie métrique publique, pas d'auditeurs mensuels
  // inventés — Deezer, comme Spotify, ne rend pas cette donnée publique).
  await prisma.socialStat.create({
    data: {
      artistId: artist.id,
      source: "DEEZER",
      followers: BigInt(item.nb_fan ?? 0),
      monthlyListeners: BigInt(0), // pas de score de popularité équivalent chez Deezer
    },
  });

  console.log(`  ✓ ${item.name} — ${item.nb_fan?.toLocaleString("fr-FR")} fans Deezer`);

  // Sorties récentes
  const albums = await deezerFetch(`/artist/${item.id}/albums?limit=8`);
  for (const a of albums.data ?? []) {
    await prisma.release.upsert({
      where: { deezerId: String(a.id) },
      update: { title: a.title, coverUrl: a.cover_xl || a.cover_big || null },
      create: {
        slug: slugify(`${item.name}-${a.title}`),
        title: a.title,
        type: a.record_type === "single" ? "SINGLE" : "ALBUM",
        status: "RELEASED",
        releaseDate: a.release_date ? new Date(a.release_date) : null,
        deezerId: String(a.id),
        coverUrl: a.cover_xl || a.cover_big || null,
        artists: { create: { artistId: artist.id, role: "MAIN" } },
      },
    });
  }

  return artist;
}

async function main() {
  console.log(`Ingestion Deezer — ${SEED_ARTISTS.length} artistes ciblés\n`);
  for (const name of SEED_ARTISTS) {
    try {
      await ingestArtist(name);
    } catch (err) {
      console.error(`  ✗ Erreur sur ${name} :`, err.message);
    }
  }
  console.log("\nTerminé.");
}

main()
  .catch((err) => {
    console.error("Échec du pipeline :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
