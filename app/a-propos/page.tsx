import { ArrowRight, ArrowUpRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import Magnetic from "@/components/Magnetic";
import ParallaxGlow from "@/components/ParallaxGlow";

export const metadata = {
  title: "À propos — DailyRapFrance",
  description:
    "Plus qu'un média, une passion. L'histoire de DailyRapFrance et de son fondateur, Florian B.",
};

export default function AProposPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <ParallaxGlow />
        <div className="max-w-4xl mx-auto px-6 pt-28 pb-20 md:pt-36 md:pb-24">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-8">À propos</p>
          <h1 className="font-display font-semibold tracking-tight leading-[1.05] text-[9vw] md:text-[4.2vw] lg:text-4xl xl:text-5xl max-w-3xl">
            Plus qu'un média, une passion.
          </h1>
        </div>
      </section>

      {/* Mission */}
      <Reveal>
      <section className="max-w-3xl mx-auto px-6 pb-20 md:pb-28">
        <div className="space-y-6 text-lg text-ink-muted leading-relaxed">
          <p>
            DailyRapFrance est un média indépendant né d'une conviction simple : les plus
            grands artistes de demain commencent souvent dans l'ombre.
          </p>
          <p>
            Depuis nos débuts, nous suivons la scène rap avec un regard humain, curieux et
            passionné. Nous ne cherchons pas uniquement à couvrir ce qui fait déjà le buzz,
            mais aussi à mettre en lumière les talents émergents qui écriront l'histoire de
            demain.
          </p>
          <p>
            Nous avons toujours aimé découvrir les artistes avant qu'ils n'explosent. Beaucoup
            de ceux que nous avons mis en avant à leurs débuts sont aujourd'hui devenus des
            références de la scène. Ce n'est pas de la chance : c'est le résultat d'une veille
            permanente, d'une connaissance du terrain et d'une véritable passion pour le rap
            français.
          </p>
          <p>
            Chez DailyRapFrance, il n'y a pas d'algorithme qui décide de ce qui mérite d'être
            vu. Derrière chaque article, chaque découverte et chaque recommandation, il y a une
            équipe qui écoute, échange, cherche et croit au potentiel des nouveaux talents.
          </p>
          <p>
            Notre ambition est simple : offrir de la visibilité à ceux qui la méritent, raconter
            les histoires derrière les projets et accompagner l'évolution de la culture rap avec
            authenticité.
          </p>
          <p>
            Que vous soyez fan, artiste indépendant, producteur ou simple curieux, vous
            trouverez ici un média proche de sa communauté, libre dans sa ligne éditoriale et
            animé par une seule envie : faire rayonner le rap français sous toutes ses formes.
          </p>
        </div>
      </section>
      </Reveal>

      {/* Citation de clôture — la ligne la plus forte du texte, mise en avant */}
      <Reveal>
      <section className="border-y border-white/8">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-20 text-center">
          <p className="font-display text-2xl md:text-3xl font-medium leading-snug">
            Parce que les plus belles carrières commencent souvent bien avant les premières
            certifications. <span className="text-gold">Et nous aimons être là dès le premier chapitre.</span>
          </p>
        </div>
      </section>
      </Reveal>

      {/* Histoire du fondateur */}
      <Reveal>
      <section className="max-w-3xl mx-auto px-6 py-20 md:py-28">
        <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-6">(Notre histoire)</p>
        <h2 className="font-display text-3xl md:text-4xl font-medium leading-tight mb-10">
          L'histoire de DailyRapFrance
        </h2>
        <div className="space-y-6 text-lg text-ink-muted leading-relaxed">
          <p>
            En 2020, pendant le confinement, je cherchais simplement un projet qui me passionne.
            Comme beaucoup, je me suis retrouvé avec du temps devant moi et l'envie de créer
            quelque chose d'utile.
          </p>
          <p>
            Graphiste de métier et passionné de rap français depuis toujours, j'ai lancé
            DailyRapFrance sans imaginer ce que le projet allait devenir. Au départ, c'était un
            simple compte pour partager les dernières actualités, les sorties musicales et les
            artistes que je découvrais au fil de mes écoutes.
          </p>
          <p>Petit à petit, une communauté s'est construite autour du projet.</p>
          <p>
            Au fil des années, DailyRapFrance est devenu un média indépendant suivi par des
            milliers de passionnés. Ce qui n'a jamais changé, en revanche, c'est notre façon de
            travailler : rester proches de la scène, prendre le temps d'écouter les projets et
            donner leur chance aux artistes émergents.
          </p>
          <p>
            Nous avons souvent mis en avant des talents avant qu'ils ne soient connus du grand
            public. Certains étaient encore totalement indépendants lorsqu'ils sont apparus sur
            nos pages. Les voir évoluer, remplir des salles et s'imposer dans le paysage du rap
            français est une immense fierté.
          </p>
          <p>Nous ne suivons pas uniquement les tendances. Nous essayons surtout de les repérer avant qu'elles n'explosent.</p>
          <p>
            Aujourd'hui, DailyRapFrance reste fidèle à sa philosophie : un média indépendant,
            humain et accessible, qui parle de rap avec passion, sans artifices et sans
            compromis.
          </p>
          <p className="text-ink font-medium">
            Derrière chaque publication, il y a avant tout un passionné de musique et de
            création, convaincu que les plus belles carrières commencent souvent dans l'ombre.
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
            créatif. Si vous souhaitez découvrir mon univers et mes autres projets, vous pouvez
            visiter mon portfolio.
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
            href="/mag"
            className="inline-flex items-center gap-2 bg-gold text-white rounded-full pl-6 pr-5 py-3 text-sm font-medium hover:bg-glow transition-colors"
          >
            Découvrir le mag
            <ArrowRight size={16} />
          </a>
        </Magnetic>
      </section>
      </Reveal>
    </>
  );
}
