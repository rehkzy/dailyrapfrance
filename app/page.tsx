import { ArrowRight, Gamepad2, Trophy, Users2 } from "lucide-react";
import Reveal from "@/components/Reveal";
import Magnetic from "@/components/Magnetic";
import ParallaxGlow from "@/components/ParallaxGlow";
import LogoShowcase from "@/components/LogoShowcase";
import { InstagramIcon, TikTokIcon, XIcon } from "@/components/SocialIcons";

const features = [
  {
    Icon: Gamepad2,
    title: "Blind Test",
    text: "90s, cloud rap, 93, 91, Marseille... des dizaines de thèmes, seul ou entre potes.",
    href: "/blindtest",
    cta: "Jouer",
  },
  {
    Icon: Users2,
    title: "Salons privés",
    text: "Crée une partie, partage le code, jouez en même temps chacun sur votre téléphone.",
    href: "/blindtest",
    cta: "Créer un salon",
  },
  {
    Icon: Trophy,
    title: "Classement",
    text: "Connecte-toi, enregistre tes scores, grimpe dans le classement général.",
    href: "/blindtest/classement",
    cta: "Voir le classement",
  },
];

const socials = [
  { label: "Instagram", href: "https://www.instagram.com/dailyrapfrance/", Icon: InstagramIcon },
  { label: "TikTok", href: "https://www.tiktok.com/@dailyrapfrance", Icon: TikTokIcon },
  { label: "X", href: "https://x.com/DailyRapFrance", Icon: XIcon },
];

export default function Home() {
  return (
    <>
      {/* Hero — l'icône seule, en grand, comme un écran de lancement d'app */}
      <Reveal>
      <section className="relative overflow-hidden min-h-[88vh] sm:min-h-[92vh] flex flex-col">
        <ParallaxGlow />

        <div className="relative flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-8">
          <LogoShowcase />
        </div>

        <div className="relative max-w-2xl mx-auto px-6 pb-14 sm:pb-20 text-center w-full">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4 sm:mb-5">
            Média indépendant · Depuis avril 2020
          </p>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Le rap français, raconté avec passion.
          </h1>
          <p className="text-ink-muted text-base sm:text-lg max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Sans algorithme entre vous et la scène — et un blind test pour tester tes
            connaissances.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Magnetic className="w-full sm:w-auto">
              <a
                href="/blindtest"
                className="flex items-center justify-center gap-2 bg-gold text-white rounded-full pl-6 pr-5 py-3.5 sm:py-3 text-sm font-medium hover:bg-glow transition-colors w-full sm:w-auto"
              >
                Jouer au Blind Test
                <ArrowRight size={16} />
              </a>
            </Magnetic>
            <Magnetic className="w-full sm:w-auto">
              <a
                href="/a-propos"
                className="flex items-center justify-center gap-2 glass rounded-full pl-6 pr-5 py-3.5 sm:py-3 text-sm font-medium hover:border-gold/40 transition-colors w-full sm:w-auto"
              >
                Notre histoire
              </a>
            </Magnetic>
          </div>
        </div>
      </section>
      </Reveal>

      {/* Ce que tu trouveras ici — grille bento, la fonctionnalité phare mise en avant */}
      <Reveal>
      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
        <div className="grid sm:grid-cols-2 gap-4">
          {(() => {
            const featured = features[0];
            return (
              <a href={featured.href} className="group card card-lift p-7 sm:p-8 flex flex-col justify-between sm:row-span-2 min-h-[220px] sm:min-h-[360px] relative overflow-hidden">
                <div className="brand-pulse absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-gold/10 blur-2xl" aria-hidden="true" />
                <featured.Icon className="text-gold mb-5 relative" size={28} strokeWidth={1.6} />
                <div className="relative">
                  <h3 className="font-display text-2xl sm:text-3xl font-medium mb-3">{featured.title}</h3>
                  <p className="text-sm sm:text-base text-ink-muted leading-relaxed mb-5">{featured.text}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-gold group-hover:text-glow transition-colors">
                    {featured.cta} <ArrowRight size={13} />
                  </span>
                </div>
              </a>
            );
          })()}

          {features.slice(1).map((f) => (
            <a key={f.title} href={f.href} className="group card card-lift p-6 flex flex-col">
              <f.Icon className="text-gold mb-4" size={20} strokeWidth={1.6} />
              <h3 className="font-display text-lg font-medium mb-2">{f.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed mb-4 flex-1">{f.text}</p>
              <span className="text-xs font-mono uppercase tracking-wide text-gold group-hover:text-glow transition-colors">
                {f.cta} →
              </span>
            </a>
          ))}
        </div>
      </section>
      </Reveal>

      {/* Mission, condensée — le texte complet vit sur /a-propos */}
      <Reveal>
      <section className="max-w-3xl mx-auto px-6 py-14 sm:py-20 text-center border-y border-white/8">
        <p className="font-display text-xl sm:text-2xl md:text-3xl font-medium leading-snug mb-6">
          Pas d'algorithme qui décide de ce qui mérite d'être vu — une passion pour le rap
          français, racontée depuis 2020.
        </p>
        <a
          href="/a-propos"
          className="inline-flex items-center gap-1 font-mono text-xs text-gold uppercase tracking-[0.14em] hover:text-glow transition-colors"
        >
          Lire notre histoire <ArrowRight size={13} />
        </a>
      </section>
      </Reveal>

      {/* Rejoignez la communauté — closer, halo de marque + réseaux */}
      <Reveal>
      <section className="relative overflow-hidden">
        <ParallaxGlow />
        <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28 md:py-32 text-center">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-medium leading-tight mb-6">
            Rejoignez la communauté
          </h2>
          <p className="text-ink-muted text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Des milliers de passionnés suivent déjà DailyRapFrance pour rester informés de
            l'actualité du rap français.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3 sm:gap-4">
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
