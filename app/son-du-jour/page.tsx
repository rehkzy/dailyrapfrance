import type { Metadata } from "next";
import { SITE } from "@/lib/seo";
import { jsonLd as toJsonLd } from "@/lib/jsonld";
import SonDuJour from "@/components/SonDuJour";
import BackToGame from "@/components/BackToGame";

export const metadata: Metadata = {
  title: "Le son du jour — un morceau rap FR, six essais",
  description: "Chaque jour, un seul morceau de rap français à reconnaître pour tout le monde. Six essais, l'extrait s'allonge à chaque raté. Gratuit, sans compte, résultat à partager.",
  alternates: { canonical: `${SITE}/son-du-jour` },
  openGraph: { title: "Le son du jour · DailyRapFrance", description: "Un morceau rap FR par jour, six essais, l'extrait s'allonge. Tu le trouves en combien ?", url: `${SITE}/son-du-jour`, type: "website" },
};

export default function Page() {
  const ld = { "@context": "https://schema.org", "@type": "VideoGame", name: "Le son du jour — DailyRapFrance", url: `${SITE}/son-du-jour`, genre: "Quiz musical", gamePlatform: "Web", applicationCategory: "Game", isAccessibleForFree: true, inLanguage: "fr-FR", publisher: { "@id": `${SITE}/#org` } };
  return (
    <section className="max-w-md mx-auto px-5 pt-12 pb-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(ld) }} />
      <BackToGame />
      <p className="stage-kicker mb-1">Chaque jour, le même pour tous</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight mb-2">Le son du jour</h1>
      <p className="text-sm text-ink-muted mb-6">Un morceau rap FR. Six essais. L&apos;extrait s&apos;allonge à chaque raté : 1 s, 2 s, 4 s, 7 s, 11 s, 16 s. Tu le trouves en combien ?</p>
      <SonDuJour />
    </section>
  );
}
