import { getReleases } from "@/lib/queries";

export const revalidate = 60;

export default async function SortiesPage() {
  const releases = await getReleases();

  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Calendrier</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Sorties</h1>
      <p className="text-ink-muted mb-12">
        {releases.length > 0 ? "Confirmées, triées par date." : "Aucune sortie pour l'instant."}
      </p>

      {releases.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted text-sm">
          L'ingestion Spotify n'a pas encore tourné.
        </div>
      ) : (
        <div className="card divide-y divide-white/8 overflow-hidden">
          {releases.map((r) => (
            <a
              key={r.slug}
              href={`/sortie/${r.slug}`}
              className="flex items-center gap-4 py-4 px-5 hover:bg-white/5 transition-colors"
            >
              {r.coverUrl ? (
                <img src={r.coverUrl} alt={r.title} className="w-10 h-10 rounded object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded glass shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-ink-muted">{r.artistName}</p>
              </div>
              <span className="text-xs font-mono glass rounded-full px-3 py-1 text-ink-muted shrink-0">
                {r.date ? new Date(r.date).toLocaleDateString("fr-FR") : "à venir"}
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
