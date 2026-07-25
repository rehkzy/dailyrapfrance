import Reveal from "@/components/Reveal";

const pillars = [
  { n: "01", title: "Actus", text: "Sorties, annonces, mouvements de la scène — traités vite, racontés bien." },
  { n: "02", title: "Interviews", text: "La parole aux artistes, sans filtre, sans détour." },
  { n: "03", title: "Culture", text: "Le rap français comme phénomène culturel, pas juste comme flux de contenu." },
];

const socials = [
  { label: "Instagram", href: "#" },
  { label: "TikTok", href: "#" },
  { label: "YouTube", href: "#" },
  { label: "X", href: "#" },
];

export default function Home() {
  return (
    <>
      {/* Hero — immense, presque nu */}
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-32 md:pt-40 md:pb-40">
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
      </section>

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

      {/* Trois piliers éditoriaux, en très grand */}
      <Reveal>
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-3 gap-px bg-white/8">
          {pillars.map((p) => (
            <div key={p.n} className="bg-bg p-10 md:p-12">
              <p className="font-mono text-xs text-gold mb-8">{p.n}</p>
              <h3 className="font-display text-2xl md:text-3xl font-medium mb-4">{p.title}</h3>
              <p className="text-ink-muted leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
      </Reveal>

      {/* Bientôt — honnête sur l'état actuel, sans jargon data */}
      <Reveal>
      <section className="max-w-4xl mx-auto px-6 py-32 md:py-40 text-center">
        <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-6">
          En préparation
        </p>
        <h2 className="font-display text-3xl md:text-5xl font-medium leading-tight mb-6">
          Le nouveau DailyRapFrance arrive.
        </h2>
        <p className="text-ink-muted text-lg max-w-xl mx-auto">
          Articles, interviews, et tout ce qui fait vivre le rap français —
          bientôt ici. En attendant, suivez-nous.
        </p>
      </section>
      </Reveal>

      {/* Réseaux — le vrai CTA en l'absence de contenu */}
      <Reveal>
      <section className="max-w-4xl mx-auto px-6 pb-32 md:pb-40">
        <div className="flex flex-wrap justify-center gap-4">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              className="glass rounded-full px-6 py-3 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              {s.label}
            </a>
          ))}
        </div>
      </section>
      </Reveal>
    </>
  );
}
