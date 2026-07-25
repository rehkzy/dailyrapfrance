// Pipeline d'ingestion Spotify → Supabase (via Prisma).
// Lancé toutes les heures par .github/workflows/ingest-spotify.yml (gratuit, GitHub Actions).
//
// Limite honnête : Spotify ne fournit pas les "auditeurs mensuels" via son API publique
// (donnée privée, réservée à l'artiste via Spotify for Artists). On stocke donc les
// `followers` (abonnés) et le `popularity` (score interne Spotify 0-100), pas un chiffre
// inventé.

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Liste de départ — à faire grandir au fil du temps. Le pipeline peut être relancé
// avec une liste plus longue sans dupliquer les entrées existantes (upsert par spotifyId).
const SEED_ARTISTS = [
  "Gazo", "Tiakola", "Ninho", "SDM", "Luv Resval", "Josman", "Fresh la Peufra",
  "Chily", "Werenoi", "Leto", "Damso", "Naps", "Jul", "Alonzo", "Kaaris",
  "Freeze Corleone", "Zola", "Hamza", "Laylow", "Dinos",
];

let cachedToken = null;

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET manquants.");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Auth Spotify échouée : ${res.status} ${await res.text()}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

async function spotifyFetch(path) {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify ${path} → ${res.status} ${await res.text()}`);
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
  const search = await spotifyFetch(`/search?q=${encodeURIComponent(name)}&type=artist&market=FR&limit=1`);
  const item = search.artists?.items?.[0];
  if (!item) {
    console.log(`  ⚠ Introuvable sur Spotify : ${name}`);
    return null;
  }

  const artist = await prisma.artist.upsert({
    where: { spotifyId: item.id },
    update: {
      name: item.name,
      photoUrl: item.images?.[0]?.url ?? null,
      status: "STANDARD",
    },
    create: {
      slug: slugify(item.name),
      name: item.name,
      spotifyId: item.id,
      photoUrl: item.images?.[0]?.url ?? null,
      status: "STANDARD",
      aliases: [],
    },
  });

  // Signal temporel : followers + popularité (les vraies métriques publiques Spotify)
  await prisma.socialStat.create({
    data: {
      artistId: artist.id,
      source: "SPOTIFY",
      followers: BigInt(item.followers?.total ?? 0),
      // On réutilise le champ monthlyListeners pour stocker le score de popularité (0-100)
      // en attendant une vraie source d'auditeurs mensuels (ex: Chartmetric payant).
      monthlyListeners: BigInt(item.popularity ?? 0),
    },
  });

  console.log(`  ✓ ${item.name} — ${item.followers?.total?.toLocaleString("fr-FR")} abonnés, popularité ${item.popularity}`);

  // Sorties récentes (albums + singles)
  const albums = await spotifyFetch(`/artists/${item.id}/albums?include_groups=album,single&market=FR&limit=8`);
  for (const a of albums.items ?? []) {
    const releaseDate =
      a.release_date_precision === "day" ? new Date(a.release_date) : new Date(`${a.release_date}-01-01`);

    await prisma.release.upsert({
      where: { spotifyId: a.id },
      update: { title: a.name, coverUrl: a.images?.[0]?.url ?? null },
      create: {
        slug: slugify(`${item.name}-${a.name}`),
        title: a.name,
        type: a.album_type === "single" ? "SINGLE" : "ALBUM",
        status: "RELEASED",
        releaseDate,
        spotifyId: a.id,
        coverUrl: a.images?.[0]?.url ?? null,
        artists: { create: { artistId: artist.id, role: "MAIN" } },
      },
    });
  }

  return artist;
}

async function main() {
  console.log(`Ingestion Spotify — ${SEED_ARTISTS.length} artistes ciblés\n`);
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
