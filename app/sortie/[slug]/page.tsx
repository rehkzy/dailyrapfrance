import { getReleaseBySlug } from "@/lib/queries";
import { notFound } from "next/navigation";

export default async function ReleasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const release = await getReleaseBySlug(slug);
  if (!release) return notFound();

  return (
    <>
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-8">
        <div className="flex items-start gap-5">
          {release.coverUrl ? (
            <img src={release.coverUrl} alt={release.title} className="w-28 h-28 rounded object-cover shrink-0" />
          ) : (
            <div className="w-28 h-28 rounded glass shrink-0" />
          )}
          <div>
            <p className="text-xs font-mono text-ink-faint uppercase mb-2">{release.type}</p>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              {release.title}
            </h1>
            <p className="text-ink-muted mt-2">
              <a href={`/artiste/${release.artistSlug}`} className="hover:text-ink transition-colors">
                {release.artistName}
              </a>
            </p>
            {release.date && (
              <p className="font-mono text-sm text-ink-muted mt-3">
                Sorti le {new Date(release.date).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
        </div>
      </section>

      {release.tracks.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="font-display text-xl font-medium mb-6">Tracklist</h2>
          <div className="glass rounded-xl divide-y divide-white/8 overflow-hidden">
            {release.tracks.map((t, i) => (
              <div key={t.title} className="flex items-center gap-4 py-3 px-5">
                <span className="font-mono text-ink-faint text-sm w-5">{i + 1}</span>
                <span className="flex-1">{t.title}</span>
                <span className="font-mono text-sm text-ink-muted">{t.duration}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
