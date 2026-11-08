import HelpTip from "@/components/HelpTip";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Play, ArrowRight, Disc3, Users, Music2 } from "lucide-react";
import { SITE } from "@/lib/seo";
import { ARTISTS, findArtist, findArtistByName, formatDuration, formatFans } from "@/lib/artists";
import { resolveArtist, artistTopTracksFull, artistAlbums, artistRelated } from "@/lib/deezerArtist";
import { jsonLd as toJsonLd } from "@/lib/jsonld";
import TrackPreviewList from "@/components/TrackPreviewList";
import ArtistTop from "@/components/ArtistTop";
import GimmickChips from "@/components/GimmickChips";
import BrandMark from "@/components/BrandMark";
import { artworkAt } from "@/lib/artworkSize";
import { gimmicksOf } from "@/lib/gimmicks";

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
  const heroImg = artist?.picture_xl ?? (artist?.picture_medium ? artworkAt(artist.picture_medium, 1000) : artist?.picture_big ?? null);
  const gimmicks = gimmicksOf(a.theme.id);
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
      {/* Affiche plein écran : le portrait, le nom par-dessus, les chiffres, et le bouton Jouer. */}
      <header className="artist-hero">
        {heroImg && <img src={heroImg} alt="" className="artist-hero-img" fetchPriority="high" />}
        <div className="artist-hero-fade" aria-hidden="true" />
        <div className="artist-hero-body">
          <nav aria-label="Fil d'Ariane" className="text-xs text-ink-faint mb-3 flex items-center gap-1.5 flex-wrap">
            <a href="/" className="hover:text-ink">DailyRapFrance</a><span aria-hidden="true">›</span>
            <a href="/artistes" className="hover:text-ink">Artistes</a><span aria-hidden="true">›</span>
            <span className="text-ink-muted">{a.name}</span>
          </nav>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold mb-2"><BrandMark size={11} /> Blind test · {YEAR}</p>
          <h1 className="artist-hero-name">{a.name}</h1>
          <p className="text-sm text-ink-muted mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {artist?.nb_fan ? <span className="inline-flex items-center gap-1.5"><Users size={13} /> {formatFans(artist.nb_fan)} fans</span> : null}
            {fullAlbums.length ? <span className="inline-flex items-center gap-1.5"><Disc3 size={13} /> {fullAlbums.length} album{fullAlbums.length > 1 ? "s" : ""}{firstYear ? ` depuis ${firstYear}` : ""}</span> : null}
            {tracks[0] ? <span className="inline-flex items-center gap-1.5"><Music2 size={13} /> N°1 : {tracks[0].title}</span> : null}
          </p>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-5 sm:px-6 pb-20">
        {/* Actions : jouer, et comment */}
        <div className="artist-actions">
          <a href={`/jouer?mode=solo&theme=${a.theme.id}&autostart=1`} className="artist-play" aria-label={`Jouer au blind test ${a.name}`}><Play size={26} fill="currentColor" className="ml-1" /></a>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold leading-tight">Jouer au blind test {a.name}</p>
            <p className="text-xs text-ink-muted">Gratuit · 30 s par extrait</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
          <a href={`/jouer?mode=solo&theme=${a.theme.id}`} className="artist-mode">Seul</a>
          <a href={`/jouer?mode=local&theme=${a.theme.id}`} className="artist-mode">Même téléphone</a>
          <a href={`/jouer?mode=online&theme=${a.theme.id}`} className="artist-mode">Avec mes amis</a>
          <a href={`/jouer?mode=party&theme=${a.theme.id}`} className="artist-mode">Soirée</a>
          <a href={`/jouer?mode=solo&theme=classics-${a.slug}`} className="artist-mode">Classiques</a>
        </div>

        <div className="mt-5"><ArtistTop themeId={a.theme.id} artistName={a.name} /></div>

        {gimmicks.length > 0 && (
          <section className="mt-6" aria-labelledby="gim-title">
            <h2 id="gim-title" className="font-display text-lg font-bold mb-1">Ses gimmicks réagissent pendant la partie</h2>

            <GimmickChips items={gimmicks} />
          </section>
        )}

        {/* Top 10 */}
        <section aria-labelledby="top-title" className="mt-10 mb-12">
          <div className="flex items-end justify-between gap-3 mb-1">
            <h2 id="top-title" className="font-display text-2xl font-bold">Titres les plus écoutés</h2>
            <HelpTip title="D'où vient ce classement ?" label="D'où vient ce classement ?"><p className="text-sm">Classement par popularité Deezer, actualisé chaque jour. Les extraits de 30 secondes sont fournis par Deezer.</p></HelpTip>
          </div>
          <div className="mb-4" />
          {tracks.length === 0 ? (
            <p className="text-sm text-ink-faint">Le classement n'est pas disponible pour le moment.</p>
          ) : (
            <TrackPreviewList tracks={tracks.map((t) => ({ id: t.id, title: t.title, album: t.album, cover: t.cover, preview: t.preview, duration: formatDuration(t.duration), explicit: t.explicit, link: t.link }))} />
          )}
        </section>

        {/* Discographie */}
        {fullAlbums.length > 0 && (
          <section aria-labelledby="disco-title" className="mb-12">
            <h2 id="disco-title" className="font-display text-2xl font-bold mb-4">Albums</h2>
            <ul className="artist-albums">
              {fullAlbums.slice(0, 14).map((al) => (
                <li key={al.id}>
                  {al.cover && <img src={al.cover} alt={`${al.title} — ${a.name}`} width={250} height={250} loading="lazy" />}
                  <p className="text-xs font-semibold mt-2 truncate">{al.title}</p>
                  {al.releaseDate && <p className="text-[11px] text-ink-faint">{al.releaseDate.slice(0, 4)}</p>}
                </li>
              ))}
            </ul>
            {albums.length > fullAlbums.length && <p className="text-xs text-ink-faint mt-3">+ {albums.length - fullAlbums.length} EP et singles.</p>}
          </section>
        )}

        {/* À propos (texte utile aux moteurs, discret pour les joueurs) */}
        <section className="mb-12">
          <h2 className="font-display text-lg font-bold mb-2">Le blind test {a.name}</h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            {tracks[0] ? <>Le son le plus écouté de {a.name} aujourd&apos;hui est « {tracks[0].title} »{tracks[0].album && tracks[0].album.toLowerCase() !== tracks[0].title.toLowerCase() ? ` (album ${tracks[0].album})` : ""}{latest ? `, dernier projet : ${latest.title}${latest.releaseDate ? ` (${latest.releaseDate.slice(0, 4)})` : ""}` : ""}. </> : null}
            {a.theme.text}. Un extrait démarre, tu retrouves le titre, et le featuring s&apos;il y en a un, le plus vite possible. Le classement de ce thème est séparé : ton meilleur score se compare à ceux des autres fans. <a href={`/blindtest/${a.slug}`} className="text-gold font-semibold">Tout savoir sur ce blind test <ArrowRight size={12} className="inline" /></a>
          </p>
        </section>

        {/* Artistes proches */}
        <section aria-labelledby="rel-title">
          <h2 id="rel-title" className="font-display text-2xl font-bold mb-4">Les fans aiment aussi</h2>
          <ul className="artist-related">
            {(relatedLinked.some((r) => r.entry) ? relatedLinked : fallbackRelated.map((e) => ({ id: 0, name: e.name, picture: "", entry: e }))).map((r) =>
              r.entry ? (
                <li key={r.entry.slug}>
                  <a href={`/artistes/${r.entry.slug}`} className="artist-related-item">
                    {r.picture ? <img src={r.picture} alt="" width={72} height={72} /> : <span className="ph"><Music2 size={18} /></span>}
                    <span>{r.name}</span>
                  </a>
                </li>
              ) : (
                <li key={r.id} className="artist-related-item" data-dim="true">
                  {r.picture ? <img src={r.picture} alt="" width={72} height={72} /> : <span className="ph"><Music2 size={18} /></span>}
                  <span>{r.name}</span>
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
