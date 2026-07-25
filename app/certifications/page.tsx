import { getCertifications } from "@/lib/queries";
import CertBadge from "@/components/CertBadge";

export const revalidate = 3600;

const levels = [
  { key: undefined, label: "Tout" },
  { key: "OR", label: "Or" },
  { key: "PLATINE", label: "Platine" },
  { key: "DIAMANT", label: "Diamant" },
] as const;

export default async function CertificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ niveau?: string }>;
}) {
  const { niveau } = await searchParams;
  const activeLevel = (["OR", "PLATINE", "DIAMANT"] as const).includes(niveau as "OR" | "PLATINE" | "DIAMANT")
    ? (niveau as "OR" | "PLATINE" | "DIAMANT")
    : undefined;

  const certifications = await getCertifications(200, activeLevel);

  return (
    <section className="max-w-5xl mx-auto px-6 pt-16 pb-24">
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Officiel</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">
        Certifications
      </h1>
      <p className="text-ink-muted mb-4 max-w-2xl">
        Disques d'or, de platine et de diamant décernés aux projets suivis sur DailyRapFrance,
        d'après les données officielles du <span className="text-ink">SNEP</span> et de
        l'<span className="text-ink">UPFI</span>.
      </p>
      <p className="text-xs text-ink-faint mb-10 max-w-2xl leading-relaxed">
        Import manuel depuis les exports officiels — voir{" "}
        <code className="font-mono">pipelines/import-certifications.js</code>. Aucune donnée
        n'est inventée : chaque ligne renvoie vers sa source quand elle est disponible.
      </p>

      <div className="flex flex-wrap gap-2 mb-10">
        {levels.map((l) => {
          const isActive = l.key === activeLevel;
          const href = l.key ? `/certifications?niveau=${l.key}` : "/certifications";
          return (
            <a
              key={l.label}
              href={href}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive ? "bg-gold text-white" : "glass text-ink-muted hover:text-ink"
              }`}
            >
              {l.label}
            </a>
          );
        })}
      </div>

      {certifications.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-muted text-sm mb-1">Aucune certification importée pour l'instant.</p>
          <p className="text-ink-faint text-xs">
            Téléchargez l'export officiel sur snepmusique.com ou upfi.fr, puis lancez{" "}
            <code className="font-mono">node pipelines/import-certifications.js</code>.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-white/8 overflow-hidden">
          {certifications.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-4 py-4 px-5">
              <CertBadge level={c.level} multiplier={c.multiplier} className="shrink-0" />
              <div className="flex-1 min-w-[180px]">
                <p className="font-medium leading-snug">{c.releaseTitle ?? "—"}</p>
                <a
                  href={`/artiste/${c.artistSlug}`}
                  className="text-sm text-ink-muted hover:text-gold transition-colors"
                >
                  {c.artistName}
                </a>
              </div>
              <span className="font-mono text-xs text-ink-faint shrink-0">
                {new Date(c.certifiedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              <span className="font-mono text-[10px] uppercase text-ink-faint shrink-0 w-14 text-right">
                {c.source}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
