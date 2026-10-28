import type { Metadata } from "next";
import { Play, Check, Sparkles, Link2, Users, PartyPopper, GraduationCap, Briefcase, Cake } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { SITE } from "@/lib/seo";

/*
 * Page d'atterrissage SEO / GEO du constructeur : « blind test personnalisé », « créer son
 * blind test », « blind test anniversaire / mariage / classe / entreprise ». Le constructeur
 * lui-même est sur /creer (application) ; cette page explique et renvoie dessus.
 */
const url = `${SITE}/blindtest/creer`;

export const metadata: Metadata = {
  title: "Créer son blind test personnalisé — Gratuit, avec ses propres morceaux | DailyRapFrance",
  description:
    "Crée un blind test avec tes morceaux : anniversaire, mariage, soirée, classe, team building. Cherche les titres ou colle une playlist Deezer, partage le lien, chacun joue sur son téléphone. Gratuit, sans appli.",
  alternates: { canonical: url },
  openGraph: { title: "Créer son blind test personnalisé — DailyRapFrance", description: "Tes morceaux, tes règles, un lien à envoyer.", url, type: "website", images: [{ url: "/og.png", width: 1200, height: 630 }] },
};

const FAQ = [
  { q: "Comment créer un blind test personnalisé ?", a: "Ouvre dailyrapfrance.best/creer, cherche tes titres ou artistes (catalogue Deezer, extraits officiels de 30 secondes) ou colle le lien d'une playlist Deezer publique, donne un nom, et touche « Jouer » ou « Envoyer le lien ». De 3 à 40 morceaux." },
  { q: "Faut-il un compte ou une appli ?", a: "Non. Tout le blind test est contenu dans le lien : la personne qui le reçoit joue directement dans son navigateur, sur téléphone, tablette, ordinateur ou TV. Un compte gratuit sert seulement à sauvegarder ses scores." },
  { q: "Peut-on importer une playlist Spotify ou Apple Music ?", a: "Pas directement : ces services exigent une connexion et ne fournissent plus d'extraits aux sites tiers. Cherche les titres un par un (quelques secondes chacun), ou recrée la liste sur Deezer et colle son lien." },
  { q: "Peut-on jouer à plusieurs sur un blind test personnalisé ?", a: "Oui : en solo chacun de son côté avec le lien, ou « Entre potes » sur un seul téléphone avec un buzzer et les pseudos de chacun (2 à 8 joueurs). Les titres sont mélangés à chaque partie." },
  { q: "Est-ce que je retrouve mes blind tests ?", a: "Ils sont mémorisés sur ton appareil dans « Mes blind tests » sur la page de création, avec un bouton pour rejouer ou renvoyer le lien." },
  { q: "Ça marche pour d'autres styles que le rap ?", a: "Oui. Le catalogue est celui de Deezer : variété, pop, années 80, dessins animés, tout ce qui a un extrait de 30 secondes." },
];

const USES = [
  { Icon: Cake, t: "Anniversaire", s: "Les sons de l'invité d'honneur, ou un titre par invité." },
  { Icon: PartyPopper, t: "Soirée & mariage", s: "Le blind test des mariés, les années du groupe, le thème de la soirée." },
  { Icon: GraduationCap, t: "Classe & colo", s: "Un quiz de fin d'année en deux minutes, sur l'écran de la salle." },
  { Icon: Briefcase, t: "Team building", s: "Chacun propose un titre, le blind test révèle les goûts de l'équipe." },
];

