"use client";

import { usePathname } from "next/navigation";
import { Gamepad2, Users, Trophy, Settings, type LucideIcon } from "lucide-react";

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
  return (
    <div className="dock" role="navigation" aria-label="Navigation du jeu">
      {TABS.map(({ href, label, Icon, match }) => {
        const isActive = match(pathname ?? "");
        return (
          <a
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`dock-item press ${isActive ? "dock-item-active" : ""}`}
          >
            <Icon size={18} strokeWidth={2.2} />
            {label}
          </a>
        );
      })}
    </div>
  );
}

// Version "prête à poser" — inclut son propre positionnement fixe (flottante, détachée des
// bords, comme une dock d'app). Sur la page blind test, utiliser GameTabBarContent empilée
// dans les blocs fixes déjà en place.
export default function GameTabBar() {
  return (
    <div
      className="game-tabbar-fixed fixed bottom-0 inset-x-0 z-30 px-4 pt-6 pointer-events-none lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/85 to-transparent -z-10" aria-hidden="true" />
      <div className="max-w-md mx-auto pointer-events-auto">
        <GameTabBarContent />
      </div>
    </div>
  );
}
