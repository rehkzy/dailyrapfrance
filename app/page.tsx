import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import Magnetic from "@/components/Magnetic";
import ParallaxGlow from "@/components/ParallaxGlow";
import LogoShowcase from "@/components/LogoShowcase";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import FlipWords from "@/components/ui/FlipWords";
import SocialLinks from "@/components/SocialLinks";
import GameCover from "@/components/GameCover";

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

        <div className="flex items-center justify-between mt-10 mb-3">
          <h2 className="font-display text-lg sm:text-xl font-semibold">L&apos;arcade DailyRap</h2>
          <a href="/jouer" className="text-xs font-mono uppercase tracking-wide text-gold hover:text-glow transition-colors">
            Voir tous les jeux →
          </a>
        </div>
        <div className="nf-row -mx-6 px-6">
          {[
            { title: "Blind Test", href: "/jouer?play=1", cover: "/jeux/blind-test.png", flag: null },
            { title: "La Tracklist", href: "/jeux/tracklist", cover: "/jeux/tracklist.png", flag: "Défi du jour" },
            { title: "Plus Haut, Plus Bas", href: "/jeux/plus-haut", cover: "/jeux/plus-haut.png", flag: null },
            { title: "Le Tribunal", href: "/jeux/tribunal", cover: "/jeux/tribunal.png", flag: "Vote du jour" },
            { title: "Coach A&R", href: "/jeux/pronos", cover: "/jeux/coach-ar.png", flag: null },
            { title: "La Punchline", href: "/jeux/punchline", cover: "/jeux/punchline.png", flag: null },
            { title: "Ghostwriter", href: "/jeux/ghostwriter", cover: "/jeux/ghostwriter.png", flag: null },
          ].map((g) => (
            <GameCover key={g.href} href={g.href} cover={g.cover} title={g.title} flag={g.flag} variant="poster" />
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
