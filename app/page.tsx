import Ticker from "@/components/Ticker";

// Données d'exemple — à remplacer par des requêtes Prisma une fois Supabase connecté.
const now = [
  { label: "Sortie du jour", title: "Tiakola — nouvel album annoncé", tag: "sortie" },
  { label: "Mouvement de hype", title: "Gazo +12 pts cette semaine", tag: "hype" },
  { label: "Certification", title: "SDM certifié Platine", tag: "certif" },
];

const topHype = [
  { rank: 1, name: "Gazo", score: 91, delta: 12 },
  { rank: 2, name: "Luv Resval", score: 84, delta: 8 },
  { rank: 3, name: "Tiakola", score: 79, delta: 6 },
  { rank: 4, name: "Josman", score: 71, delta: 3 },
  { rank: 5, name: "Ninho", score: 68, delta: -1 },
];

const features = [
  {
    tag: "Feature signature",
    title: "Graphe relationnel",
    desc: "Toute la scène visualisée : feats, prods, labels, beefs documentés. Trouvez le chemin de collaborations entre deux artistes.",
    href: "/explorer/graphe",
    cta: "Explorer le graphe",
  },
  {
    tag: "Feature signature",
    title: "Indice de Hype",
    desc: "Un score 0-100 recalculé chaque heure : vélocité de streaming, momentum charts, signal social. Le thermomètre d'attention de la scène.",
    href: "/charts",
    cta: "Voir le classement",
  },
  {
    tag: "Feature signature",
    title: "Comparateur",
    desc: "Deux à quatre artistes, côte à côte : discographies, records, carrières alignées. Partageable en un lien.",
    href: "/explorer/comparer",
    cta: "Comparer des artistes",
  },
];

const manifesto = [
  { label: "Booska-P, Raplume…", text: "des flux d'articles, des exclus qui vivent 24h, aucune donnée exploitable." },
  { label: "Chartmetric, Soundcharts", text: "B2B, anglophones, chers — zéro profondeur culturelle sur le rap FR." },
  { label: "DailyRapFrance", text: "le graphe complet, vivant et interrogeable de la scène. Gratuit." },
];

const stats = [
  { value: "3 000+", label: "artistes visés" },
  { value: "25 000+", label: "sorties visées" },
  { value: "150 000+", label: "tracks visés" },
  { value: "1h", label: "fraîcheur sur le top 500" },
];

export default function Home() {
  return (
    <>
      {/* Hero — la thèse du produit, pas un carrousel */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-14">
        <p className="font-mono text-xs text-gold tracking-wide uppercase mb-4">
          Le graphe du rap français
        </p>
        <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl leading-[1.05]">
          Chaque artiste, chaque sortie, chaque featuring — structurés, interrogeables, vivants.
        </h1>
        <p className="text-ink-muted text-lg max-w-xl mt-6 leading-relaxed">
          Pas un blog. Pas un chart hebdo. La base de données du rap français,
          mise à jour heure par heure.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <a
            href="/explorer/graphe"
            className="glass-strong rounded-lg px-5 py-2.5 text-sm font-medium text-gold hover:bg-white/10 transition-colors"
          >
            Explorer le graphe →
          </a>
          <a
            href="/artistes"
            className="glass rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-white/8 transition-colors"
          >
            Parcourir les artistes
          </a>
        </div>
      </section>

      {/* Ticker — élément signature : le pouls de la plateforme */}
      <Ticker />

      {/* Manifeste — le positionnement, façon vitrine */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <p className="font-mono text-xs text-ink-faint uppercase tracking-wide mb-3">Le constat</p>
        <h2 className="font-display text-2xl md:text-3xl font-medium max-w-2xl leading-snug mb-10">
          Le rap est le premier genre musical en France depuis dix ans. Son écosystème
          médiatique, lui, est resté figé sur un modèle 2010.
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {manifesto.map((m, i) => (
            <div
              key={m.label}
              className={
                "rounded-xl p-5 " +
                (i === 2 ? "glass-strong border-gold/30" : "glass opacity-70")
              }
            >
              <p className={"font-mono text-xs uppercase mb-2 " + (i === 2 ? "text-gold" : "text-ink-faint")}>
                {m.label}
              </p>
              <p className="text-sm leading-relaxed">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ce qui se passe maintenant */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="font-display text-xl font-medium mb-6">Ce qui se passe maintenant</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {now.map((item) => (
            <div key={item.title} className="glass rounded-xl p-5">
              <p className="font-mono text-xs text-ink-faint uppercase mb-2">{item.label}</p>
              <p className="text-ink font-medium leading-snug">{item.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features signature — la vitrine produit */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="font-display text-xl font-medium mb-6">Ce qu'aucun concurrent n'a</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((f) => (
            <a
              key={f.title}
              href={f.href}
              className="glass rounded-xl p-6 flex flex-col hover:bg-white/8 transition-colors group"
            >
              <p className="font-mono text-xs text-gold uppercase tracking-wide mb-3">{f.tag}</p>
              <h3 className="font-display text-lg font-medium mb-2">{f.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed flex-1">{f.desc}</p>
              <p className="text-sm font-medium mt-4 group-hover:text-gold transition-colors">
                {f.cta} →
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Top Hype */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-xl font-medium">Top Hype</h2>
          <a href="/charts" className="text-sm text-ink-muted hover:text-ink transition-colors">
            Voir le classement complet →
          </a>
        </div>
        <div className="glass rounded-xl divide-y divide-white/8 overflow-hidden">
          {topHype.map((a) => (
            <div key={a.name} className="flex items-center py-3.5 px-5 gap-4">
              <span className="font-mono text-ink-faint w-6 text-sm">{a.rank}</span>
              <span className="flex-1 font-medium">{a.name}</span>
              <span className="font-mono text-sm text-ink-muted">{a.score}</span>
              <span
                className={
                  "font-mono text-sm w-14 text-right " +
                  (a.delta >= 0 ? "text-risePos" : "text-riseNeg")
                }
              >
                {a.delta >= 0 ? "+" : ""}
                {a.delta}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Chiffres — l'ambition du projet */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="glass rounded-xl grid grid-cols-2 md:grid-cols-4 divide-x divide-white/8">
          {stats.map((s) => (
            <div key={s.label} className="p-6 text-center">
              <p className="font-display text-2xl md:text-3xl font-semibold text-gold">{s.value}</p>
              <p className="text-xs text-ink-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-2xl md:text-3xl font-medium mb-4">
          Le rap français mérite mieux qu'un flux d'articles.
        </h2>
        <p className="text-ink-muted max-w-lg mx-auto mb-8">
          Aucun abonnement, aucune pub, aucune donnée à vendre. Juste le graphe le plus
          complet de la scène, en accès libre.
        </p>
        <a
          href="/artistes"
          className="inline-block glass-strong rounded-lg px-6 py-3 text-sm font-medium text-gold hover:bg-white/10 transition-colors"
        >
          Découvrir la plateforme →
        </a>
      </section>
    </>
  );
}
