import { getArtistBySlug } from "@/lib/queries";
import { notFound } from "next/navigation";
import CertBadge from "@/components/CertBadge";

export const revalidate = 60;

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return notFound();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="brand-glow" aria-hidden="true" style={{ opacity: 0.5 }} />
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-8">
          <div className="flex items-start gap-5">
            {artist.photoUrl ? (
              <img src={artist.photoUrl} alt={artist.name} className="w-20 h-20 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-full glass flex items-center justify-center font-display text-2xl text-ink-muted shrink-0">
                {artist.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">{artist.name}</h1>
              <p className="text-ink-muted mt-1">
                {[artist.city, artist.label].filter(Boolean).join(" · ") || "Informations à venir"}
              </p>
            </div>
            <div className="ml-auto hidden sm:flex gap-2">
              <button className="text-sm glass rounded-full px-4 py-1.5 hover:bg-white/8 hover:border-gold/40 transition-colors">
                Suivre
              </button>
              <button className="text-sm glass rounded-full px-4 py-1.5 hover:bg-white/8 hover:border-gold/40 transition-colors">
                Comparer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Bandeau de signaux — vraies métriques Deezer publiques */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="card px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-ink-faint uppercase font-mono mb-1">Fans Deezer</p>
            <p className="font-mono text-xl text-gold">{artist.followers.toLocaleString("fr-FR")}</p>
          </div>
          <div className="col-span-3">
            <p className="text-xs text-ink-faint uppercase font-mono mb-1">Source</p>
            <p className="text-sm text-ink-muted">
              Données Deezer API, mises à jour à chaque exécution du pipeline.
            </p>
          </div>
        </div>
      </section>

      {/* Certifications — SNEP / UPFI, importées manuellement (voir pipelines/import-certifications.js) */}
      {artist.certifications.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pt-14">
          <h2 className="font-display text-xl font-medium mb-6">Certifications</h2>
          <div className="flex flex-wrap gap-3">
            {artist.certifications.map((c, i) => (
              <div key={i} className="card px-4 py-3 flex items-center gap-3">
                <CertBadge level={c.level} multiplier={c.multiplier} />
                <div className="text-sm">
                  <p className="font-medium leading-snug">{c.releaseTitle ?? "—"}</p>
                  <p className="text-xs text-ink-faint font-mono">
                    {new Date(c.certifiedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    {" · "}{c.source}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
                className="block card card-lift p-4"
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
