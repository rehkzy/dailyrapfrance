import { getCollaborationGraph } from "@/lib/queries";

export const revalidate = 3600;

export default async function GraphePage() {
  const { edges } = await getCollaborationGraph(60);

  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Explorer</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">
        Graphe relationnel
      </h1>
      <p className="text-ink-muted mb-10 max-w-xl">
        Qui a featuré avec qui — reconstruit à partir des crédits réels de chaque titre
        (voir <code className="font-mono text-xs">pipelines/ingest-deezer-rap-fr.js</code>).
        Deezer ne fournit que les artistes crédités sur un titre, pas les rôles producteur ou
        auteur — le rendu WebGL du graphe complet (feats + prod + label) reste une prochaine
        itération.
      </p>

      {edges.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted text-sm mb-1">Aucune collaboration importée pour l'instant.</p>
          <p className="text-ink-faint text-xs">
            Lancez <code className="font-mono">node pipelines/ingest-deezer-rap-fr.js</code> pour
            peupler le graphe depuis la playlist Rapstars de Deezer.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-white/8 overflow-hidden">
          {edges.map((e) => (
            <div key={`${e.aSlug}-${e.bSlug}`} className="flex items-center gap-4 py-4 px-5">
              <div className="flex-1 flex items-center gap-3 flex-wrap">
                <a href={`/artiste/${e.aSlug}`} className="font-medium hover:text-gold transition-colors">
                  {e.aName}
                </a>
                <span className="text-ink-faint text-sm">×</span>
                <a href={`/artiste/${e.bSlug}`} className="font-medium hover:text-gold transition-colors">
                  {e.bName}
                </a>
              </div>
              <span className="font-mono text-xs text-gold shrink-0">
                {e.count} titre{e.count > 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
