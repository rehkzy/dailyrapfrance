import { Gamepad2, ChevronLeft } from "lucide-react";

export default function BackToGame() {
  return (
    <a
      href="/blindtest"
      className="tap-press group inline-flex items-center gap-2 pl-2.5 pr-4 py-2 mb-6 rounded-full glass border border-gold/25 hover:border-gold/50 hover:bg-gold/10 transition-colors"
    >
      <span className="w-6 h-6 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0 group-hover:bg-gold group-hover:text-white transition-colors">
        <ChevronLeft size={14} strokeWidth={2.5} />
      </span>
      <Gamepad2 size={14} className="text-gold" />
      <span className="text-sm font-medium">Retour au jeu</span>
    </a>
  );
}
