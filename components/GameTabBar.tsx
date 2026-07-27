"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Gamepad2, Users, Trophy, Settings, Maximize, Minimize, type LucideIcon } from "lucide-react";

const TABS: { href: string; label: string; Icon: LucideIcon; match: (path: string) => boolean }[] = [
  { href: "/jouer", label: "Jouer", Icon: Gamepad2, match: (p) => p === "/jouer" },
  { href: "/amis", label: "Amis", Icon: Users, match: (p) => p === "/amis" },
  {
    href: "/blindtest/classement",
    label: "Classement",
    Icon: Trophy,
    match: (p) => p === "/blindtest/classement",
  },
  { href: "/parametres", label: "Compte", Icon: Settings, match: (p) => p === "/parametres" },
];

// Contenu de la barre — sans positionnement fixe, pour pouvoir l'empiler à l'intérieur d'un
// bloc fixe existant (BlindTest.tsx l'empile sous Précédent/Suivant ou Valider/Joker).
export function GameTabBarContent() {
  const pathname = usePathname();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [manualImmersive, setManualImmersive] = useState(false);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("game-immersive", manualImmersive);
    return () => {
      document.body.classList.remove("game-immersive");
    };
  }, [manualImmersive]);

  const fullscreenActive = isFullscreen || manualImmersive;

  async function toggleFullscreen() {
    const goingFullscreen = !manualImmersive;
    setManualImmersive(goingFullscreen);
    try {
      if (!goingFullscreen) {
        if (document.fullscreenElement) await document.exitFullscreen();
      } else {
        const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      }
    } catch {
      // iOS Safari refuse souvent le plein écran natif pour un élément quelconque — le mode
      // immersif CSS ci-dessus a déjà pris effet, le bouton n'est donc jamais un bouton mort.
    }
  }

  return (
    <div
      className="glass-strong rounded-2xl px-1.5 pt-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
    >
      <div className="grid grid-cols-5 gap-0.5">
        {TABS.map(({ href, label, Icon, match }) => {
          const isActive = match(pathname ?? "");
          return (
            <a
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`tap-press group flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ${
                isActive ? "text-gold" : "text-ink-faint hover:text-gold"
              }`}
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isActive ? "bg-gold/15" : "group-hover:bg-white/8"
                }`}
              >
                <Icon size={17} strokeWidth={2} />
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wide flex items-center gap-1">
                {label}
                {isActive && <span className="w-1 h-1 rounded-full bg-gold" aria-hidden="true" />}
              </span>
            </a>
          );
        })}
        <button
          onClick={toggleFullscreen}
          aria-label={fullscreenActive ? "Quitter le plein écran" : "Passer en plein écran"}
          className={`tap-press group flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ${
            fullscreenActive ? "text-gold" : "text-ink-faint hover:text-gold"
          }`}
        >
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              fullscreenActive ? "bg-gold text-white" : "group-hover:bg-white/8"
            }`}
          >
            {fullscreenActive ? <Minimize size={16} strokeWidth={2} /> : <Maximize size={16} strokeWidth={2} />}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wide">
            {fullscreenActive ? "Réduire" : "Écran"}
          </span>
        </button>
      </div>
    </div>
  );
}

// Version "prête à poser" — inclut son propre positionnement fixe. À utiliser telle quelle sur
// n'importe quelle page qui n'a pas déjà sa propre barre fixe en bas (Amis, Classement, Compte,
// Jouer). Sur la page blind test elle-même, on utilise GameTabBarContent à la place, empilée
// dans les blocs fixes déjà en place (Précédent/Suivant, Valider/Joker).
export default function GameTabBar() {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-30 px-4 pt-4 pointer-events-none"
      style={{ paddingBottom: "6px" }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/90 to-transparent -z-10" aria-hidden="true" />
      <div className="max-w-2xl mx-auto pointer-events-auto">
        <GameTabBarContent />
      </div>
    </div>
  );
}
