"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Gamepad2, Users, Trophy, Settings, Maximize, Minimize, type LucideIcon } from "lucide-react";

const TABS: { href: string; label: string; Icon: LucideIcon; match: (path: string) => boolean }[] = [
  { href: "/jouer", label: "Jouer", Icon: Gamepad2, match: (p) => p === "/jouer" },
  { href: "/amis", label: "Amis", Icon: Users, match: (p) => p === "/amis" },
  { href: "/blindtest/classement", label: "Classement", Icon: Trophy, match: (p) => p === "/blindtest/classement" },
  { href: "/parametres", label: "Compte", Icon: Settings, match: (p) => p === "/parametres" },
];

// Contenu de la barre — sans positionnement fixe, pour pouvoir l'empiler à l'intérieur d'un
// bloc fixe existant (BlindTest.tsx l'empile sous Précédent/Suivant ou Valider/Joker).
// Style "app native" : l'onglet actif est une pilule pleine (rond rouge + libellé),
// les autres sont des ronds icône seuls — même vocabulaire que les stores mobiles.
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
      // iOS Safari refuse souvent le plein écran natif — le mode immersif CSS a déjà pris
      // effet, le bouton n'est donc jamais un bouton mort.
    }
  }

  return (
    <div className="dock" role="navigation" aria-label="Navigation du jeu">
      {TABS.map(({ href, label, Icon, match }) => {
        const isActive = match(pathname ?? "");
        return isActive ? (
          <a key={href} href={href} aria-current="page" className="dock-active btn-primary press">
            <span className="dock-active-dot">
              <Icon size={17} strokeWidth={2.2} />
            </span>
            {label}
          </a>
        ) : (
          <a key={href} href={href} aria-label={label} title={label} className="dock-idle press">
            <Icon size={18} strokeWidth={2} />
          </a>
        );
      })}
      <button
        onClick={toggleFullscreen}
        aria-label={fullscreenActive ? "Quitter le plein écran" : "Passer en plein écran"}
        title={fullscreenActive ? "Quitter le plein écran" : "Plein écran"}
        className={`dock-idle press ml-auto ${fullscreenActive ? "!text-gold !border-gold/40 !bg-gold/10" : ""}`}
      >
        {fullscreenActive ? <Minimize size={17} /> : <Maximize size={17} />}
      </button>
    </div>
  );
}

// Version "prête à poser" — inclut son propre positionnement fixe (flottante, détachée des
// bords, comme une dock d'app). Sur la page blind test, utiliser GameTabBarContent empilée
// dans les blocs fixes déjà en place.
export default function GameTabBar() {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-30 px-4 pt-6 pointer-events-none lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/85 to-transparent -z-10" aria-hidden="true" />
      <div className="max-w-md mx-auto pointer-events-auto">
        <GameTabBarContent />
      </div>
    </div>
  );
}
