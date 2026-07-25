import { prisma } from "./prisma";

// Toutes les fonctions renvoient [] / null si la base est encore vide (avant la première
// ingestion) — les pages gèrent cet état vide proprement, pas de crash.
//
// ⚠️ Important pour le déploiement : ces fonctions sont aussi appelées pendant `next build`
// (génération statique des pages). Si `DATABASE_URL` n'est pas encore configurée sur Vercel,
// ou si les tables n'ont pas encore été créées (`prisma db push`), une requête Prisma qui
// lève une exception ferait planter TOUT le build → déploiement en échec. Chaque fonction
// est donc protégée par un try/catch qui journalise l'erreur et renvoie la valeur de repli
// à la place — exactement comme le cas "base vide" ci-dessus, la page ne voit aucune différence.
const hasDb = Boolean(process.env.DATABASE_URL);

function logDbError(err: unknown) {
  console.error(
    "[queries] Base de données indisponible, réponse de repli utilisée —",
    err instanceof Error ? err.message : err
  );
}

function latestStat(artist: { socialStats: { followers: bigint | null; monthlyListeners: bigint | null }[] }) {
  const s = artist.socialStats[0];
  return {
    followers: s ? Number(s.followers ?? 0) : 0,
    // Le champ `monthlyListeners` stocke en réalité le score de popularité Spotify (0-100) —
    // Spotify ne fournit pas les vrais auditeurs mensuels via son API publique.
    popularity: s ? Number(s.monthlyListeners ?? 0) : 0,
  };
}

export async function getArtists() {
  if (!hasDb) return [];
  try {
    const artists = await prisma.artist.findMany({
      include: { socialStats: { orderBy: { capturedAt: "desc" }, take: 1 } },
    });
    return artists
      .map((a) => ({
        slug: a.slug,
        name: a.name,
        city: a.city,
        photoUrl: a.photoUrl,
        ...latestStat(a),
      }))
      .sort((a, b) => b.followers - a.followers);
  } catch (err) {
    logDbError(err);
    return [];
  }
}

export async function getTopByPopularity(limit = 5) {
  const artists = await getArtists();
  return artists
    .slice()
    .sort((a, b) => b.followers - a.followers)
    .slice(0, limit)
    .map((a, i) => ({ rank: i + 1, slug: a.slug, name: a.name, score: a.followers }));
}

export async function getArtistBySlug(slug: string) {
  if (!hasDb) return null;
  try {
    const artist = await prisma.artist.findUnique({
      where: { slug },
      include: {
        socialStats: { orderBy: { capturedAt: "desc" }, take: 1 },
        releases: { include: { release: true } },
        label: true,
      },
    });
    if (!artist) return null;
    return {
      slug: artist.slug,
      name: artist.name,
      city: artist.city,
      label: artist.label?.name ?? null,
      photoUrl: artist.photoUrl,
      ...latestStat(artist),
      releases: artist.releases
        .map((ra) => ra.release)
        .sort((a, b) => (b.releaseDate?.getTime() ?? 0) - (a.releaseDate?.getTime() ?? 0)),
    };
  } catch (err) {
    logDbError(err);
    return null;
  }
}

export async function getReleases() {
  if (!hasDb) return [];
  try {
    const releases = await prisma.release.findMany({
      include: { artists: { include: { artist: true } } },
      orderBy: { releaseDate: "desc" },
    });
    return releases.map((r) => ({
      slug: r.slug,
      title: r.title,
      type: r.type,
      status: r.status,
      date: r.releaseDate,
      coverUrl: r.coverUrl,
      artistName: r.artists.find((a) => a.role === "MAIN")?.artist.name ?? r.artists[0]?.artist.name ?? "",
      artistSlug: r.artists.find((a) => a.role === "MAIN")?.artist.slug ?? r.artists[0]?.artist.slug ?? "",
    }));
  } catch (err) {
    logDbError(err);
    return [];
  }
}

export async function getReleaseBySlug(slug: string) {
  if (!hasDb) return null;
  try {
    const release = await prisma.release.findUnique({
      where: { slug },
      include: { artists: { include: { artist: true } }, tracks: true },
    });
    if (!release) return null;
    return {
      slug: release.slug,
      title: release.title,
      type: release.type,
      status: release.status,
      date: release.releaseDate,
      coverUrl: release.coverUrl,
      artistName: release.artists[0]?.artist.name ?? "",
      artistSlug: release.artists[0]?.artist.slug ?? "",
      tracks: release.tracks.map((t) => ({
        title: t.title,
        duration: t.durationSec ? `${Math.floor(t.durationSec / 60)}:${String(t.durationSec % 60).padStart(2, "0")}` : "—",
      })),
    };
  } catch (err) {
    logDbError(err);
    return null;
  }
}

export async function getNews(limit = 20) {
  if (!hasDb) return [];
  try {
    const items = await prisma.newsItem.findMany({
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
    return items.map((n) => ({
      title: n.title,
      link: n.link,
      source: n.source,
      date: n.publishedAt ?? n.createdAt,
    }));
  } catch (err) {
    logDbError(err);
    return [];
  }
}
