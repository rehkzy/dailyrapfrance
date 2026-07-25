// Pipeline d'ingestion actus — agrège des flux RSS publics de médias rap français.
// 100% légal (P6 du master prompt) : on ne republie que titre + lien vers l'original,
// jamais le contenu de l'article. Lancé toutes les 30 min par
// .github/workflows/ingest-news.yml.

const { PrismaClient } = require("@prisma/client");
const Parser = require("rss-parser");

const prisma = new PrismaClient();
const parser = new Parser({ timeout: 10000 });

// Flux RSS de médias rap FR — WordPress expose généralement /feed/ par défaut.
// Si un flux est down ou renommé, le pipeline continue avec les autres (pas de crash global).
const FEEDS = [
  { url: "https://www.booska-p.com/feed/", source: "Booska-P" },
  { url: "https://raplume.com/feed/", source: "Raplume" },
  { url: "https://rapelite.com/feed/", source: "Rap Elite" },
];

async function ingestFeed(feed) {
  const parsed = await parser.parseURL(feed.url);
  let count = 0;
  for (const item of parsed.items ?? []) {
    if (!item.link || !item.title) continue;
    await prisma.newsItem.upsert({
      where: { link: item.link },
      update: { title: item.title },
      create: {
        title: item.title,
        link: item.link,
        source: feed.source,
        publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      },
    });
    count++;
  }
  console.log(`  ✓ ${feed.source} — ${count} articles`);
}

async function main() {
  console.log(`Ingestion actus — ${FEEDS.length} flux RSS\n`);
  for (const feed of FEEDS) {
    try {
      await ingestFeed(feed);
    } catch (err) {
      console.error(`  ✗ Erreur sur ${feed.source} :`, err.message);
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
