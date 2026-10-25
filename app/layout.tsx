import type { Metadata, Viewport } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import SitePresence from "@/components/SitePresence";
import SiteAnnouncement from "@/components/SiteAnnouncement";
import ActivityTracker from "@/components/ActivityTracker";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  metadataBase: new URL("https://dailyrapfrance.best"),
  title: {
    default: "DailyRapFrance — Blind Test Rap Français Gratuit, en Ligne et Sans Inscription",
    template: "%s",
  },
  description:
    "Le blind test rap français n°1 : gratuit, en ligne, sans inscription. Joue en solo, entre amis sur le même écran, à distance avec un code, ou en soirée sur la TV avec des gages. 15+ thèmes, par DailyRapFrance, média du rap FR depuis 2020.",
  keywords: [
    "blind test rap français",
    "blind test rap",
    "blind test rap français gratuit",
    "blind test en ligne gratuit",
    "blind test sans inscription",
    "blind test multijoueur",
    "blind test entre amis",
    "blind test à distance",
    "blind test soirée",
    "jeu soirée musique",
    "quiz rap français",
    "quiz musical rap",
    "jeu rap français",
    "rap fr",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
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
    title: "Blind Test Rap Français — Gratuit, en Ligne, Sans Inscription",
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
    description: "Le blind test rap FR à jouer partout avec ses amis : solo, local, à distance, en soirée. Gratuit, sans inscription.",
  },
};

// Données structurées globales — aident Google à afficher le site comme une entité
// (sitelinks, knowledge panel) et à comprendre le champ lexical du site : blind test
// rap français ET arcade de jeux rap (Artists Manager 2026 et la suite).
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD_SITE) }}
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
      </body>
    </html>
  );
}
