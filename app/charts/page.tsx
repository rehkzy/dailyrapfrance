import { getTopByPopularity } from "@/lib/queries";

export const revalidate = 60;

export default async function ChartsPage() {
  const chartTop = await getTopByPopularity(50);

  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Classement</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Charts</h1>
      <p className="text-ink-muted mb-12 max-w-xl">
        Classement par fans Deezer — en attendant le calcul du véritable Indice de Hype
        (vélocité, momentum charts, signal social).
      </p>

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
              className="flex items-center py-4 px-5 gap-5 hover:bg-white/5 transition-colors group"
            >
              <span className="font-display text-xl text-ink-faint w-8 group-hover:text-gold transition-colors">
                {String(a.rank).padStart(2, "0")}
              </span>
              <span className="flex-1 font-medium">{a.name}</span>
              <span className="font-mono text-sm text-gold">{a.score.toLocaleString("fr-FR")}</span>
            </a>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-faint mt-8">
        Source : Deezer API (fans, donnée publique gratuite). Ni Spotify ni Deezer ne
        fournissent les auditeurs mensuels via leur API publique — cette donnée reste
        privée, réservée à l'artiste.
      </p>
    </section>
  );
}
