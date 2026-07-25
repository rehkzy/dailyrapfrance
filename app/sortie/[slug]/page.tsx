import { getReleaseBySlug } from "@/lib/queries";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function ReleasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const release = await getReleaseBySlug(slug);
  if (!release) return notFound();

  return (
    <>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-8">
        <div className="flex items-start gap-5">
          {release.coverUrl ? (
            <img src={release.coverUrl} alt={release.title} className="w-28 h-28 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-28 h-28 rounded-lg glass shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-mono text-gold uppercase tracking-[0.16em]">{release.type}</p>
              {release.explicit && (
                <span className="text-[10px] font-mono uppercase border border-white/20 text-ink-faint rounded px-1.5 py-0.5">
                  Explicite
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              {release.title}
            </h1>
            <p className="text-ink-muted mt-2">
              <a href={`/artiste/${release.artistSlug}`} className="hover:text-ink transition-colors">
                {release.artistName}
              </a>
            </p>
            <div className="flex items-center gap-4 mt-3">
              {release.date && (
                <p className="font-mono text-sm text-ink-muted">
                  Sorti le {new Date(release.date).toLocaleDateString("fr-FR")}
                </p>
              )}
              {release.fans != null && (
                <p className="font-mono text-sm text-ink-faint">{release.fans.toLocaleString("fr-FR")} fans Deezer</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {release.tracks.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="font-display text-xl font-medium mb-6">Tracklist</h2>
          <div className="card divide-y divide-white/8 overflow-hidden">
            {release.tracks.map((t, i) => (
              <div key={t.title} className="flex items-center gap-4 py-3 px-5 hover:bg-white/5 transition-colors">
                <span className="font-mono text-ink-faint text-sm w-5">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1">
                  {t.title}
                  {t.explicit && <span className="ml-2 text-[10px] text-ink-faint border border-white/20 rounded px-1 py-0.5 align-middle">E</span>}
                </span>
                {t.bpm ? <span className="font-mono text-xs text-ink-faint hidden sm:inline">{Math.round(t.bpm)} BPM</span> : null}
                <span className="font-mono text-sm text-ink-muted">{t.duration}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
