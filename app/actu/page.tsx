import { Flame, Newspaper, Disc3, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BrandTile } from "@/components/BrandMark";
import { getTrending, getNewReleases } from "@/lib/trending";
import { getNews } from "@/lib/news";
import TrendingList from "@/components/TrendingList";
import NewsList from "@/components/NewsList";

const META: Record<string, { title: string; description: string }> = {
  tendances: { title: "Tendances rap français : les sons du moment — DailyRapFrance", description: "Le top des écoutes rap français et tout genre, mis à jour toutes les 30 minutes. Écoute les extraits, puis lance un blind test sur l'artiste." },
  sorties: { title: "Nouveautés rap français : les dernières sorties — DailyRapFrance", description: "Les derniers titres rap FR sortis, du plus récent au plus ancien, avec extraits. Teste-toi dessus en blind test." },
  actu: { title: "Actu rap français du jour — DailyRapFrance", description: "L'actualité du rap français et de la musique urbaine, en continu : sorties, clips, interviews, concerts, sélectionnés par DailyRapFrance." },
  dailyrap: { title: "DailyRap : nos derniers posts — DailyRapFrance", description: "Les derniers posts de DailyRapFrance : interviews, freestyles, découvertes, coulisses — Instagram, TikTok, YouTube." },
};
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const sp = await searchParams;
  const key = sp.onglet && META[sp.onglet] ? sp.onglet : "tendances";
  const m = META[key];
  const canonical = key === "tendances" ? "https://dailyrapfrance.best/actu" : `https://dailyrapfrance.best/actu?onglet=${key}`;
  return { title: m.title, description: m.description, alternates: { canonical }, openGraph: { title: m.title, description: m.description, url: canonical, type: "website" as const } };
}
export const revalidate = 1800;

const TABS = [
  { id: "tendances", label: "Tendances", Icon: Flame },
  { id: "sorties", label: "Sorties", Icon: Disc3 },
  { id: "actu", label: "Actu", Icon: Newspaper },
  { id: "dailyrap", label: "DailyRap", Icon: null },
] as const;
type Post = { id: string; title: string; url: string; image: string | null; kind: string; body: string | null; pinned: boolean; created_at: string };
const KIND_LABEL: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X", article: "Article" };
type Tab = (typeof TABS)[number]["id"];

/*
 * /actu — le côté média de DailyRapFrance, à côté du jeu. Trois onglets (liens, donc
 * partageables) : Tendances (rap / tout), Sorties, Actu. Chaque titre s'écoute sur place et
 * peut devenir un blind test en un tap.
 */
export default async function ActuPage({ searchParams }: { searchParams: Promise<{ onglet?: string; genre?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = (TABS.find((t) => t.id === sp.onglet)?.id ?? "tendances") as Tab;
  const genre = sp.genre === "tout" ? "tout" : "rap";

  const [tracks, releases, news, posts] = await Promise.all([
    tab === "tendances" ? getTrending(genre, 30) : Promise.resolve([]),
    tab === "sorties" ? getNewReleases(18) : Promise.resolve([]),
    tab === "actu" ? getNews(24) : Promise.resolve([]),
    tab === "dailyrap" ? (async () => { try { const sb = await createClient(); const { data } = await sb.from("media_posts").select("id,title,url,image,kind,body,pinned,created_at").eq("published", true).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(40); return (data ?? []) as Post[]; } catch { return [] as Post[]; } })() : Promise.resolve([] as Post[]),
  ]);

  return (
    <section className="max-w-2xl lg:max-w-4xl mx-auto px-5 sm:px-6 pt-8 sm:pt-14 pb-32">
      <p className="stage-kicker mb-2">Le média</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-2">Actu &amp; tendances</h1>
      <p className="text-ink-muted mb-5">Ce qui tourne en ce moment, les sorties, l&apos;actu — et un blind test dessus en un tap.</p>

      <nav className="segmented mb-5" aria-label="Rubriques">
        {TABS.map((t) => (
          <a key={t.id} href={`/actu?onglet=${t.id}`} aria-pressed={tab === t.id} className="inline-flex items-center justify-center gap-1.5">{t.Icon ? <t.Icon size={14} /> : <BrandTile size={14} />} {t.label}</a>
        ))}
      </nav>

      {tab === "tendances" && (
        <>
          <div className="flex items-center gap-2 mb-3">
            {[{ id: "rap", label: "Rap FR" }, { id: "tout", label: "Tout genre" }].map((g) => (
              <a key={g.id} href={`/actu?onglet=tendances&genre=${g.id}`} aria-current={genre === g.id ? "page" : undefined} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${genre === g.id ? "bg-white text-black border-white" : "bg-white/6 border-white/10 text-ink-muted hover:text-ink"}`}>{g.label}</a>
            ))}
            <span className="text-[11px] text-ink-faint ml-auto">Top écoutes · mis à jour toutes les 30 min</span>
          </div>
          <TrendingList tracks={tracks} />
        </>
      )}

      {tab === "sorties" && (
        <>
          <p className="text-[11px] text-ink-faint mb-3">Les derniers ajouts rap FR — du plus récent au plus ancien.</p>
          <TrendingList tracks={releases} numbered={false} />
        </>
      )}

      {tab === "dailyrap" && (
        posts.length === 0 ? (
          <div className="ticket p-6 text-sm text-ink-muted">Rien pour l&apos;instant — nos derniers posts arrivent ici. En attendant : <a href="https://www.instagram.com/dailyrapfrance/" target="_blank" rel="noopener noreferrer" className="text-glow font-semibold">Instagram</a> · <a href="https://www.tiktok.com/@dailyrapfrance" target="_blank" rel="noopener noreferrer" className="text-glow font-semibold">TikTok</a>.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {posts.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="ticket overflow-hidden flex flex-col">
                {p.image ? <img src={p.image} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" /> : <span className="block w-full h-24 bg-gradient-to-br from-[#3a0a0f] to-[#8a0010]" />}
                <span className="p-4">
                  <span className="block text-[11px] font-semibold text-gold mb-1 inline-flex items-center gap-1">{KIND_LABEL[p.kind] ?? p.kind}{p.pinned ? " · épinglé" : ""} <ExternalLink size={10} /></span>
                  <span className="block font-display text-lg font-bold leading-snug">{p.title}</span>
                  {p.body && <span className="block text-sm text-ink-muted mt-1">{p.body}</span>}
                </span>
              </a>
            ))}
          </div>
        )
      )}

      {tab === "actu" && (
        <>
          <NewsList items={news} />
          <p className="text-[11px] text-ink-faint mt-4">Articles issus des médias rap français, crédités et ouverts chez eux. DailyRapFrance sélectionne, ne réécrit pas.</p>
        </>
      )}
    </section>
  );
}
