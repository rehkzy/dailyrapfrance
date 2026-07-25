import { getTopByPopularity, getStreamingChart } from "@/lib/queries";

export const revalidate = 3600;

export default async function ChartsPage() {
  const streamingChart = await getStreamingChart(50);
  const chartTop = await getTopByPopularity(50);

  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Classement</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Charts</h1>
      <p className="text-ink-muted mb-3 max-w-xl">
        Chart Rap/Hip-Hop Deezer — mis à jour chaque semaine, filtré sur les artistes suivis
        par DailyRapFrance.
      </p>
      <p className="text-xs text-ink-faint mb-10 max-w-xl leading-relaxed">
        Pas le Top officiel SNEP : ses classements sont explicitement réservés (SCPP) et sans
        export public. Ceci est un classement de popularité Deezer, pas un chiffre de ventes.
      </p>

      {streamingChart.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted text-sm mb-16">
          Le chart Deezer n'a pas encore tourné.
        </div>
      ) : (
        <div className="card divide-y divide-white/8 overflow-hidden mb-16">
          <div className="px-5 py-2.5 text-xs font-mono text-ink-faint uppercase tracking-wide">
            Semaine {streamingChart[0].periodKey.replace("-S", " · S")}
          </div>
          {streamingChart.map((e) => (
            <a
              key={e.artistSlug}
              href={`/artiste/${e.artistSlug}`}
              className="flex items-center py-4 px-5 gap-5 hover:bg-white/5 transition-colors group"
            >
              <span className="font-display text-xl text-ink-faint w-8 group-hover:text-gold transition-colors">
                {String(e.position).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <p className="font-medium">{e.artistName}</p>
                {e.releaseTitle && <p className="text-xs text-ink-faint">{e.releaseTitle}</p>}
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-lg font-medium text-ink-muted">Par fans Deezer</h2>
      </div>

      {chartTop.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted text-sm">
          L'ingestion n'a pas encore tourné.
        </div>
      ) : (
        <div className="card divide-y divide-white/8 overflow-hidden">
          {chartTop.map((a) => (
            <a
              key={a.slug}
              href={`/artiste/${a.slug}`}
              className="flex items-center py-3.5 px-5 gap-4 hover:bg-white/5 transition-colors"
            >
              <span className="font-mono text-ink-faint w-6 text-sm">{a.rank}</span>
              <span className="flex-1 font-medium">{a.name}</span>
              <span className="font-mono text-sm text-gold">{a.score.toLocaleString("fr-FR")}</span>
            </a>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-faint mt-8">
        Sources : API Deezer (chart Rap/Hip-Hop et fans, données publiques gratuites). Ni
        Spotify ni Deezer ne fournissent les auditeurs mensuels via leur API publique — cette
        donnée reste privée, réservée à l'artiste.
      </p>
    </section>
  );
}
