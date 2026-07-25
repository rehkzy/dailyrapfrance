import { releases } from "@/lib/mock-data";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return releases.map((r) => ({ slug: r.slug }));
}

export default function ReleasePage({ params }: { params: { slug: string } }) {
  const release = releases.find((r) => r.slug === params.slug);
  if (!release) return notFound();

  return (
    <>
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-8">
        <div className="flex items-start gap-5">
          <div className="w-28 h-28 rounded bg-surface-raised border border-line shrink-0" />
          <div>
            <p className="text-xs font-mono text-ink-faint uppercase mb-2">{release.type}</p>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              {release.title}
            </h1>
            <p className="text-ink-muted mt-2">
              <a href={`/artiste/${release.artistSlug}`} className="hover:text-ink transition-colors">
                {release.artistName}
              </a>{" "}
              · {release.label}
            </p>
            {release.status === "ANNOUNCED" ? (
              <p className="font-mono text-sm text-gold mt-3">
                Sortie prévue le {new Date(release.date).toLocaleDateString("fr-FR")}
              </p>
            ) : (
              <p className="font-mono text-sm text-ink-muted mt-3">
                Sorti le {new Date(release.date).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-10 border-t border-line">
        <h2 className="font-display text-xl font-medium mb-6">Tracklist</h2>
        <div className="divide-y divide-line border-t border-b border-line">
          {release.tracks.map((t, i) => (
            <div key={t.title} className="flex items-center gap-4 py-3">
              <span className="font-mono text-ink-faint text-sm w-5">{i + 1}</span>
              <span className="flex-1">
                {t.title}
                {t.features.length > 0 && (
                  <span className="text-ink-muted"> (feat. {t.features.join(", ")})</span>
                )}
              </span>
              <span className="font-mono text-sm text-ink-muted">{t.duration}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
