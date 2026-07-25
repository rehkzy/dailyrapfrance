import { getTopByPopularity } from "@/lib/queries";

export default async function ChartsPage() {
  const chartTop = await getTopByPopularity(50);

  return (
    <section className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl font-semibold mb-2">Charts</h1>
      <p className="text-ink-muted mb-8">
        Top Popularité Spotify — en attendant le calcul du véritable Indice de Hype
        (vélocité, momentum charts, signal social).
      </p>

      {chartTop.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-ink-muted text-sm">
          L'ingestion Spotify n'a pas encore tourné.
        </div>
      ) : (
        <div className="glass rounded-xl divide-y divide-white/8 overflow-hidden">
          {chartTop.map((a) => (
            <a
              key={a.slug}
              href={`/artiste/${a.slug}`}
              className="flex items-center py-3.5 px-5 gap-4 hover:bg-white/8 transition-colors"
            >
              <span className="font-mono text-ink-faint w-6 text-sm">{a.rank}</span>
              <span className="flex-1 font-medium">{a.name}</span>
              <span className="font-mono text-sm text-gold">{a.score}/100</span>
            </a>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-faint mt-8">
        Source : Spotify Web API (score de popularité propriétaire Spotify, 0-100).
        Spotify ne fournit pas les auditeurs mensuels via son API publique — cette donnée
        reste privée, réservée à l'artiste via Spotify for Artists.
      </p>
    </section>
  );
}
