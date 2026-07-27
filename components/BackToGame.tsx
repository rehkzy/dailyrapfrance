import { ArrowLeft } from "lucide-react";

export default function BackToGame() {
  return (
    <a
      href="/blindtest"
      className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-ink-faint hover:text-gold transition-colors mb-6"
    >
      <ArrowLeft size={14} />
      Retour au jeu
    </a>
  );
}
