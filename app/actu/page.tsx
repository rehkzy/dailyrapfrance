import { Flame, Newspaper, Disc3 } from "lucide-react";
import { getTrending, getNewReleases } from "@/lib/trending";
import { getNews } from "@/lib/news";
import TrendingList from "@/components/TrendingList";
import NewsList from "@/components/NewsList";

export const metadata = {
  title: "Actu & tendances rap français — DailyRapFrance",
  description: "Les sons du moment, les dernières sorties et l'actu du rap français et de la musique urbaine, par DailyRapFrance. Écoute, puis lance un blind test dessus.",
  alternates: { canonical: "https://dailyrapfrance.best/actu" },
};
export const revalidate = 1800;

const TABS = [
  { id: "tendances", label: "Tendances", Icon: Flame },
  { id: "sorties", label: "Sorties", Icon: Disc3 },
  { id: "actu", label: "Actu", Icon: Newspaper },
] as const;
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

  const [tracks, releases, news] = await Promise.all([
    tab === "tendances" ? getTrending(genre, 30) : Promise.resolve([]),
    tab === "sorties" ? getNewReleases(18) : Promise.resolve([]),
    tab === "actu" ? getNews(24) : Promise.resolve([]),
  ]);

  return (
    <section className="max-w-2xl lg:max-w-4xl mx-auto px-5 sm:px-6 pt-8 sm:pt-14 pb-32">
      <p className="stage-kicker mb-2">Le média</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-2">Actu &amp; tendances</h1>
      <p className="text-ink-muted mb-5">Ce qui tourne en ce moment, les sorties, l&apos;actu — et un blind test dessus en un tap.</p>

      <nav className="segmented mb-5" aria-label="Rubriques">
        {TABS.map((t) => (
          <a key={t.id} href={`/actu?onglet=${t.id}`} aria-pressed={tab === t.id} className="inline-flex items-center justify-center gap-1.5"><t.Icon size={14} /> {t.label}</a>
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

      {tab === "actu" && (
        <>
          <NewsList items={news} />
          <p className="text-[11px] text-ink-faint mt-4">Articles issus des médias rap français, crédités et ouverts chez eux. DailyRapFrance sélectionne, ne réécrit pas.</p>
        </>
      )}
    </section>
  );
}
