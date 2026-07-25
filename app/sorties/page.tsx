import { getReleases } from "@/lib/queries";

export const revalidate = 60;

export default async function SortiesPage() {
  const releases = await getReleases();

  return (
    <section className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl font-semibold mb-2">Sorties</h1>
      <p className="text-ink-muted mb-8">
        {releases.length > 0 ? "Confirmées, triées par date." : "Aucune sortie pour l'instant."}
      </p>

      {releases.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-ink-muted text-sm">
          L'ingestion Spotify n'a pas encore tourné.
        </div>
      ) : (
        <div className="glass rounded-xl divide-y divide-white/8 overflow-hidden">
          {releases.map((r) => (
            <a
              key={r.slug}
              href={`/sortie/${r.slug}`}
              className="flex items-center gap-4 py-4 px-5 hover:bg-white/8 transition-colors"
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
              <span className="text-xs font-mono glass rounded px-2 py-1 text-ink-muted">
                {r.date ? new Date(r.date).toLocaleDateString("fr-FR") : "à venir"}
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
