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
      </section>

      {/* Ticker — élément signature : le pouls de la plateforme */}
      <Ticker />

      {/* Ce qui se passe maintenant */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="font-display text-xl font-medium mb-6">Ce qui se passe maintenant</h2>
        <div className="grid md:grid-cols-3 gap-px bg-line rounded overflow-hidden">
          {now.map((item) => (
            <div key={item.title} className="bg-surface p-5">
              <p className="font-mono text-xs text-ink-faint uppercase mb-2">{item.label}</p>
              <p className="text-ink font-medium leading-snug">{item.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Top Hype */}
      <section className="max-w-6xl mx-auto px-6 py-14 border-t border-line">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-xl font-medium">Top Hype</h2>
          <a href="/charts" className="text-sm text-ink-muted hover:text-ink transition-colors">
            Voir le classement complet →
          </a>
        </div>
        <div className="divide-y divide-line border-t border-b border-line">
          {topHype.map((a) => (
            <div key={a.name} className="flex items-center py-3.5 gap-4">
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
    </>
  );
}
