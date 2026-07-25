import { getArtists } from "@/lib/queries";

export const revalidate = 60;

export default async function ArtistesPage() {
  const artists = await getArtists();

  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Fiches</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Artistes</h1>
      <p className="text-ink-muted mb-12">
        {artists.length > 0
          ? `${artists.length} fiches — triées par fans Deezer.`
          : "Aucun artiste pour l'instant."}
      </p>

      {artists.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted text-sm mb-1">
            L'ingestion Spotify n'a pas encore tourné.
          </p>
          <p className="text-ink-faint text-xs">
            Lancez-la manuellement depuis l'onglet Actions du repo GitHub, ou attendez la
            prochaine exécution horaire.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-white/8 overflow-hidden">
          {artists.map((a) => (
            <a
              key={a.slug}
              href={`/artiste/${a.slug}`}
              className="flex items-center gap-4 py-4 px-5 hover:bg-white/5 transition-colors"
            >
              {a.photoUrl ? (
                <img src={a.photoUrl} alt={a.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full glass flex items-center justify-center font-display text-sm text-ink-muted">
                  {a.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium">{a.name}</p>
                {a.city && <p className="text-sm text-ink-muted">{a.city}</p>}
              </div>
              <div className="text-right hidden sm:block">
                <p className="font-mono text-sm">{a.followers.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-ink-faint">fans Deezer</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
