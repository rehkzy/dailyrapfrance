import { getNews } from "@/lib/queries";

export const revalidate = 300;

export default async function MagPage() {
  const news = await getNews(60);

  return (
    <section className="max-w-4xl mx-auto px-6 pt-16 pb-24">
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Actualisé en continu</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Mag</h1>
      <p className="text-ink-muted mb-12">
        Les dernières infos du rap français, agrégées depuis nos sources.
      </p>

      {news.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted text-sm mb-1">Le flux d'actus n'a pas encore tourné.</p>
          <p className="text-ink-faint text-xs">Revenez dans quelques minutes, l'ingestion tourne toutes les 30 min.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/8">
          {news.map((n) => (
            <a
              key={n.link}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-6 py-5 group hover:bg-white/5 transition-colors -mx-4 px-4 rounded"
            >
              <span className="font-mono text-xs text-gold uppercase shrink-0 pt-1 w-24">
                {n.source}
              </span>
              <span className="flex-1 font-medium leading-snug group-hover:text-gold transition-colors">
                {n.title}
              </span>
              <span className="font-mono text-xs text-ink-faint shrink-0 pt-1">
                {new Date(n.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
