import { getArtistBySlug } from "@/lib/queries";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return notFound();

  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-8">
        <div className="flex items-start gap-5">
          {artist.photoUrl ? (
            <img src={artist.photoUrl} alt={artist.name} className="w-20 h-20 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full glass flex items-center justify-center font-display text-2xl text-ink-muted shrink-0">
              {artist.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">{artist.name}</h1>
            <p className="text-ink-muted mt-1">
              {[artist.city, artist.label].filter(Boolean).join(" · ") || "Informations à venir"}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="text-sm glass rounded px-3 py-1.5 hover:bg-white/8 transition-colors">
              Suivre
            </button>
            <button className="text-sm glass rounded px-3 py-1.5 hover:bg-white/8 transition-colors">
              Comparer
            </button>
          </div>
        </div>
      </section>

      {/* Bandeau de signaux — vraies métriques Deezer publiques */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="glass rounded-xl px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-ink-faint uppercase font-mono mb-1">Fans Deezer</p>
            <p className="font-mono text-xl">{artist.followers.toLocaleString("fr-FR")}</p>
          </div>
          <div className="col-span-3">
            <p className="text-xs text-ink-faint uppercase font-mono mb-1">Source</p>
            <p className="text-sm text-ink-muted">
              Données Deezer API, mises à jour à chaque exécution du pipeline.
            </p>
          </div>
        </div>
      </section>

      {/* Discographie */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="font-display text-xl font-medium mb-6">Discographie</h2>
        {artist.releases.length === 0 ? (
          <p className="text-ink-muted text-sm">Aucune sortie enregistrée pour le moment.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {artist.releases.map((r) => (
              <a
                key={r.slug}
                href={`/sortie/${r.slug}`}
                className="block glass rounded-xl p-4 hover:border-line-strong transition-colors"
              >
                <p className="text-xs font-mono text-ink-faint uppercase mb-2">
                  {r.type} · {r.releaseDate ? new Date(r.releaseDate).getFullYear() : "à venir"}
                </p>
                <p className="font-medium">{r.title}</p>
              </a>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
