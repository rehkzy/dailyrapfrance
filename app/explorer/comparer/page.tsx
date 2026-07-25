import { artists } from "@/lib/mock-data";

export default async function ComparerPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const params = await searchParams;
  const a = artists.find((x) => x.slug === params.a) || artists[0];
  const b = artists.find((x) => x.slug === params.b) || artists[1];

  const rows = [
    { label: "Auditeurs / mois", va: `${(a.monthlyListeners / 1_000_000).toFixed(2)}M`, vb: `${(b.monthlyListeners / 1_000_000).toFixed(2)}M` },
    { label: "Indice de Hype", va: a.hype, vb: b.hype },
    { label: "Variation 7j", va: `${a.listenersDelta7d}%`, vb: `${b.listenersDelta7d}%` },
    { label: "Certifications", va: a.certifications.length, vb: b.certifications.length },
  ];

  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Explorer</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Comparateur</h1>
      <p className="text-ink-muted mb-10">Deux artistes, face à face.</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[a, b].map((art) => (
          <div key={art.slug} className="card p-5 text-center">
            <p className="font-display text-xl font-medium">{art.name}</p>
            <p className="text-sm text-ink-muted">{art.city}</p>
          </div>
        ))}
      </div>

      <div className="card divide-y divide-white/8 overflow-hidden">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-3 items-center py-3.5 px-5 text-sm">
            <span className="font-mono text-right pr-6">{r.va}</span>
            <span className="text-center text-ink-faint text-xs uppercase font-mono">{r.label}</span>
            <span className="font-mono">{r.vb}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-faint mt-8">
        Astuce : changez d'artistes via l'URL — <code className="font-mono">?a=slug&b=slug</code>.
        Le mode "carrière alignée" (superposition des courbes en années depuis le premier
        projet) et l'image OG partageable sont prévus dans une prochaine itération.
      </p>
    </section>
  );
}
