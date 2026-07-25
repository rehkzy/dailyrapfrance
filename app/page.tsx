import { Newspaper, Compass, Sparkles, Disc, ArrowRight, ArrowUpRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import NewsTicker from "@/components/NewsTicker";
import { InstagramIcon, TikTokIcon, XIcon } from "@/components/SocialIcons";
import { getNews } from "@/lib/queries";

export const revalidate = 300;

const rubriques = [
  {
    Icon: Newspaper,
    title: "Actualités",
    text: "Suivez les dernières annonces, les sorties d'albums, les nouveaux clips, les collaborations, les tournées et tous les événements qui rythment le rap français.",
    href: "/mag",
  },
  {
    Icon: Compass,
    title: "Découverte",
    text: "Chaque semaine, découvrez de nouveaux artistes, producteurs, beatmakers et talents émergents qui participent à l'évolution de la scène.",
    href: "/artistes",
  },
  {
    Icon: Sparkles,
    title: "Culture",
    text: "Interviews, analyses, dossiers, rétrospectives et décryptages pour mieux comprendre l'histoire, les tendances et les enjeux du rap français.",
    href: "/mag",
  },
  {
    Icon: Disc,
    title: "Sorties musicales",
    text: "Retrouvez les albums, EP, mixtapes et singles dès leur sortie, réunis dans un espace dédié.",
    href: "/sorties",
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
            Média indépendant · Depuis avril 2020
          </p>
          <h1 className="font-display font-semibold tracking-tight leading-[1.02] text-[9vw] md:text-[5.4vw] lg:text-[4.75rem] max-w-5xl">
            Le média indépendant qui raconte le rap français<span className="text-gold">.</span>
          </h1>
          <p className="text-ink-muted text-lg md:text-xl max-w-2xl mt-8 leading-relaxed">
            Actualités, sorties, interviews, clips, analyses et culture urbaine : DailyRapFrance
            met en lumière celles et ceux qui font vivre le rap français, des artistes émergents
            aux figures incontournables.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-8">
            <a
              href="#mission"
              className="inline-flex items-center gap-2 bg-gold text-white rounded-full pl-6 pr-5 py-3 text-sm font-medium hover:bg-glow transition-colors"
            >
              Découvrir le média
              <ArrowRight size={16} />
            </a>
            <div className="flex items-center gap-3 text-ink-faint">
              <span className="font-mono text-xs uppercase tracking-[0.2em]">Scroller</span>
              <span className="h-8 w-px bg-ink-faint/40 animate-bounce" aria-hidden="true" />
            </div>
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

      {/* Notre mission */}
      <Reveal>
      <section id="mission" className="max-w-4xl mx-auto px-6 pt-32 pb-24 md:pt-40 md:pb-28 scroll-mt-16">
        <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-6">(Mission)</p>
        <h2 className="font-display text-3xl md:text-5xl font-medium leading-tight mb-10">
          Notre mission
        </h2>
        <div className="space-y-6 text-lg md:text-xl text-ink-muted leading-relaxed max-w-3xl">
          <p>
            Chez DailyRapFrance, nous croyons que le rap est bien plus qu'un genre musical :
            c'est une culture, un mouvement et un reflet de la société.
          </p>
          <p>
            Notre mission est de proposer une information fiable, accessible et indépendante,
            en donnant de la visibilité aux artistes, aux projets et aux acteurs qui façonnent
            la scène rap francophone.
          </p>
          <p>
            Nous couvrons l'actualité avec une approche éditoriale libre, sans parti pris
            commercial, en privilégiant les faits, le contexte et la qualité des contenus.
          </p>
        </div>
      </section>
      </Reveal>

      {/* Ce que vous trouverez — les quatre rubriques du média */}
      <Reveal>
      <section id="rubriques" className="max-w-6xl mx-auto px-6 py-20 md:py-28 scroll-mt-16">
        <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-6">(Rubriques)</p>
        <h2 className="font-display text-3xl md:text-5xl font-medium leading-tight mb-14">
          Ce que vous trouverez
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {rubriques.map((r, i) => (
            <a key={r.title} href={r.href} className="group card card-lift p-8 md:p-10">
              <div className="flex items-start justify-between mb-8">
                <r.Icon className="text-gold" size={24} strokeWidth={1.6} />
                <span className="font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="font-display text-xl md:text-2xl font-medium mb-3 group-hover:text-gold transition-colors">
                {r.title}
              </h3>
              <p className="text-ink-muted leading-relaxed">{r.text}</p>
            </a>
          ))}
        </div>
      </section>
      </Reveal>

      {/* Deux facettes de l'identité éditoriale, en vis-à-vis */}
      <Reveal>
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-px bg-white/8 rounded-2xl overflow-hidden">
          <div className="bg-bg p-10 md:p-14">
            <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-6">(Indépendance)</p>
            <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Un média indépendant</h2>
            <div className="space-y-4 text-ink-muted leading-relaxed">
              <p className="text-ink font-medium">DailyRapFrance est un média éditorial indépendant.</p>
              <p>
                Notre priorité est de proposer une couverture de qualité, sans privilégier un
                label, une plateforme ou un artiste. Nous sélectionnons nos sujets selon leur
                intérêt éditorial et leur impact sur la culture rap.
              </p>
              <p>
                Notre indépendance nous permet de mettre autant en avant les nouveaux talents
                que les artistes confirmés.
              </p>
            </div>
          </div>
          <div className="bg-bg p-10 md:p-14">
            <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-6">(Vision)</p>
            <h2 className="font-display text-2xl md:text-3xl font-medium mb-6">Une vision de la culture rap</h2>
            <div className="space-y-4 text-ink-muted leading-relaxed">
              <p className="text-ink font-medium">Le rap évolue chaque jour.</p>
              <p>
                Notre ambition est de documenter cette évolution, de conserver la mémoire de
                cette culture et de créer une plateforme de référence où chacun peut suivre son
                actualité, découvrir de nouveaux artistes et mieux comprendre l'écosystème du
                rap français.
              </p>
            </div>
          </div>
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

      {/* Rejoignez la communauté — le vrai closer, halo de marque + CTA + réseaux */}
      <Reveal>
      <section className="relative overflow-hidden">
        <div className="brand-glow" aria-hidden="true" />
        <div className="max-w-4xl mx-auto px-6 py-32 md:py-40 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-medium leading-tight mb-6">
            Rejoignez la communauté
          </h2>
          <p className="text-ink-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Des milliers de passionnés suivent déjà DailyRapFrance pour rester informés de
            l'actualité du rap français. Découvrez les dernières sorties, les nouveaux talents
            et les histoires qui façonnent la culture urbaine.
          </p>

          <a
            href="/mag"
            className="mt-10 inline-flex items-center gap-2 bg-gold text-white rounded-full pl-6 pr-5 py-3 text-sm font-medium hover:bg-glow transition-colors"
          >
            Explorer DailyRapFrance
            <ArrowRight size={16} />
          </a>

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
