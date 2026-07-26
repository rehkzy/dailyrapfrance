import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import Magnetic from "@/components/Magnetic";
import ParallaxGlow from "@/components/ParallaxGlow";

export default function Home() {
  return (
    <Reveal>
    <section className="relative overflow-hidden min-h-[92vh] flex flex-col">
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

      <div className="relative max-w-2xl mx-auto px-6 pb-16 md:pb-20 text-center w-full">
        <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-5">
          Média indépendant · Depuis avril 2020
        </p>
        <p className="text-ink-muted text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Le rap français, raconté avec passion — sans algorithme entre vous et la scène.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <a
              href="/a-propos"
              className="inline-flex items-center gap-2 bg-gold text-white rounded-full pl-6 pr-5 py-3 text-sm font-medium hover:bg-glow transition-colors"
            >
              Notre histoire
              <ArrowRight size={16} />
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href="/blindtest"
              className="inline-flex items-center gap-2 glass rounded-full pl-6 pr-5 py-3 text-sm font-medium hover:border-gold/40 transition-colors"
            >
              Jouer au Blind Test
            </a>
          </Magnetic>
        </div>
      </div>
    </section>
    </Reveal>
  );
}
