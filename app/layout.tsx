import type { Metadata, Viewport } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://dailyrapfrance.best"),
  title: {
    default: "DailyRapFrance — Blind Test Rap Français & média rap FR",
    template: "%s",
  },
  description:
    "Le blind test rap français n°1 : gratuit, en ligne, solo ou multijoueur. Défi du jour, classement, thèmes par époque et par artiste. Par DailyRapFrance, média indépendant du rap FR depuis 2020.",
  keywords: [
    "blind test rap français",
    "blind test rap",
    "quiz rap français",
    "jeu rap français",
    "blind test en ligne gratuit",
    "blind test multijoueur",
    "rap fr",
  ],
  icons: {
    icon: "/icon.svg",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DailyRapFrance — Blind Test Rap Français",
    description: "Le blind test rap français : gratuit, solo ou entre potes. Défi du jour et classement.",
    siteName: "DailyRapFrance",
    locale: "fr_FR",
    type: "website",
    url: "https://dailyrapfrance.best",
  },
  twitter: {
    card: "summary",
    title: "DailyRapFrance — Blind Test Rap Français",
    description: "Le blind test rap français : gratuit, solo ou entre potes.",
  },
};

// Données structurées globales — aident Google à afficher le site comme une entité
// (sitelinks, knowledge panel) et à comprendre le champ lexical "blind test rap français".
const JSONLD_SITE = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://dailyrapfrance.best/#website",
      url: "https://dailyrapfrance.best",
      name: "DailyRapFrance",
      description: "Blind test rap français en ligne et média du rap FR.",
      inLanguage: "fr-FR",
    },
    {
      "@type": "Organization",
      "@id": "https://dailyrapfrance.best/#org",
      name: "DailyRapFrance",
      url: "https://dailyrapfrance.best",
      logo: "https://dailyrapfrance.best/icon.svg",
    },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD_SITE) }}
        />
        <GoogleAnalytics />
        <SmoothScroll />
        <div className="bg-orbs" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
