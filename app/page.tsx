import { ArrowRight, ArrowUpRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import NewsTicker from "@/components/NewsTicker";
import Magnetic from "@/components/Magnetic";
import ParallaxGlow from "@/components/ParallaxGlow";
import Row from "@/components/Row";
import PosterCard from "@/components/PosterCard";
import { InstagramIcon, TikTokIcon, XIcon } from "@/components/SocialIcons";
import {
  getNews,
  getReleases,
  getArtists,
  getStreamingChart,
  getCertifications,
} from "@/lib/queries";

export const revalidate = 300;

const socials = [
  { label: "Instagram", href: "https://www.instagram.com/dailyrapfrance/", Icon: InstagramIcon },
  { label: "TikTok", href: "https://www.tiktok.com/@dailyrapfrance", Icon: TikTokIcon },
  { label: "X", href: "https://x.com/DailyRapFrance", Icon: XIcon },
];

export default async function Home() {
  const [news, releases, artists, chart, certifications] = await Promise.all([
    getNews(9),
    getReleases(),
    getArtists(),
    getStreamingChart(15),
    getCertifications(15),
  ]);

  const recentReleases = releases.slice(0, 15);
  const topArtists = artists.slice(0, 15);

  return (
    <>
      {/* Hero unique — emblème de marque en haut, texte et CTA ancrés en bas de la même section */}
      <Reveal>
      <section className="relative overflow-hidden border-b border-white/8 min-h-[92vh] flex flex-col">
        <ParallaxGlow />

        <div className="relative flex-1 flex flex-col items-center justify-center px-6 pt-28 pb-10">
          <img
            src="/icon.svg"
            alt=""
            aria-hidden="true"
            className="brand-pulse h-16 md:h-24 w-auto mx-auto mb-8 drop-shadow-[0_0_40px_rgba(240,0,28,0.35)]"
          />
          <img src="/logo.svg" alt="DailyRapFrance" className="w-full max-w-md md:max-w-lg mx-auto h-auto" />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 pb-16 md:pb-20 text-center w-full">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-5">
            Média indépendant · Depuis avril 2020
          </p>
          <h1 className="font-display font-semibold tracking-tight leading-[1.05] text-[8vw] md:text-4xl lg:text-5xl mb-5">
            Le rap français, raconté en continu<span className="text-gold">.</span>
          </h1>
          <p className="text-ink-muted text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Actualités, sorties, artistes émergents, charts et certifications — un seul endroit
            pour suivre la scène, sans algorithme entre vous et elle.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Magnetic>
              <a
                href="/mag"
                className="inline-flex items-center gap-2 bg-gold text-white rounded-full pl-6 pr-5 py-3 text-sm font-medium hover:bg-glow transition-colors"
              >
                Découvrir
                <ArrowRight size={16} />
              </a>
            </Magnetic>
            <Magnetic>
              <a
                href="/a-propos"
                className="inline-flex items-center gap-2 glass rounded-full pl-6 pr-5 py-3 text-sm font-medium hover:border-gold/40 transition-colors"
              >
                Plus d'infos
              </a>
            </Magnetic>
          </div>
        </div>
      </section>
      </Reveal>

      {/* Flux actu en direct — vrai RSS agrégé */}
      <NewsTicker items={news.map((n) => ({ title: n.title, source: n.source, link: n.link }))} />

      {/* Rangées façon Netflix — même vocabulaire de carte partout, contenu réel */}
      <div className="py-4">
        {recentReleases.length > 0 && (
          <Row title="Sorties récentes" viewAllHref="/sorties">
            {recentReleases.map((r) => (
              <PosterCard
                key={r.slug}
                href={`/sortie/${r.slug}`}
                title={r.title}
                subtitle={r.artistName}
                imageUrl={r.coverUrl}
                badge={r.type}
              />
            ))}
          </Row>
        )}

        {topArtists.length > 0 && (
          <Row title="Artistes en vogue" viewAllHref="/artistes">
            {topArtists.map((a) => (
              <PosterCard
                key={a.slug}
                href={`/artiste/${a.slug}`}
                title={a.name}
                subtitle={a.city ?? undefined}
                imageUrl={a.photoUrl}
                circle
              />
            ))}
          </Row>
        )}

        {chart.length > 0 && (
          <Row title="Chart Rap France" viewAllHref="/charts">
            {chart.map((c) => (
              <PosterCard
                key={c.artistSlug + c.position}
                href={`/artiste/${c.artistSlug}`}
                title={c.artistName}
                subtitle={c.releaseTitle ?? `#${c.position} cette semaine`}
                badge={`#${c.position}`}
              />
            ))}
          </Row>
        )}

        {certifications.length > 0 && (
          <Row title="Certifications récentes" viewAllHref="/certifications">
            {certifications.map((c) => (
              <PosterCard
                key={c.id}
                href={`/artiste/${c.artistSlug}`}
                title={c.releaseTitle ?? c.artistName}
                subtitle={c.artistName}
                badge={c.level}
              />
            ))}
          </Row>
        )}
      </div>

      {/* Dernières infos — format article, pas poster */}
      <Reveal>
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-20">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-medium">Dernières infos</h2>
          <a
            href="/mag"
            className="font-mono text-xs text-ink-faint uppercase hover:text-gold transition-colors flex items-center gap-1"
          >
            Tout le mag <ArrowUpRight size={13} />
          </a>
        </div>

        {news.length === 0 ? (
          <div className="card p-8 text-center text-ink-muted text-sm">
            Le flux d'actus n'a pas encore tourné. Revenez dans quelques minutes.
          </div>
        ) : (
          <div className="divide-y divide-white/8">
            {news.map((n) => (
              <a
                key={n.link}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-6 py-5 group hover:bg-white/5 transition-colors -mx-4 px-4 rounded"
              >
                <span className="font-mono text-xs text-gold uppercase shrink-0 pt-1 w-24">
                  {n.source}
                </span>
                <span className="flex-1 font-medium leading-snug group-hover:text-gold transition-colors">
                  {n.title}
                </span>
                <span className="font-mono text-xs text-ink-faint shrink-0 pt-1">
                  {new Date(n.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
      </Reveal>

      {/* Teaser mission, condensé — le texte complet vit sur /a-propos */}
      <Reveal>
      <section className="max-w-3xl mx-auto px-6 py-16 md:py-20 text-center">
        <p className="font-display text-2xl md:text-3xl font-medium leading-snug mb-6">
          Pas d'algorithme qui décide de ce qui mérite d'être vu — une équipe qui écoute,
          cherche, et croit au potentiel des nouveaux talents.
        </p>
        <a
          href="/a-propos"
          className="inline-flex items-center gap-1 font-mono text-xs text-gold uppercase tracking-[0.14em] hover:text-glow transition-colors"
        >
          Notre histoire <ArrowUpRight size={13} />
        </a>
      </section>
      </Reveal>

      {/* Rejoignez la communauté — le closer, halo de marque + CTA + réseaux */}
      <Reveal>
      <section className="relative overflow-hidden">
        <ParallaxGlow />
        <div className="max-w-4xl mx-auto px-6 py-28 md:py-36 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-medium leading-tight mb-6">
            Rejoignez la communauté
          </h2>
          <p className="text-ink-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Des milliers de passionnés suivent déjà DailyRapFrance pour rester informés de
            l'actualité du rap français.
          </p>

          <Magnetic className="mt-10">
            <a
              href="/mag"
              className="inline-flex items-center gap-2 bg-gold text-white rounded-full pl-6 pr-5 py-3 text-sm font-medium hover:bg-glow transition-colors"
            >
              Explorer DailyRapFrance
              <ArrowRight size={16} />
            </a>
          </Magnetic>

          <div className="mt-14 flex flex-wrap justify-center gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="glass rounded-full pl-4 pr-6 py-3 text-sm font-medium hover:bg-white/10 hover:border-gold/40 transition-colors flex items-center gap-2"
              >
                <s.Icon />
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </section>
      </Reveal>
    </>
  );
}
