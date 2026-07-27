import { ArrowRight, ArrowUpRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import Magnetic from "@/components/Magnetic";
import ParallaxGlow from "@/components/ParallaxGlow";
import CountUp from "@/components/CountUp";

export const metadata = {
  title: "À propos — DailyRapFrance",
  description:
    "Plus qu'un média, une passion. L'histoire de DailyRapFrance et de son fondateur, Florian B.",
};

export default function AProposPage() {
  return (
    <>
      {/* Hero — typographie kinétique : trois lignes de poids et de tailles différents plutôt
          qu'un bloc de titre uniforme. */}
      <section className="relative overflow-hidden">
        <ParallaxGlow />
        <div className="max-w-4xl mx-auto px-6 pt-28 pb-16 md:pt-40 md:pb-20">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-8">À propos</p>
          <h1 className="font-display font-semibold tracking-tight leading-[0.98]">
            <span className="block text-[11vw] md:text-[5vw] lg:text-6xl text-ink-faint/50">Plus qu'un média,</span>
            <span className="block text-[13vw] md:text-[6.5vw] lg:text-7xl">une passion.</span>
          </h1>
        </div>
      </section>

      {/* Chiffres clés — l'essentiel en un coup d'œil, avant même le premier paragraphe */}
      <Reveal>
        <section className="max-w-4xl mx-auto px-6 pb-16 md:pb-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 rounded-2xl overflow-hidden">
            {[
              { value: 2020, suffix: "", label: "Naissance, en plein confinement" },
              { value: 15, suffix: "+", label: "Thèmes dans le blind test" },
              { value: 3, suffix: "", label: "Réseaux où nous suivre" },
              { value: 0, suffix: "", label: "Algorithme entre vous et la scène" },
            ].map((stat) => (
              <div key={stat.label} className="bg-bg p-6 md:p-7">
                <p className="font-display text-4xl md:text-5xl font-semibold text-gold tabular-nums">
                  <CountUp to={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs text-ink-faint mt-2 leading-snug">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Mission — condensée à l'essentiel, en deux mouvements */}
      <Reveal>
        <section className="max-w-3xl mx-auto px-6 pb-20 md:pb-28">
          <div className="grid md:grid-cols-[1fr_2fr] gap-4 md:gap-10">
            <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase pt-1">Notre mission</p>
            <div className="space-y-6 text-lg text-ink-muted leading-relaxed">
              <p>
                DailyRapFrance est né d'une conviction simple : les plus grands artistes de
                demain commencent souvent dans l'ombre. Nous ne couvrons pas que le buzz déjà
                installé — nous cherchons les talents qui écriront l'histoire de demain, avant
                que tout le monde ne les connaisse.
              </p>
              <p>
                Ici, pas d'algorithme qui décide de ce qui mérite d'être vu. Derrière chaque
                découverte, une équipe qui écoute, échange et croit au potentiel des nouveaux
                talents — libre dans sa ligne éditoriale, proche de sa communauté.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Citation — la ligne la plus forte, seule, en très grand */}
      <Reveal>
        <section className="border-y border-white/8">
          <div className="max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
            <p className="font-display text-3xl md:text-5xl font-medium leading-[1.15] tracking-tight">
              Les plus belles carrières commencent souvent bien avant les premières
              certifications. <span className="text-gold">Nous aimons être là dès le premier chapitre.</span>
            </p>
          </div>
        </section>
      </Reveal>

      {/* Histoire du fondateur — condensée, gardant les lignes les plus fortes */}
      <Reveal>
        <section className="max-w-3xl mx-auto px-6 py-20 md:py-28">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-6">Notre histoire</p>
          <h2 className="font-display text-3xl md:text-4xl font-medium leading-tight mb-10">
            2020 — un compte, une passion,
            <br />
            <span className="text-ink-faint">et une communauté qui a suivi.</span>
          </h2>
          <div className="space-y-6 text-lg text-ink-muted leading-relaxed">
            <p>
              Graphiste de métier et passionné de rap français depuis toujours, j'ai lancé
              DailyRapFrance pendant le confinement, sans imaginer ce que le projet allait
              devenir — un simple compte pour partager les sorties et les artistes que je
              découvrais au fil de mes écoutes.
            </p>
            <p>
              Ce qui n'a jamais changé : rester proche de la scène, prendre le temps d'écouter
              les projets, et donner leur chance aux artistes émergents. Beaucoup de ceux que
              nous avons mis en avant à leurs débuts — parfois encore totalement indépendants —
              sont aujourd'hui des références du rap français. Les voir remplir des salles est
              une fierté qui ne s'use pas.
            </p>
            <p className="text-ink font-medium">
              Aujourd'hui encore : un média indépendant, humain et accessible, qui parle de rap
              avec passion, sans artifices et sans compromis.
            </p>
          </div>
        </section>
      </Reveal>

      {/* Signature — le fondateur, avec un vrai crédit vers son travail perso */}
      <Reveal>
        <section className="max-w-3xl mx-auto px-6 pb-24 md:pb-32">
          <div className="card p-8 md:p-10">
            <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Le mot du fondateur</p>
            <p className="text-ink-muted leading-relaxed mb-6">
              En parallèle de DailyRapFrance, j'exerce également en tant que graphiste et
              créatif. Si vous souhaitez découvrir mon univers et mes autres projets, vous
              pouvez visiter mon portfolio.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-display text-xl font-medium">Florian B.</p>
                <p className="text-sm text-ink-faint">Fondateur de DailyRapFrance · Graphiste & créatif</p>
              </div>
              <Magnetic>
                <a
                  href="https://florian-b.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 glass rounded-full pl-5 pr-4 py-2.5 text-sm font-medium hover:border-gold/40 hover:text-gold transition-colors"
                >
                  Voir le portfolio — florian-b.fr
                  <ArrowUpRight size={15} />
                </a>
              </Magnetic>
            </div>
          </div>
        </section>
      </Reveal>

      {/* CTA de sortie */}
      <Reveal>
        <section className="max-w-4xl mx-auto px-6 pb-28 md:pb-36 text-center">
          <Magnetic>
            <a
              href="/jouer"
              className="inline-flex items-center gap-2 bg-gold text-white rounded-full pl-6 pr-5 py-3 text-sm font-medium hover:bg-glow transition-colors"
            >
              Jouer au Blind Test
              <ArrowRight size={16} />
            </a>
          </Magnetic>
        </section>
      </Reveal>
    </>
  );
}
