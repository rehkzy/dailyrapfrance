import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DailyRapFrance — le graphe du rap français",
  description:
    "Données en temps réel, graphe relationnel et indices du rap français. Chaque artiste, chaque sortie, chaque featuring, structurés et interrogeables.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="font-sans antialiased">
        <div className="bg-orbs" aria-hidden="true" />
        <header className="glass sticky top-0 z-50 rounded-none">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="font-display font-semibold text-lg tracking-tight">
              DRF<span className="text-gold">.</span>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm text-ink-muted">
              <a href="/artistes" className="hover:text-ink transition-colors">Artistes</a>
              <a href="/sorties" className="hover:text-ink transition-colors">Sorties</a>
              <a href="/charts" className="hover:text-ink transition-colors">Charts</a>
              <a href="/explorer/graphe" className="hover:text-ink transition-colors">Explorer</a>
              <a href="/explorer/comparer" className="hover:text-ink transition-colors">Comparer</a>
              <a href="/mag" className="hover:text-ink transition-colors">Mag</a>
            </nav>
            <button
              aria-label="Rechercher"
              className="text-sm text-ink-muted glass rounded px-2.5 py-1 hover:border-white/20 transition-colors font-mono"
            >
              ⌘K
            </button>
          </div>
        </header>
        <main>{children}</main>
        <footer className="glass mt-24 rounded-none">
          <div className="max-w-6xl mx-auto px-6 py-10 text-xs text-ink-faint flex justify-between">
            <span>DailyRapFrance — projet non-commercial, sources 100% légales.</span>
            <span>Données horaires sur le top 500 · dernière synchro il y a quelques minutes</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
