type NewsTickerItem = {
  title: string;
  source: string;
  link: string;
};

// Bandeau cinétique alimenté par le vrai flux RSS (lib/queries.ts → getNews()).
// Inspiré des bandeaux "showcase" de lenis.dev : une piste dupliquée en boucle infinie,
// en CSS pur (réutilise l'animation .ticker-track déjà définie dans globals.css),
// donc aucun JS de scroll requis et compatible avec le smooth scroll Lenis du site.
function Row({ items }: { items: NewsTickerItem[] }) {
  return (
    <>
      {items.map((n, i) => (
        <a
          key={`${n.link}-${i}`}
          href={n.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-6 font-mono text-sm hover:text-gold transition-colors"
        >
          <span className="text-gold uppercase text-xs tracking-wide">{n.source}</span>
          <span className="text-ink-muted">{n.title}</span>
          <span className="text-ink-faint">•</span>
        </a>
      ))}
    </>
  );
}

export default function NewsTicker({ items }: { items: NewsTickerItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="glass flex items-center overflow-hidden py-2.5 rounded-none border-y border-white/8">
      <span className="flex items-center gap-2 pl-6 pr-5 shrink-0 font-mono text-[11px] uppercase tracking-[0.16em] text-gold border-r border-white/8">
        <span className="pulse-dot" aria-hidden="true" />
        En direct
      </span>
      <div className="overflow-hidden whitespace-nowrap flex-1">
        <div className="ticker-track inline-block">
          <Row items={items} />
          <Row items={items} />
        </div>
      </div>
    </div>
  );
}
