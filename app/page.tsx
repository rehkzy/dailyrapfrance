import { ArrowRight, Gamepad2, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Users01 } from "@untitledui/icons";
import Reveal from "@/components/Reveal";
import Magnetic from "@/components/Magnetic";
import ParallaxGlow from "@/components/ParallaxGlow";
import LogoShowcase from "@/components/LogoShowcase";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import FlipWords from "@/components/ui/FlipWords";
import SocialLinks from "@/components/SocialLinks";

// Icône "salon" harmonisée sur tout le site (Untitled UI) — avant, la page d'accueil
// utilisait Users2 (lucide) et l'écran de jeu utilisait Globe (lucide) pour représenter le
// même concept ("des fois c'est un logo, des fois c'est une planète", relevé par l'audit).
// Cast vers LucideIcon : les deux librairies exposent des composants structurellement
// compatibles (size/className), seul le typage strict de lucide-react l'ignore.
const SalonIcon = Users01 as unknown as LucideIcon;

export default function Home() {
  return (
    <>
      {/* Hero — l'icône seule, en grand, comme un écran de lancement d'app */}
      <Reveal>
      <section className="relative overflow-hidden min-h-[56vh] sm:min-h-[64vh] flex flex-col">
        <ParallaxGlow />

        <div className="relative flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
          <LogoShowcase />
        </div>

        <div className="relative max-w-2xl mx-auto px-6 pb-14 sm:pb-20 text-center w-full">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4 sm:mb-5">
            Média indépendant · Depuis avril 2020
          </p>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Le rap français, raconté avec{" "}
            <FlipWords
              words={["passion", "exigence", "précision", "amour"]}
              className="text-gold"
            />
            .
          </h1>
          <p className="text-ink-muted text-base sm:text-lg max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Sans algorithme entre vous et la scène — et une arcade de jeux pour tester tes
            connaissances.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Magnetic className="w-full sm:w-auto">
              <BorderMagicButton href="/jouer" size="lg" fullWidth className="sm:w-auto">
                Jouer
                <ArrowRight size={16} />
              </BorderMagicButton>
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

      {/* Modes de jeu — rangée de tuiles de catégories scrollable (gabarit plateforme de
          jeux : dégradé sombre → teinte, icône en haut à droite, libellé en bas), suivie
          des vignettes avec badges. Remplace l'ancienne grille bento. */}
      <Reveal>
      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-6 px-6 snap-x">
          {[
            { label: "Solo", emoji: "🎧", href: "/jouer?mode=solo", gradient: "linear-gradient(135deg, #2a0509 0%, #7a0f0f 100%)" },
            { label: "Entre potes", emoji: "🎉", href: "/jouer?mode=local", gradient: "linear-gradient(135deg, #3a0505 0%, #a3121b 100%)" },
            { label: "Salon en ligne", emoji: "🌍", href: "/jouer?mode=online", gradient: "linear-gradient(135deg, #1c0406 0%, #f0001c 130%)" },
            { label: "Mode Soirée", emoji: "📺", href: "/jouer?mode=party", gradient: "linear-gradient(135deg, #7a0f0f 0%, #ff6b3b 140%)" },
            { label: "Classement", emoji: "🏆", href: "/blindtest/classement", gradient: "linear-gradient(135deg, #12060a 0%, #5c0a10 100%)" },
            { label: "Autres jeux", emoji: "🎮", href: "/jouer", gradient: "linear-gradient(135deg, #0a0707 0%, #3a0505 100%)" },
          ].map((c) => (
            <a key={c.label} href={c.href} className="cat-card snap-start shrink-0" style={{ background: c.gradient }}>
              <span className="cat-icon" aria-hidden="true">{c.emoji}</span>
              <span className="cat-label">{c.label}</span>
            </a>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          {[
            {
              badge: "Top" as const,
              badgeClass: "thumb-badge-top",
              title: "Blind Test",
              text: "90s, cloud rap, 93, Marseille... des dizaines de thèmes.",
              href: "/jouer",
              Icon: Gamepad2,
              gradient: "radial-gradient(120% 110% at 80% 0%, rgba(240,0,28,0.5), transparent 55%), linear-gradient(160deg, #2a0509 0%, #0a0707 100%)",
            },
            {
              badge: "Nouveau" as const,
              badgeClass: "thumb-badge-new",
              title: "Salons privés",
              text: "Un code à partager, chacun sur son téléphone.",
              href: "/jouer?mode=online",
              Icon: SalonIcon,
              gradient: "radial-gradient(120% 110% at 20% 0%, rgba(120,1,1,0.7), transparent 60%), linear-gradient(200deg, #1c090c 0%, #0a0707 100%)",
            },
            {
              badge: "Hot" as const,
              badgeClass: "thumb-badge-hot",
              title: "Classement",
              text: "Enregistre tes scores, grimpe dans le top.",
              href: "/blindtest/classement",
              Icon: Trophy,
              gradient: "radial-gradient(130% 110% at 50% 110%, rgba(255,59,78,0.35), transparent 60%), linear-gradient(160deg, #170a0c 0%, #0a0707 100%)",
            },
          ].map((g) => (
            <a key={g.title} href={g.href} className="game-thumb min-h-[190px] p-5 flex flex-col justify-end">
              <span className="thumb-bg" style={{ background: g.gradient }} aria-hidden="true" />
              <span className={`thumb-badge ${g.badgeClass}`}>{g.badge}</span>
              <g.Icon className="text-gold mb-3" size={26} strokeWidth={1.8} />
              <h3 className="font-display text-xl font-semibold mb-1">{g.title}</h3>
              <p className="text-xs text-ink-muted leading-relaxed">{g.text}</p>
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
            <SocialLinks />
          </div>
        </div>
      </section>
      </Reveal>
    </>
  );
}
