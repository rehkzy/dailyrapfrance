import { artists } from "@/lib/mock-data";

export default function GraphePage() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Explorer</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Graphe relationnel</h1>
      <p className="text-ink-muted mb-10 max-w-xl">
        Visualisation force-directed de tout le graphe (feats, prod, label) — la feature
        signature la plus lourde techniquement (rendu WebGL, calcul de layout), à construire
        dans une prochaine itération une fois les données réelles connectées.
      </p>

      <div className="card p-10 flex flex-wrap gap-6 justify-center items-center min-h-[280px]">
        {artists.map((a) => (
          <div
            key={a.slug}
            className="w-16 h-16 rounded-full glass-strong hover:border-gold/40 flex items-center justify-center font-mono text-xs text-ink-muted transition-colors"
            title={a.name}
          >
            {a.name.slice(0, 3).toUpperCase()}
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-faint mt-4">
        Aperçu statique en attendant l'implémentation WebGL réelle.
      </p>
    </section>
  );
}
