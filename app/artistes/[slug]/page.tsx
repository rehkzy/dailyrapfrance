import HelpTip from "@/components/HelpTip";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Play, ArrowRight, Disc3, Users, Music2 } from "lucide-react";
import { SITE } from "@/lib/seo";
import { ARTISTS, findArtist, findArtistByName, formatDuration, formatFans } from "@/lib/artists";
import { resolveArtist, artistTopTracksFull, artistAlbums, artistRelated } from "@/lib/deezerArtist";
import { jsonLd as toJsonLd } from "@/lib/jsonld";
import TrackPreviewList from "@/components/TrackPreviewList";

/*
 * /artistes/[slug] — « Top sons de <artiste> » : le classement des titres les plus écoutés
 * (Deezer, renouvelé chaque jour), la discographie et les artistes proches, avec un seul
 * appel à l'action : jouer au blind test de cet artiste. Contenu unique par page, pensé pour
 * les requêtes « meilleurs sons de X », « top X », « X discographie ».
 */
export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return ARTISTS.map((a) => ({ slug: a.slug }));
}

const YEAR = new Date().getFullYear();

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = findArtist(slug);
  if (!a) return {};
  const url = `${SITE}/artistes/${a.slug}`;
  const title = `Top 10 des meilleurs sons de ${a.name} (${YEAR}) — classement, discographie et blind test`;
  const description = `Les 10 titres les plus écoutés de ${a.name}, sa discographie complète et les artistes proches. Puis teste-toi : le blind test ${a.name}, gratuit, sur DailyRapFrance.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article", images: [{ url: `${url}/opengraph-image`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [`${url}/opengraph-image`] },
  };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = findArtist(slug);
  if (!a) notFound();
  const url = `${SITE}/artistes/${a.slug}`;

  const artist = await resolveArtist(a.name);
  const [tracks, albums, related] = artist
    ? await Promise.all([artistTopTracksFull(artist.id, 10), artistAlbums(artist.id, 60), artistRelated(artist.id, 10)])
    : [[], [], []];
  const fullAlbums = albums.filter((al) => al.type === "album");
  const firstYear = albums.length ? albums[albums.length - 1].releaseDate.slice(0, 4) : null;
  const latest = albums[0];
  const relatedLinked = related.map((r) => ({ ...r, entry: findArtistByName(r.name) }));
  const others = ARTISTS.filter((x) => x.slug !== a.slug);
  const fallbackRelated = others.sort(() => 0.5 - Math.random()).slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MusicGroup",
        "@id": `${url}#artist`,
        name: a.name,
        url,
        genre: "Rap français",
        ...(artist?.picture_big ? { image: artist.picture_big } : {}),
        ...(fullAlbums.length ? { album: fullAlbums.slice(0, 20).map((al) => ({ "@type": "MusicAlbum", name: al.title, ...(al.releaseDate ? { datePublished: al.releaseDate } : {}), ...(al.cover ? { image: al.cover } : {}) })) } : {}),
      },
      {
        "@type": "ItemList",
        "@id": `${url}#top`,
        name: `Top 10 des sons de ${a.name}`,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        numberOfItems: tracks.length,
        itemListElement: tracks.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: { "@type": "MusicRecording", name: t.title, byArtist: { "@id": `${url}#artist` }, ...(t.album ? { inAlbum: { "@type": "MusicAlbum", name: t.album } } : {}), ...(t.duration ? { duration: `PT${Math.floor(t.duration / 60)}M${t.duration % 60}S` } : {}), ...(t.link ? { url: t.link } : {}) },
        })),
      },
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: `Top 10 des meilleurs sons de ${a.name} (${YEAR})`,
        inLanguage: "fr-FR",
        dateModified: new Date().toISOString().slice(0, 10),
        author: { "@id": `${SITE}/#florian` },
        publisher: { "@id": `${SITE}/#org` },
        about: { "@id": `${url}#artist` },
        mainEntityOfPage: url,
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: [
          { "@type": "Question", name: `Quel est le son le plus écouté de ${a.name} ?`, acceptedAnswer: { "@type": "Answer", text: tracks[0] ? `D'après les écoutes Deezer, le titre le plus populaire de ${a.name} est « ${tracks[0].title} »${tracks[0].album && tracks[0].album.toLowerCase() !== tracks[0].title.toLowerCase() ? ` (album ${tracks[0].album})` : ""}. Le classement complet des 10 sons les plus écoutés est mis à jour chaque jour sur cette page.` : `Le classement des sons les plus écoutés de ${a.name} est mis à jour chaque jour sur cette page, d'après les écoutes Deezer.` } },
          { "@type": "Question", name: `Comment jouer au blind test ${a.name} ?`, acceptedAnswer: { "@type": "Answer", text: `Sur dailyrapfrance.best, choisis le thème « Blind Test ${a.name} » : un extrait démarre, tu dois retrouver le titre (et le featuring s'il y en a un) le plus vite possible. Gratuit, en solo, entre potes ou en ligne.` } },
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "DailyRapFrance", item: SITE },
          { "@type": "ListItem", position: 2, name: "Artistes", item: `${SITE}/artistes` },
          { "@type": "ListItem", position: 3, name: a.name, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />
      <article className="max-w-3xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-20">
        <nav aria-label="Fil d'Ariane" className="text-xs text-ink-faint mb-5 flex items-center gap-1.5 flex-wrap">
          <a href="/" className="hover:text-ink">DailyRapFrance</a><span aria-hidden="true">›</span>
          <a href="/artistes" className="hover:text-ink">Artistes</a><span aria-hidden="true">›</span>
          <span className="text-ink-muted">{a.name}</span>
        </nav>

        {/* En-tête artiste */}
        <header className="flex items-center gap-5 mb-8">
          {artist?.picture_big && <img src={artist.picture_big} alt={a.name} width={112} height={112} className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />}
          <div className="min-w-0">
            <p className="stage-kicker mb-1">Top sons · {YEAR}</p>
            <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.02]">Les meilleurs sons de {a.name}</h1>
            <p className="text-sm text-ink-faint mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {artist?.nb_fan ? <span className="inline-flex items-center gap-1.5"><Users size={13} /> {formatFans(artist.nb_fan)} fans Deezer</span> : null}
              {fullAlbums.length ? <span className="inline-flex items-center gap-1.5"><Disc3 size={13} /> {fullAlbums.length} album{fullAlbums.length > 1 ? "s" : ""}{firstYear ? ` depuis ${firstYear}` : ""}</span> : null}
            </p>
          </div>
        </header>

        <p className="text-lg text-ink-muted leading-relaxed mb-8">
          {tracks[0]
            ? <>Le son le plus écouté de {a.name} aujourd'hui est <strong className="text-ink font-medium">« {tracks[0].title} »</strong>{tracks[0].album && tracks[0].album.toLowerCase() !== tracks[0].title.toLowerCase() ? ` (album ${tracks[0].album})` : ""}. Voici le classement des 10 titres les plus populaires, d'après les écoutes Deezer, mis à jour chaque jour{latest ? ` — dernier projet : ${latest.title}${latest.releaseDate ? ` (${latest.releaseDate.slice(0, 4)})` : ""}` : ""}.</>
            : <>Le classement des titres les plus écoutés de {a.name}, mis à jour chaque jour d'après les écoutes Deezer.</>}
        </p>

        {/* CTA principal */}
        <a href={`/jouer?mode=solo&theme=${a.theme.id}`} className="sticker w-full h-16 text-lg mb-10">
          <Play size={18} fill="currentColor" /> Jouer au blind test {a.name}
        </a>

        {/* Top 10 */}
        <section aria-labelledby="top-title" className="mb-12">
          <h2 id="top-title" className="font-display text-2xl font-bold mb-4 inline-flex items-center gap-2">Top 10 des sons de {a.name} <HelpTip title="D'où vient ce classement ?" label="D'où vient ce classement ?"><p className="text-sm">Classement par popularité Deezer, actualisé chaque jour. Les extraits de 30 secondes sont fournis par Deezer.</p></HelpTip></h2>
          {tracks.length === 0 ? (
            <p className="text-sm text-ink-faint">Le classement n'est pas disponible pour le moment.</p>
          ) : (
            <TrackPreviewList tracks={tracks.map((t) => ({ id: t.id, title: t.title, album: t.album, cover: t.cover, preview: t.preview, duration: formatDuration(t.duration), explicit: t.explicit, link: t.link }))} />
          )}
        </section>

        {/* Discographie */}
        {fullAlbums.length > 0 && (
          <section aria-labelledby="disco-title" className="mb-12">
            <h2 id="disco-title" className="font-display text-2xl font-bold mb-4">Discographie de {a.name}</h2>
            <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {fullAlbums.slice(0, 12).map((al) => (
                <li key={al.id} className="min-w-0">
                  {al.cover && <img src={al.cover} alt={`${al.title} — ${a.name}`} width={250} height={250} loading="lazy" className="w-full aspect-square rounded-xl object-cover border border-white/10" />}
                  <p className="text-xs font-semibold mt-2 truncate">{al.title}</p>
                  {al.releaseDate && <p className="text-[11px] text-ink-faint">{al.releaseDate.slice(0, 4)}</p>}
                </li>
              ))}
            </ul>
            {albums.length > fullAlbums.length && <p className="text-xs text-ink-faint mt-3">+ {albums.length - fullAlbums.length} EP et singles.</p>}
          </section>
        )}

        {/* Le jeu */}
        <section className="card p-6 mb-12">
          <p className="stage-kicker mb-2">Le blind test {a.name}</p>
          <h2 className="font-display text-xl font-bold mb-2">Tu connais vraiment {a.name} ?</h2>
          <p className="text-sm text-ink-muted mb-4">{a.theme.text}. Un extrait démarre, tu retrouves le titre — et le featuring s'il y en a un — le plus vite possible. Gratuit, en solo pour le classement, entre potes sur un téléphone, ou en ligne.</p>
          <div className="flex flex-wrap gap-2">
            <a href={`/jouer?mode=solo&theme=${a.theme.id}`} className="sticker sticker-sm"><Play size={14} fill="currentColor" /> Solo</a>
            <a href={`/jouer?mode=local&theme=${a.theme.id}`} className="sticker sticker-ghost sticker-sm">Entre potes</a>
            <a href={`/jouer?mode=online&theme=${a.theme.id}`} className="sticker sticker-ghost sticker-sm">En ligne</a>
            <a href={`/blindtest/${a.slug}`} className="sticker sticker-ghost sticker-sm">Tout savoir <ArrowRight size={13} /></a>
          </div>
        </section>

        {/* Artistes proches */}
        <section aria-labelledby="rel-title">
          <h2 id="rel-title" className="font-display text-2xl font-bold mb-4">Artistes proches de {a.name}</h2>
          <ul className="flex flex-wrap gap-2">
            {(relatedLinked.some((r) => r.entry) ? relatedLinked : fallbackRelated.map((e) => ({ id: 0, name: e.name, picture: "", entry: e }))).map((r) =>
              r.entry ? (
                <li key={r.entry.slug}>
                  <a href={`/artistes/${r.entry.slug}`} className="inline-flex items-center gap-2 rounded-full pl-1 pr-3.5 py-1 bg-white/5 border border-white/10 hover:border-gold/50 text-sm font-medium transition-colors">
                    {r.picture ? <img src={r.picture} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover" /> : <span className="w-7 h-7 rounded-full bg-gold/20 text-gold grid place-items-center"><Music2 size={13} /></span>}
                    {r.name}
                  </a>
                </li>
              ) : (
                <li key={r.id} className="inline-flex items-center gap-2 rounded-full pl-1 pr-3.5 py-1 bg-white/[0.03] border border-white/6 text-sm text-ink-faint">
                  {r.picture ? <img src={r.picture} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover opacity-70" /> : null}
                  {r.name}
                </li>
              )
            )}
          </ul>
          <a href="/artistes" className="inline-flex items-center gap-1.5 text-sm text-gold hover:text-glow mt-5">Tous les artistes <ArrowRight size={14} /></a>
        </section>
      </article>
    </>
  );
}
