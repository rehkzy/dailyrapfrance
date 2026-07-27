import type { Metadata, Viewport } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://dailyrapfrance.best"),
  title: {
    default: "DailyRapFrance — Le média du rap français",
    template: "%s",
  },
  description:
    "DailyRapFrance, le média indépendant du rap français depuis 2020. Blind test rap français en ligne gratuit, solo ou multijoueur.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "DailyRapFrance",
    description: "Le rap français raconté depuis 2020.",
    siteName: "DailyRapFrance",
    locale: "fr_FR",
    type: "website",
  },
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
