import { Play, Home } from "lucide-react";
import BrandMark from "@/components/BrandMark";

// 404 à la charte — la page par défaut de Next (fond blanc) jurait avec le site.
export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 py-20 text-center">
      <div className="max-w-md">
        <BrandMark size={56} className="text-gold mx-auto mb-6" />
        <p className="stage-kicker mb-2">Erreur 404</p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">Ce son n&apos;existe pas.</h1>
        <p className="text-ink-muted mb-8">La page a bougé ou n&apos;a jamais existé. Le blind test, lui, est toujours là.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/jouer" className="sticker h-14 px-7"><Play size={18} fill="currentColor" /> Jouer</a>
          <a href="/" className="sticker sticker-ghost h-14 px-7"><Home size={18} /> Accueil</a>
        </div>
      </div>
    </main>
  );
}
