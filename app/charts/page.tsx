import { chartTop } from "@/lib/mock-data";

export default function ChartsPage() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl font-semibold mb-2">Charts</h1>
      <p className="text-ink-muted mb-8">Top Hype — temps réel, recalculé toutes les heures.</p>

      <div className="divide-y divide-line border-t border-b border-line">
        {chartTop.map((a) => (
          <a
            key={a.slug}
            href={`/artiste/${a.slug}`}
            className="flex items-center py-3.5 gap-4 hover:bg-surface transition-colors -mx-2 px-2"
          >
            <span className="font-mono text-ink-faint w-6 text-sm">{a.rank}</span>
            <span className="flex-1 font-medium">{a.name}</span>
            <span className="font-mono text-sm text-gold">{a.score}</span>
            <span
              className={
                "font-mono text-sm w-14 text-right " +
                (a.delta >= 0 ? "text-risePos" : "text-riseNeg")
              }
            >
              {a.delta >= 0 ? "+" : ""}
              {a.delta}
            </span>
          </a>
        ))}
      </div>

      <p className="text-xs text-ink-faint mt-8">
        Méthodologie : vélocité de streaming, momentum charts, signal social, signal recherche,
        événements récents. Jamais un jugement de qualité artistique — un thermomètre d'attention.
      </p>
    </section>
  );
}
