import type { Metadata, Viewport } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import SitePresence from "@/components/SitePresence";
import SiteAnnouncement from "@/components/SiteAnnouncement";
import ActivityTracker from "@/components/ActivityTracker";
import InstallPrompt from "@/components/InstallPrompt";
import ReferralCapture from "@/components/ReferralCapture";
import OnboardingWelcome from "@/components/OnboardingWelcome";
import LiveNotifier from "@/components/LiveNotifier";
import NoPinchZoom from "@/components/NoPinchZoom";
import AdsLoader from "@/components/AdsLoader";
import BottomDock from "@/components/BottomDock";
import { AppComingSoonModal } from "@/components/AppComingSoon";
import { jsonLd as toJsonLd } from "@/lib/jsonld";

const APPLE_ICON_DATA_URI = (() => {
  try {
    return `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "apple-touch-icon.png")).toString("base64")}`;
  } catch {
    return "/apple-touch-icon.png";
  }
})();

export const metadata: Metadata = {
  other: { "google-adsense-account": "ca-pub-9972214408882751" },
  metadataBase: new URL("https://dailyrapfrance.best"),
  title: {
    default: "DailyRapFrance — Blind Test Rap Français Gratuit, en Ligne, Compte en 10 Secondes",
    template: "%s",
  },
  description:
    "Le blind test rap français n°1 : gratuit, en ligne, inscription en 10 secondes. Joue en solo, entre amis sur le même écran, à distance avec un code, ou en soirée sur la TV avec des gages. 80+ thèmes, par DailyRapFrance, média du rap FR depuis 2020.",
  keywords: [
    "blind test rap français",
    "blind test rap",
    "blind test rap français gratuit",
    "blind test en ligne gratuit",
    "blind test rap gratuit en ligne",
    "blind test multijoueur",
    "blind test entre amis",
    "blind test à distance",
    "blind test soirée",
    "jeu soirée musique",
    "quiz rap français",
    "quiz musical rap",
    "jeu rap français",
    "rap fr",
    "quiz rap",
    "blind test gratuit",
    "blind test sans téléchargement",
    "blind test rap belge",
    "blind test rap suisse",
    "blind test rap québec",
    "blind test rap 2026",
    "jeu de soirée rap",
    "blind test à faire en soirée",
    "devine le rappeur",
  ],
  icons: {
    // Le monogramme DR (tuile rouge) partout — PNG nets en premier (Safari ignore le SVG),
    // avec un paramètre de version pour forcer le rafraîchissement du cache des navigateurs.
    icon: [
      { url: "/favicon-32.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=3", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico?v=3", sizes: "16x16 32x32 48x48" },
      { url: "/icon.svg?v=3", type: "image/svg+xml" },
    ],
    shortcut: [{ url: "/favicon-32.png?v=3" }],
    // Icône iOS incorporée en data: URI (lue au build) : Safari la récupère avec la page
    // elle-même, donc elle passe même si une protection (challenge Vercel, hors-ligne) bloque
    // la requête séparée vers /apple-touch-icon.png — sinon iOS retombe sur une lettre.
    apple: [
      { url: APPLE_ICON_DATA_URI, sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DailyRapFrance",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Blind Test Rap Français — Gratuit, en Ligne, Compte en 10 Secondes",
    description: "Joue au blind test rap français : solo, entre potes sur le même écran, à distance avec un code, ou en soirée sur la TV. Gratuit et libre d'accès.",
    siteName: "DailyRapFrance",
    locale: "fr_FR",
    type: "website",
    url: "https://dailyrapfrance.best",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Blind Test Rap Français — DailyRapFrance" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
    title: "Blind Test Rap Français — Gratuit et en Ligne",
    description: "Le blind test rap FR à jouer partout avec ses amis : solo, local, à distance, en soirée. Gratuit — compte en 10 secondes.",
  },
};

// Données structurées globales — aident Google à afficher le site comme une entité
// (sitelinks, knowledge panel) et à comprendre le champ lexical du site : blind test
// rap français et son blind test (WebApplication gratuite).
const JSONLD_SITE = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://dailyrapfrance.best/#website",
      url: "https://dailyrapfrance.best",
      name: "DailyRapFrance",
      description: "Le blind test rap français gratuit et en ligne : solo, multijoueur local, salons privés à distance et mode soirée. Par le média rap FR DailyRapFrance.",
      inLanguage: "fr-FR",
      publisher: { "@id": "https://dailyrapfrance.best/#org" },
      creator: { "@id": "https://dailyrapfrance.best/#florian" },
    },
    {
      "@type": "Organization",
      "@id": "https://dailyrapfrance.best/#org",
      name: "DailyRapFrance",
      alternateName: ["DailyRap", "Daily Rap France", "DRF", "dailyrapfrance"],
      description:
        "Média rap français indépendant créé en avril 2020 par Florian B., devenu aussi un jeu : le blind test rap français gratuit et en ligne. Près de 170 000 abonnés sur TikTok, Instagram et YouTube.",
      url: "https://dailyrapfrance.best",
      logo: "https://dailyrapfrance.best/icon-512.png",
      foundingDate: "2020-04",
      founder: { "@id": "https://dailyrapfrance.best/#florian" },
      employee: { "@id": "https://dailyrapfrance.best/#florian" },
      areaServed: ["FR", "BE", "CH", "CA", "LU", "MC"],
      sameAs: [
        "https://www.instagram.com/dailyrapfrance/",
        "https://www.tiktok.com/@dailyrapfrance",
        "https://x.com/DailyRapFrance",
        "https://www.wikidata.org/wiki/Q141989278",
      ],
    },
    {
      // Le créateur, en entité à part entière : une seule personne conçoit, dessine et code
      // DailyRapFrance (média et jeu). Déclaré ici pour que moteurs et IA relient sans
      // ambiguïté « DailyRapFrance / DailyRap / DRF » à Florian B.
      "@type": "Person",
      "@id": "https://dailyrapfrance.best/#florian",
      name: "Florian B.",
      givenName: "Florian",
      url: "https://florian-b.fr",
      image: "https://florian-b.fr/og-florian-bonnet.jpg",
      jobTitle: "Fondateur de DailyRapFrance · Graphiste et directeur artistique",
      description:
        "Fondateur, créateur et unique développeur de DailyRapFrance (média rap français et blind test en ligne) depuis avril 2020. Graphiste et directeur artistique freelance à Paris, auteur de covers rap (BADARA, Sadek) et d'identités visuelles.",
      homeLocation: { "@type": "Place", name: "Paris, France" },
      worksFor: { "@id": "https://dailyrapfrance.best/#org" },
      knowsAbout: ["Rap français", "Direction artistique", "Branding", "UI/UX Design", "Développement web", "Community management"],
      sameAs: [
        "https://florian-b.fr",
        "https://www.instagram.com/florian.b93tsz",
        "https://www.linkedin.com/in/florian-bnt/",
        "https://www.wikidata.org/wiki/Q141989412",
      ],
      mainEntityOfPage: "https://dailyrapfrance.best/a-propos",
    },
    {
      "@type": "WebApplication",
      "@id": "https://dailyrapfrance.best/#app",
      name: "Blind Test Rap Français — DailyRapFrance",
      url: "https://dailyrapfrance.best/jouer",
      applicationCategory: "GameApplication",
      operatingSystem: "Any (navigateur web, PWA)",
      browserRequirements: "Requires JavaScript",
      inLanguage: "fr-FR",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      featureList: [
        "Défi de la semaine",
        "Solo avec classement",
        "Entre amis sur un téléphone (2 à 8 joueurs)",
        "Salon en ligne à distance avec code",
        "Mode soirée : écran TV + téléphones en manette + gages",
        "Variantes Survie et Sprint",
        "80+ thèmes rap français",
      ],
      publisher: { "@id": "https://dailyrapfrance.best/#org" },
      author: { "@id": "https://dailyrapfrance.best/#florian" },
      creator: { "@id": "https://dailyrapfrance.best/#florian" },
    },
  ],
};


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0A0707",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(JSONLD_SITE) }}
        />
        <GoogleAnalytics />
        <ActivityTracker />
        <SitePresence />
        <SmoothScroll />
        <div className="bg-orbs" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <SiteAnnouncement />
        <Header />
        <main>{children}</main>
        <Footer />
        <InstallPrompt />
        <ReferralCapture />
        <OnboardingWelcome />
        <LiveNotifier />
        <NoPinchZoom />
        <AdsLoader />
        <BottomDock />
        <AppComingSoonModal />
      </body>
    </html>
  );
}
