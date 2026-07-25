import { artists, releases } from "@/lib/mock-data";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return artists.map((a) => ({ slug: a.slug }));
}

export default function ArtistPage({ params }: { params: { slug: string } }) {
  const artist = artists.find((a) => a.slug === params.slug);
  if (!artist) return notFound();

  const discography = releases.filter((r) => r.artistSlug === artist.slug);

  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-8">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-surface-raised border border-line flex items-center justify-center font-display text-2xl text-ink-muted shrink-0">
            {artist.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">{artist.name}</h1>
            <p className="text-ink-muted mt-1">{artist.city} · {artist.label}</p>
            <div className="flex gap-2 mt-3">
              {artist.certifications.map((c) => (
                <span
                  key={c.title}
                  className="text-xs font-mono border border-line rounded px-2 py-1 text-gold"
                >
                  {c.level}
                </span>
              ))}
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="text-sm border border-line rounded px-3 py-1.5 hover:border-line-strong transition-colors">
              Suivre
            </button>
            <button className="text-sm border border-line rounded px-3 py-1.5 hover:border-line-strong transition-colors">
              Comparer
            </button>
          </div>
        </div>
      </section>

      {/* Bandeau de signaux */}
      <section className="border-y border-line bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-ink-faint uppercase font-mono mb-1">Auditeurs / mois</p>
            <p className="font-mono text-xl">{(artist.monthlyListeners / 1_000_000).toFixed(2)}M</p>
            <p className={"text-xs font-mono " + (artist.listenersDelta7d >= 0 ? "text-risePos" : "text-riseNeg")}>
              {artist.listenersDelta7d >= 0 ? "+" : ""}
              {artist.listenersDelta7d}% / 7j
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-faint uppercase font-mono mb-1">Indice de Hype</p>
            <p className="font-mono text-xl text-gold">{artist.hype}</p>
            <p className={"text-xs font-mono " + (artist.hypeDelta >= 0 ? "text-risePos" : "text-riseNeg")}>
              {artist.hypeDelta >= 0 ? "+" : ""}
              {artist.hypeDelta} cette semaine
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-ink-faint uppercase font-mono mb-1">Pourquoi ce score</p>
            <p className="text-sm text-ink-muted">{artist.hypeReason}</p>
          </div>
        </div>
      </section>

      {/* Discographie */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="font-display text-xl font-medium mb-6">Discographie</h2>
        {discography.length === 0 ? (
          <p className="text-ink-muted text-sm">Aucune sortie enregistrée pour le moment.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {discography.map((r) => (
              <a
                key={r.slug}
                href={`/sortie/${r.slug}`}
                className="block border border-line rounded p-4 hover:border-line-strong transition-colors"
              >
                <p className="text-xs font-mono text-ink-faint uppercase mb-2">
                  {r.type} · {r.status === "ANNOUNCED" ? "à venir" : new Date(r.date).getFullYear()}
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
