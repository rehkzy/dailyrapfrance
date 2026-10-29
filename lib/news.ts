/*
 * Actu rap / musique urbaine — agrégée depuis les flux RSS des médias spécialisés.
 * Pas de base à remplir : on lit les flux (cache 30 min), on garde les 30 plus récents,
 * chaque titre renvoie vers l'article d'origine (source créditée).
 * Pour changer les sources sans toucher au code : NEWS_FEEDS="Nom|https://…/feed,Nom|…".
 */
export type NewsItem = { title: string; link: string; source: string; date: string | null; image: string | null };

const DEFAULT_FEEDS: { name: string; url: string }[] = [
  { name: "Booska-P", url: "https://www.booska-p.com/feed/" },
  { name: "Rap Élite", url: "https://www.rapelite.com/feed/" },
  { name: "Mouv'", url: "https://www.radiofrance.fr/mouv/rss" },
];

function feeds() {
  const env = process.env.NEWS_FEEDS;
  if (!env) return DEFAULT_FEEDS;
  return env.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const [name, url] = s.split("|");
    return { name: (name ?? "").trim(), url: (url ?? "").trim() };
  }).filter((f) => f.name && f.url);
}

function clean(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#8217;/g, "’").replace(/&#8216;/g, "‘").replace(/&#8230;/g, "…").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .trim();
}
function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? clean(m[1]) : null;
}
function image(block: string): string | null {
  const m =
    block.match(/<media:content[^>]+url="([^"]+)"/i) ||
    block.match(/<media:thumbnail[^>]+url="([^"]+)"/i) ||
    (/<enclosure[^>]+type="image/i.test(block) ? block.match(/<enclosure[^>]+url="([^"]+)"/i) : null) ||
    block.match(/<img[^>]+src="([^"]+)"/i);
  return m ? m[1].replace(/&amp;/g, "&") : null;
}

async function readFeed(f: { name: string; url: string }): Promise<NewsItem[]> {
  try {
    const res = await fetch(f.url, { next: { revalidate: 1800 }, headers: { "User-Agent": "Mozilla/5.0 (compatible; DailyRapFrance/1.0)" } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
    return items.slice(0, 15).map((b) => {
      const title = tag(b, "title") ?? "";
      const link = tag(b, "link") ?? (b.match(/<link[^>]+href="([^"]+)"/i)?.[1] ?? "");
      const dateRaw = tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated") ?? tag(b, "dc:date");
      const date = dateRaw && !Number.isNaN(Date.parse(dateRaw)) ? new Date(dateRaw).toISOString() : null;
      return { title, link, source: f.name, date, image: image(b) };
    }).filter((i) => i.title && i.link);
  } catch {
    return [];
  }
}

/* Certains flux (Booska-P) n'embarquent pas d'image : on va chercher l'og:image de l'article,
   en parallèle, avec un délai court — et le résultat est mis en cache avec le reste. */
async function ogImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 86400 }, headers: { "User-Agent": "Mozilla/5.0 (compatible; DailyRapFrance/1.0)" }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 120_000);
    const m = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export async function getNews(limit = 30): Promise<NewsItem[]> {
  const all = (await Promise.all(feeds().map(readFeed))).flat();
  const sorted = all.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, limit);
  await Promise.all(sorted.slice(0, 12).filter((i) => !i.image).map(async (i) => { i.image = await ogImage(i.link); }));
  return sorted;
}
