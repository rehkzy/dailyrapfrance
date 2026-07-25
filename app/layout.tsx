import type { Metadata } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "DailyRapFrance — le média du rap français",
  description:
    "Le rap français raconté depuis 2020 : actus, interviews, culture. Le nouveau DailyRapFrance arrive bientôt.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="font-sans antialiased">
        <SmoothScroll />
        <div className="bg-orbs" aria-hidden="true" />
        <header className="glass sticky top-0 z-50 rounded-none">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center">
              <img src="/logo.svg" alt="DailyRapFrance" className="h-6 w-auto" />
            </a>
            <div className="flex items-center gap-4">
              <a href="/mag" className="text-sm text-ink-muted hover:text-ink transition-colors">
                Mag
              </a>
              <a
                href="#"
                className="glass rounded-full px-4 py-1.5 text-xs font-medium hover:bg-white/8 transition-colors"
              >
                Nous suivre
              </a>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="glass mt-24 rounded-none">
          <div className="max-w-6xl mx-auto px-6 py-10 text-xs text-ink-faint flex justify-between">
            <span>DailyRapFrance — depuis 2020.</span>
            <span>Paris, France.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
