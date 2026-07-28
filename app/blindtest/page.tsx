import { Suspense } from "react";
import BlindTest from "@/components/BlindTest";
import BlindTestLogo from "@/components/BlindTestLogo";

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
      {/* Fond ambiant ancré au viewport — remplace le bg-bg plat qui apparaissait "noir
          brut" dès qu'on descend un peu dans le wizard (liste de thèmes notamment). */}
      <div className="aurora-fixed" aria-hidden="true" />

      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-6 sm:pt-16 pb-16">
        {/* Identité du jeu — le lockup de marque, pas un titre de page. Le h1 englobe le
            lockup : tout le texte reste dans le DOM, le SEO ne perd rien. */}
        <div id="game-intro" className="flex justify-center mb-6 sm:mb-12">
          <h1 className="m-0">
            <BlindTestLogo markSize={60} spinning />
          </h1>
        </div>

        <Suspense fallback={<div className="h-96" aria-hidden="true" />}>
          <BlindTest />
        </Suspense>
      </section>

      {/* Contenu éditorial pour le référencement — présent dans le DOM et indexable par les
          moteurs de recherche (et lisible par les lecteurs d'écran), mais visuellement masqué :
          ce n'est plus un bloc de texte que les visiteurs voient sur la page. `sr-only` est la
          technique standard pour ça (contrairement à display:none, ce n'est pas du texte caché
          artificiellement aux yeux d'un moteur de recherche — le contenu reste identique à ce
          qu'un humain peut lire, juste présenté hors champ visuel). */}
      <section id="seo-editorial" className="sr-only">
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
          Parmi les blind tests dédiés à un seul artiste : Ninho, Booba, PNL, SCH, JUL, Nekfeu,
          et désormais{" "}
          <a href="/blindtest?theme=artist-badara" className="text-gold hover:text-glow transition-colors">
            Badara
          </a>
          , à l'affiche de Nouvelle École.
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
