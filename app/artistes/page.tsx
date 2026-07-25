import { getArtists } from "@/lib/queries";

export default async function ArtistesPage() {
  const artists = await getArtists();

  return (
    <section className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl font-semibold mb-2">Artistes</h1>
      <p className="text-ink-muted mb-8">
        {artists.length > 0
          ? `${artists.length} fiches — triées par abonnés Spotify.`
          : "Aucun artiste pour l'instant."}
      </p>

      {artists.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-ink-muted text-sm">
          L'ingestion Spotify n'a pas encore tourné. Lancez-la manuellement depuis l'onglet
          Actions du repo GitHub, ou attendez la prochaine exécution horaire.
        </div>
      ) : (
        <div className="glass rounded-xl divide-y divide-white/8 overflow-hidden">
          {artists.map((a) => (
            <a
              key={a.slug}
              href={`/artiste/${a.slug}`}
              className="flex items-center gap-4 py-4 px-5 hover:bg-white/8 transition-colors"
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
                <p className="text-xs text-ink-faint">abonnés Spotify</p>
              </div>
              <div className="font-mono text-sm text-gold w-10 text-right">{a.popularity}</div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
