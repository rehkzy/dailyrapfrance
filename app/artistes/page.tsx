import { artists } from "@/lib/mock-data";

export default function ArtistesPage() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl font-semibold mb-2">Artistes</h1>
      <p className="text-ink-muted mb-8">{artists.length} fiches — triées par auditeurs mensuels.</p>

      <div className="glass rounded-xl divide-y divide-white/8 overflow-hidden">
        {artists
          .slice()
          .sort((a, b) => b.monthlyListeners - a.monthlyListeners)
          .map((a) => (
            <a
              key={a.slug}
              href={`/artiste/${a.slug}`}
              className="flex items-center gap-4 py-4 px-5 hover:bg-white/8 transition-colors"
            >
              <div className="w-10 h-10 rounded-full glass flex items-center justify-center font-display text-sm text-ink-muted">
                {a.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-sm text-ink-muted">{a.city} · {a.label}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="font-mono text-sm">{(a.monthlyListeners / 1_000_000).toFixed(1)}M</p>
                <p className="text-xs text-ink-faint">auditeurs/mois</p>
              </div>
              <div className="font-mono text-sm text-gold w-10 text-right">{a.hype}</div>
            </a>
          ))}
      </div>
    </section>
  );
}
