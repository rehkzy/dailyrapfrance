import { artists } from "@/lib/mock-data";

export default function GraphePage() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl font-semibold mb-2">Graphe relationnel</h1>
      <p className="text-ink-muted mb-8 max-w-xl">
        Visualisation force-directed de tout le graphe (feats, prod, label). C'est la feature
        signature la plus lourde techniquement (rendu WebGL, calcul de layout, voir
        02_PRODUCT.md §6.1) — à construire dans une prochaine itération, une fois les données
        réelles connectées.
      </p>

      <div className="border border-line rounded p-10 flex flex-wrap gap-6 justify-center items-center min-h-[280px] bg-surface">
        {artists.map((a) => (
          <div
            key={a.slug}
            className="w-16 h-16 rounded-full border border-line-strong flex items-center justify-center font-mono text-xs text-ink-muted"
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
