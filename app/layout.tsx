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
  metadataBase: new URL("https://dailyrapfrance.best"),
  title: {
    default: "DailyRapFrance — Blind Test Rap Français Gratuit, en Ligne, Compte en 10 Secondes",
    template: "%s",
  },
  description:
    "Le blind test rap français n°1 : gratuit, en ligne, inscription en 10 secondes. Joue en solo, entre amis sur le même écran, à distance avec un code, ou en soirée sur la TV avec des gages. 45+ thèmes, par DailyRapFrance, média du rap FR depuis 2020.",
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
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    // Icône iOS incorporée en data: URI (lue au build) : Safari la récupère avec la page
    // elle-même, donc elle passe même si une protection (challenge Vercel, hors-ligne) bloque
    // la requête séparée vers /apple-touch-icon.png — sinon iOS retombe sur une lettre.
    apple: [
      { url: APPLE_ICON_DATA_URI, sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
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
    },
    {
      "@type": "Organization",
      "@id": "https://dailyrapfrance.best/#org",
      name: "DailyRapFrance",
      url: "https://dailyrapfrance.best",
      logo: "https://dailyrapfrance.best/icon-512.png",
      foundingDate: "2020-04",
      areaServed: ["FR", "BE", "CH", "CA", "LU", "MC"],
      sameAs: [
        "https://www.instagram.com/dailyrapfrance/",
        "https://www.tiktok.com/@dailyrapfrance",
        "https://x.com/DailyRapFrance",
      ],
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
    },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
        <BottomDock />
        <AppComingSoonModal />
      </body>
    </html>
  );
}
