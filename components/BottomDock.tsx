"use client";

import { usePathname } from "next/navigation";
import { Home, Newspaper, Sparkles, User } from "lucide-react";
import BrandMark from "@/components/BrandMark";

/*
 * LE menu du site sur téléphone — le même partout, toujours au même endroit : une barre
 * flottante en bas, avec au centre le bouton Jouer, un disque rouge qui porte la flèche de
 * la marque et déborde de la barre (c'est l'élément signature). Quatre destinations autour :
 * Accueil, Actu (le média), Créer, Profil. Le classement vit dans Accueil, Jouer et Profil.
 * Sur ordinateur, c'est le header qui joue ce rôle.
 * Il s'efface de lui-même pendant une partie (feed) et dans le Swipe plein écran (CSS).
 */
const LEFT = [
  { href: "/", label: "Accueil", Icon: Home, match: (p: string) => p === "/" },
  { href: "/actu", label: "Actu", Icon: Newspaper, match: (p: string) => p.startsWith("/actu") },
];
const RIGHT = [
  { href: "/creer", label: "Créer", Icon: Sparkles, match: (p: string) => p.startsWith("/creer") || p.startsWith("/blindtests") },
  { href: "/profil", label: "Profil", Icon: User, match: (p: string) => p.startsWith("/profil") || p.startsWith("/parametres") || p.startsWith("/amis") || p.startsWith("/parrainage") },
];

export default function BottomDock() {
  const pathname = usePathname() ?? "/";
  const onPlay = pathname.startsWith("/jouer") || pathname === "/blindtest" || pathname.startsWith("/b/");
  const Item = ({ href, label, Icon, match }: (typeof LEFT)[number]) => {
    const active = match(pathname);
    return (
      <a href={href} aria-current={active ? "page" : undefined} className="brand-dock-item" data-active={active}>
        <Icon size={20} strokeWidth={active ? 2.6 : 2} />
        <span>{label}</span>
      </a>
    );
  };
  return (
    <nav className="brand-dock-wrap lg:hidden" aria-label="Menu principal">
      <div className="brand-dock">
        {LEFT.map((i) => <Item key={i.href} {...i} />)}
        <a href="/jouer" aria-label="Jouer" aria-current={onPlay ? "page" : undefined} className="brand-dock-play" data-active={onPlay}>
          <BrandMark size={30} className="text-white" />
          <span>Jouer</span>
        </a>
        {RIGHT.map((i) => <Item key={i.href} {...i} />)}
      </div>
    </nav>
  );
}
