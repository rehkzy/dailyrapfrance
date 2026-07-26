import type { Metadata } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "DailyRapFrance — le média du rap français",
  description: "Le rap français raconté depuis 2020, avec passion — et le Blind Test qui va avec.",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="font-sans antialiased">
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
