import { Newspaper, Mic2, Sparkles, ArrowUpRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import NewsTicker from "@/components/NewsTicker";
import { InstagramIcon, TikTokIcon, XIcon } from "@/components/SocialIcons";
import { getNews } from "@/lib/queries";

export const revalidate = 300;

const pillars = [
  {
    Icon: Newspaper,
    title: "Actus",
    text: "Sorties, annonces, mouvements de la scène — traités vite, racontés bien.",
  },
  {
    Icon: Mic2,
    title: "Interviews",
    text: "La parole aux artistes, sans filtre, sans détour.",
  },
  {
    Icon: Sparkles,
    title: "Culture",
    text: "Le rap français comme phénomène culturel, pas juste comme flux de contenu.",
  },
];

const explore = [
  { href: "/artistes", label: "Artistes", text: "Fiches, fans et discographies." },
  { href: "/sorties", label: "Sorties", text: "Albums, EP et singles à venir." },
  { href: "/charts", label: "Charts", text: "Le classement de la scène." },
  { href: "/explorer/graphe", label: "Explorer", text: "Le graphe relationnel du game." },
];

const socials = [
  { label: "Instagram", href: "https://www.instagram.com/dailyrapfrance/", Icon: InstagramIcon },
  { label: "TikTok", href: "https://www.tiktok.com/@dailyrapfrance", Icon: TikTokIcon },
  { label: "X", href: "https://x.com/DailyRapFrance", Icon: XIcon },
];

export default async function Home() {
  const news = await getNews(9);
  return (
    <>
      {/* Hero — le halo rouge concentré de l'identité de marque, pas un accent discret */}
      <section className="relative overflow-hidden">
        <div className="brand-glow" aria-hidden="true" />
        <div className="max-w-6xl mx-auto px-6 pt-28 pb-24 md:pt-40 md:pb-32">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-8">
            Depuis avril 2020
          </p>
          <h1 className="font-display font-semibold tracking-tight leading-[0.92] text-[15vw] md:text-[9vw] lg:text-[7.5rem]">
            Le média
            <br />
            du rap
            <br />
            français<span className="text-gold">.</span>
          </h1>

          <div className="mt-16 flex items-center gap-3 text-ink-faint">
            <span className="font-mono text-xs uppercase tracking-[0.2em]">Scroller</span>
            <span className="h-8 w-px bg-ink-faint/40 animate-bounce" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Flux actu en direct — vrai RSS agrégé (getNews), piste défilante façon lenis.dev */}
      <NewsTicker items={news.map((n) => ({ title: n.title, source: n.source, link: n.link }))} />

      {/* Bandeau cinétique — la seule "donnée" qu'on affiche : notre identité */}
      <div className="marquee-big py-6 border-y border-white/8">
        <div className="marquee-big-track">
          {[0, 1].map((i) => (
            <span key={i} className="inline-flex items-center">
              {["DAILYRAPFRANCE", "LE RAP FRANÇAIS, RACONTÉ", "DEPUIS 2020"].map((t) => (
                <span key={t} className="font-display text-3xl md:text-5xl font-semibold px-8 text-ink-faint">
                  {t} <span className="text-gold">•</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Manifeste éditorial — pas un pitch data */}
      <Reveal>
      <section className="max-w-4xl mx-auto px-6 py-32 md:py-40">
        <p className="font-display text-3xl md:text-5xl font-medium leading-tight">
          Pas un flux d'articles interchangeables. Un point de vue,
          une exigence, et l'amour d'une scène qui n'arrête pas
          de se réinventer.
        </p>
      </section>
      </Reveal>

      {/* Trois piliers éditoriaux — trois familles de contenu, pas une séquence à suivre */}
      <Reveal>
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-3 gap-4">
          {pillars.map((p) => (
            <div key={p.title} className="card card-lift p-10 md:p-12">
              <p.Icon className="text-gold mb-8" size={22} strokeWidth={1.6} />
              <h3 className="font-display text-2xl md:text-3xl font-medium mb-4">{p.title}</h3>
              <p className="text-ink-muted leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
      </Reveal>

      {/* Dernières infos — vrai flux, agrégé depuis des sources rap FR publiques */}
      <Reveal>
      <section className="max-w-4xl mx-auto px-6 py-20 md:py-28">
        <div className="flex items-baseline justify-between mb-10">
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

      {/* La plateforme — ce que le site fait vraiment, au-delà du flux d'actus */}
      <Reveal>
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <h2 className="font-display text-2xl md:text-3xl font-medium mb-10">Explorer la scène</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {explore.map((e) => (
            <a key={e.href} href={e.href} className="group card card-lift p-6 flex flex-col justify-between min-h-[140px]">
              <span className="font-display text-lg font-medium group-hover:text-gold transition-colors">{e.label}</span>
              <span className="text-sm text-ink-muted mt-3">{e.text}</span>
            </a>
          ))}
        </div>
      </section>
      </Reveal>

      {/* Réseaux — le vrai CTA en l'absence de contenu original */}
      <Reveal>
      <section className="max-w-4xl mx-auto px-6 pb-32 md:pb-40">
        <div className="flex flex-wrap justify-center gap-4">
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
      </section>
      </Reveal>
    </>
  );
}
