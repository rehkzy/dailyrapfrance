import BlindTest from "@/components/BlindTest";

export const metadata = {
  title: "Blind Test Rap Français en Ligne — Gratuit, Solo ou Multijoueur | DailyRapFrance",
  description:
    "Joue au meilleur blind test rap français en ligne, gratuitement. Plus de 15 thèmes : 90s, 2000s, cloud rap, 93, 91, Marseille... Seul, entre potes sur le même écran, ou en salon privé avec tes amis à distance.",
  alternates: { canonical: "https://dailyrapfrance.best/blindtest" },
  openGraph: {
    title: "Blind Test Rap Français en Ligne — DailyRapFrance",
    description:
      "Le blind test rap français gratuit : 90s, cloud rap, 93, 91, Marseille... Solo, entre potes ou en salon privé.",
    url: "https://dailyrapfrance.best/blindtest",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Game",
  name: "Blind Test Rap Français",
  description:
    "Blind test dédié au rap français, en ligne et gratuit. Plusieurs thèmes (époques, styles, régions), mode solo, multijoueur local et salons privés en ligne.",
  genre: "Quiz musical",
  inLanguage: "fr-FR",
  url: "https://dailyrapfrance.best/blindtest",
  publisher: {
    "@type": "Organization",
    name: "DailyRapFrance",
    url: "https://dailyrapfrance.best",
  },
};

export default function BlindTestPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-16">
        <div className="text-center mb-10">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Jeu</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            Blind Test Rap Français
          </h1>
          <p className="text-ink-muted max-w-lg mx-auto">
            Le blind test du rap français, gratuit et en ligne. Choisis un thème, seul ou entre
            potes.
          </p>
        </div>

        <BlindTest />
      </section>

      {/* Contenu éditorial pour le référencement — pas dans la vue de jeu elle-même, mais
          bien réel et indexable (pas de texte caché artificiellement, juste hors du parcours
          de jeu principal). */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-sm text-ink-muted leading-relaxed space-y-4 border-t border-white/8 pt-10">
        <h2 className="font-display text-xl text-ink font-medium mb-2">
          Le blind test rap français en ligne, gratuit et sans inscription payante
        </h2>
        <p>
          DailyRapFrance propose un blind test rap français en ligne parmi les plus complets :
          plus de quinze thèmes couvrant les années 90, 2000, 2010 et les sons les plus récents,
          ainsi que des sélections dédiées au cloud rap, à la pop mainstream et aux scènes
          régionales (rap 93, rap 91, rap 92, Marseille, Nord, Île-de-France...).
        </p>
        <p>
          Joue en solo pour tester tes connaissances du rap français, en multijoueur local sur
          le même écran entre amis, ou crée un salon privé en ligne avec un code à partager pour
          affronter tes potes à distance, chacun sur son téléphone. Titre et artiste rapportent
          chacun un point ; retrouver un featuring rapporte deux points bonus. Un joker par
          partie permet de réécouter un autre passage de l'extrait en cas de blocage.
        </p>
        <p>
          Connecte-toi avec ton compte Google pour sauvegarder tes scores et apparaître dans le{" "}
          <a href="/blindtest/classement" className="text-gold hover:text-glow transition-colors">
            classement général
          </a>
          .
        </p>
      </section>
    </>
  );
}
