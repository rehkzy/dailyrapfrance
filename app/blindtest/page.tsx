import { Suspense } from "react";
import BlindTest from "@/components/BlindTest";
import BlindTestLogo from "@/components/BlindTestLogo";
import { THEME_LANDINGS } from "@/lib/seo";

export const metadata = {
  title: "Blind Test Rap Français — Gratuit, en Ligne, Sans Inscription | DailyRapFrance",
  description:
    "Le blind test rap français gratuit et sans inscription : joue direct, en solo, entre potes sur le même écran, à distance avec un code, ou en soirée sur la TV avec des gages. 45+ thèmes : 90s, 2000s, cloud rap, 93, 91, Marseille...",
  alternates: { canonical: "https://dailyrapfrance.best/blindtest" },
  openGraph: {
    title: "Blind Test Rap Français — Gratuit, en Ligne, Sans Inscription",
    description:
      "Joue direct, sans compte : solo, multijoueur sur le même écran, salon privé à distance, mode soirée sur TV. 45+ thèmes de rap FR.",
    url: "https://dailyrapfrance.best/blindtest",
    type: "website",
  },
};

/*
 * Données structurées : VideoGame (avec offre à 0 € — signale "gratuit" aux moteurs)
 * + FAQPage dont chaque réponse reprend mot pour mot le contenu réellement présent
 * dans la section éditoriale de la page (exigence de cohérence de Google).
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "VideoGame",
      "@id": "https://dailyrapfrance.best/blindtest#game",
      name: "Blind Test Rap Français",
      alternateName: "Blind test rap FR DailyRapFrance",
      description:
        "Blind test dédié au rap français, en ligne, gratuit et sans inscription. Plus de 45 thèmes (époques, styles, régions), mode solo, multijoueur local sur le même écran, salons privés à distance et mode soirée sur TV avec gages.",
      genre: ["Quiz musical", "Jeu de soirée"],
      gamePlatform: "Navigateur web (mobile, tablette, ordinateur, TV)",
      playMode: ["SinglePlayer", "MultiPlayer"],
      numberOfPlayers: { "@type": "QuantitativeValue", minValue: 1, maxValue: 8 },
      inLanguage: "fr-FR",
      url: "https://dailyrapfrance.best/blindtest",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", availability: "https://schema.org/InStock" },
      publisher: { "@type": "Organization", name: "DailyRapFrance", url: "https://dailyrapfrance.best" },
    },
    {
      "@type": "FAQPage",
      "@id": "https://dailyrapfrance.best/blindtest#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "Le blind test rap français est-il gratuit ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui, le blind test est entièrement gratuit et libre d'accès : aucune inscription n'est nécessaire pour jouer en solo ou en multijoueur local. Un compte (gratuit aussi) sert uniquement à sauvegarder tes scores et à créer des salons privés en ligne.",
          },
        },
        {
          "@type": "Question",
          name: "Peut-on jouer au blind test entre amis à distance ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui : crée un salon privé et partage son code — chacun rejoint depuis son propre téléphone, où qu'il soit. Tous les joueurs qui trouvent la bonne réponse marquent des points, les plus rapides prennent un bonus.",
          },
        },
        {
          "@type": "Question",
          name: "Comment organiser un blind test en soirée ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Le mode Soirée est fait pour ça : l'écran partagé s'affiche sur la TV, chaque joueur répond depuis son téléphone, et le dernier du classement reçoit un gage. De 2 à 8 joueurs.",
          },
        },
        {
          "@type": "Question",
          name: "Quels thèmes de rap français sont disponibles ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Plus de 45 thèmes : les stars de 2026 (Jul, Gims, Ninho, Werenoi, PLK, SDM, Tiakola), la nouvelle génération (La Rvfleuze, Mauvais Djo, Lagui, Jolagreen23), les années 90, 2000 et 2010, la drill, la trap, l'afro, le jersey club, le cloud rap, les scènes régionales (Paris, 93, 91, 92, 94, Marseille, Lyon, Lille, Toulouse, Belgique, Suisse, Québec, Antilles), des blind tests dédiés à un seul artiste, le Top 50 et un défi du jour qui change chaque jour.",
          },
        },
      ],
    },
  ],
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

      {/* Contenu éditorial — VISIBLE (sous le fold, jamais dans le chemin du jeu), car le
          balisage FAQPage exige que les réponses soient lisibles sur la page. Masqué
          uniquement pendant une partie (mode immersif, règle CSS #seo-editorial). */}
      <section id="seo-editorial" className="relative z-10 max-w-2xl mx-auto px-6 pb-24 text-sm text-ink-muted leading-relaxed">
        <details className="group">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-semibold text-ink-muted hover:text-ink min-h-[44px] mb-2">
          Tout savoir sur le blind test — questions fréquentes et thèmes
          <span className="text-ink-faint transition-transform group-open:rotate-90">›</span>
        </summary>
        <h2 className="font-display text-2xl text-ink font-semibold mb-3">
          Le blind test rap français gratuit, en ligne et sans inscription
        </h2>
        <p className="mb-6">
          DailyRapFrance propose le blind test rap français le plus complet : plus de quarante-cinq
          thèmes couvrant les années 90, 2000, 2010 et les sons les plus récents, le cloud rap,
          les scènes régionales (rap 93, rap 91, rap 92, Marseille, Nord), des blind tests dédiés
          à un seul artiste et un défi du jour qui change chaque jour. Il se joue partout — sur
          téléphone, tablette, ordinateur ou TV — directement dans le navigateur.
        </p>

        <h3 className="font-display text-lg text-ink font-medium mb-1.5">Le blind test rap français est-il gratuit ?</h3>
        <p className="mb-5">
          Oui, le blind test est entièrement gratuit et libre d&apos;accès : aucune inscription
          n&apos;est nécessaire pour jouer en solo ou en multijoueur local. Un compte (gratuit
          aussi) sert uniquement à sauvegarder tes scores et à créer des salons privés en ligne.
        </p>

        <h3 className="font-display text-lg text-ink font-medium mb-1.5">Peut-on jouer au blind test entre amis à distance ?</h3>
        <p className="mb-5">
          Oui : crée un salon privé et partage son code — chacun rejoint depuis son propre
          téléphone, où qu&apos;il soit. Tous les joueurs qui trouvent la bonne réponse marquent
          des points, les plus rapides prennent un bonus.
        </p>

        <h3 className="font-display text-lg text-ink font-medium mb-1.5">Comment organiser un blind test en soirée ?</h3>
        <p className="mb-5">
          Le mode Soirée est fait pour ça : l&apos;écran partagé s&apos;affiche sur la TV, chaque
          joueur répond depuis son téléphone, et le dernier du classement reçoit un gage. De 2 à
          8 joueurs.
        </p>

        <h3 className="font-display text-lg text-ink font-medium mb-1.5">Quels thèmes de rap français sont disponibles ?</h3>
        <p className="mb-5">
          Plus de 45 thèmes : les stars de 2026 (Jul, Gims, Ninho, Werenoi, PLK, SDM, Tiakola), la
          nouvelle génération (La Rvfleuze, Mauvais Djo, Lagui, Jolagreen23), les années 90, 2000 et
          2010, la drill, la trap, l&apos;afro, le jersey club, le cloud rap, les scènes régionales
          (Paris, 93, 91, 92, 94, Marseille, Lyon, Lille, Toulouse, Belgique, Suisse, Québec, Antilles),
          des blind tests dédiés à un seul artiste, le Top 50 et un défi du jour qui change chaque jour.
        </p>

        <h3 className="font-display text-lg text-ink font-medium mb-1.5">Quelles variantes de jeu existent ?</h3>
        <p className="mb-5">
          En plus de la partie classique (10 à 30 manches, chrono réglable, jokers), deux variantes : <strong className="text-ink">Survie</strong>,
          où la partie s&apos;arrête au premier extrait entièrement raté, et <strong className="text-ink">Sprint</strong>, 20 extraits de 8 secondes sans
          joker. Chaque variante a son propre classement.
        </p>

        <h3 className="font-display text-lg text-ink font-medium mb-1.5">Où peut-on y jouer ?</h3>
        <p className="mb-5">
          Partout où il y a internet, directement dans le navigateur, sans rien télécharger : en France, en Belgique, en Suisse, au
          Québec, au Luxembourg ou en Afrique francophone. Le site s&apos;ajoute à l&apos;écran d&apos;accueil comme une application ; une
          version App Store et Google Play est annoncée.
        </p>

        <div className="mb-8">
          <p className="font-display text-lg text-ink font-medium mb-2">Tous les thèmes</p>
          <div className="flex flex-wrap gap-2">
            {THEME_LANDINGS.map((t) => (
              <a key={t.slug} href={`/blindtest/${t.slug}`} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:border-gold/40 transition-colors">
                {t.theme?.label}
              </a>
            ))}
          </div>
        </div>

        <p>
          Titre et artiste rapportent chacun un point ; retrouver un featuring rapporte deux
          points bonus, et la rapidité est récompensée. Connecte-toi pour sauvegarder tes scores
          et apparaître dans le{" "}
          <a href="/blindtest/classement" className="text-gold hover:text-glow transition-colors">
            classement général
          </a>
          .
        </p>
        </details>
      </section>
    </>
  );
}