export default function CreerLandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": url, url, name: "Créer son blind test personnalisé", inLanguage: "fr-FR", isPartOf: { "@id": `${SITE}/#website` } },
      { "@type": "SoftwareApplication", name: "Constructeur de blind test DailyRapFrance", applicationCategory: "GameApplication", operatingSystem: "iOS, Android, Windows, macOS", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, url: `${SITE}/creer` },
      { "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      { "@type": "HowTo", name: "Créer un blind test personnalisé", step: [
        { "@type": "HowToStep", name: "Choisir les morceaux", text: "Cherche des titres ou des artistes, ou colle une playlist Deezer publique." },
        { "@type": "HowToStep", name: "Nommer et régler", text: "Donne un nom, impose éventuellement le temps par extrait et le mode de réponse." },
        { "@type": "HowToStep", name: "Jouer ou partager", text: "Joue tout de suite, ou envoie le lien : chacun joue sur son téléphone." },
      ] },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "DailyRapFrance", item: SITE },
        { "@type": "ListItem", position: 2, name: "Blind test rap français", item: `${SITE}/blindtest` },
        { "@type": "ListItem", position: 3, name: "Créer son blind test", item: url },
      ] },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-3xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-16">
        <nav aria-label="Fil d'Ariane" className="text-xs text-ink-faint mb-5 flex items-center gap-1.5 flex-wrap">
          <a href="/" className="hover:text-ink">DailyRapFrance</a><span aria-hidden="true">›</span>
          <a href="/blindtest" className="hover:text-ink">Blind test rap français</a><span aria-hidden="true">›</span>
          <span className="text-ink-muted">Créer son blind test</span>
        </nav>
        <div className="flex items-center gap-2 text-xs font-semibold text-gold mb-3"><BrandMark size={12} /> Nouveau · Gratuit · Sans appli</div>
        <h1 className="poster-title text-3xl sm:text-5xl mb-5">Crée ton blind test personnalisé, avec tes morceaux</h1>
        <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl">
          Cherche les titres (ou colle une playlist Deezer), donne un nom, envoie le lien. Les invités jouent sur leur téléphone, sans compte ni installation, avec les extraits officiels de 30 secondes. Trois à quarante morceaux, deux minutes de préparation.
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <a href="/creer" className="game-btn game-btn-primary h-14 px-7 text-base gap-2.5 w-full sm:w-auto"><Sparkles size={18} /> Créer mon blind test</a>
          <a href="/jouer" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full glass text-sm font-medium hover:border-gold/40 transition-colors"><Play size={16} className="text-gold" fill="currentColor" /> Ou jouer un thème prêt</a>
        </div>

        <ul className="mt-8 grid sm:grid-cols-3 gap-2.5 text-sm">
          {["Tout le blind test tient dans le lien — rien à installer, rien à créer", "Solo avec le lien, ou entre potes sur un téléphone avec buzzer", "Règles au choix : temps par extrait, réponse facile (3 choix) ou écrite"].map((b) => (
            <li key={b} className="card p-3.5 flex items-start gap-2.5 text-ink-muted"><Check size={15} className="text-gold shrink-0 mt-0.5" /> {b}</li>
          ))}
        </ul>

        <section className="mt-12" aria-labelledby="uses-h">
          <h2 id="uses-h" className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-3">Pour quelles occasions ?</h2>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {USES.map((u) => (
              <div key={u.t} className="card p-4 flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0"><u.Icon size={18} /></span>
                <span><span className="block text-sm font-semibold">{u.t}</span><span className="block text-xs text-ink-faint mt-0.5">{u.s}</span></span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="how-h">
          <h2 id="how-h" className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-3">Comment ça marche</h2>
          <ol className="space-y-2.5">
            {[
              ["Choisis les morceaux", "Une recherche par titre ou artiste, le top d'un artiste en un tap, ou une playlist Deezer collée.", Link2],
              ["Nomme et règle", "« Anniv de Sarah », « Que du 2016 »… Impose le temps par extrait si tu veux, ou laisse libre.", Sparkles],
              ["Joue ou partage", "Un lien à envoyer dans le groupe, ou « Entre potes » sur un seul écran avec les pseudos.", Users],
            ].map(([t, s, I], i) => {
              const StepIcon = I as typeof Link2;
              return (
                <li key={String(t)} className="card p-4 flex items-start gap-3">
                  <span className="font-display text-xl font-extrabold text-gold w-6 shrink-0">{i + 1}</span>
                  <span className="flex-1"><span className="block text-sm font-semibold">{String(t)}</span><span className="block text-xs text-ink-faint mt-0.5">{String(s)}</span></span>
                  <StepIcon size={16} className="text-ink-faint shrink-0" />
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mt-12" aria-labelledby="faq-h">
          <h2 id="faq-h" className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-3">Questions fréquentes</h2>
          <div className="divide-y divide-white/8">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-3">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-sm min-h-[44px]">{f.q}<span className="text-ink-faint group-open:rotate-90 transition-transform">›</span></summary>
                <p className="text-sm text-ink-muted mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-12 ticket p-6 text-center">
          <p className="font-display text-2xl font-extrabold mb-2">Deux minutes, et c&apos;est prêt.</p>
          <a href="/creer" className="sticker h-14 px-8 mt-2"><Sparkles size={18} /> Créer mon blind test</a>
        </div>
      </article>
    </>
  );
}
