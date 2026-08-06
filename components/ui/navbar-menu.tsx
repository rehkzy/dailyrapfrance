"use client";

import React, { useState } from "react";
import Link from "next/link";

/*
 * Navigation à menus déroulants façon Aceternity — reconstruite sans framer-motion (même
 * logique que BorderMagicButton/FlipWords : zéro dépendance à installer, zéro risque de
 * casser le build Vercel) et posée sur la charte DRF : fond verre (.glass-strong, la même
 * couche "Liquid Glass" utilisée partout ailleurs sur le site), accent rouge (gold/glow),
 * typo display pour les intitulés.
 *
 * Composition :
 *   <Menu setActive={setActive}>
 *     <MenuLink href="/a-propos">À propos</MenuLink>
 *     <MenuItem setActive={setActive} active={active} item="Jouer">
 *       <HoveredLink href="/jouer">Blind Test solo</HoveredLink>
 *     </MenuItem>
 *   </Menu>
 */

export function Menu({
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className="glass-strong relative flex items-center justify-center gap-1 rounded-full px-3 py-2.5"
    >
      {children}
    </nav>
  );
}

export function MenuItem({
  setActive,
  active,
  item,
  children,
}: {
  setActive: (item: string | null) => void;
  active: string | null;
  item: string;
  children?: React.ReactNode;
}) {
  const isOpen = active === item;
  return (
    <div onMouseEnter={() => setActive(item)} className="relative">
      <button
        type="button"
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          isOpen ? "text-gold" : "text-ink-muted hover:text-ink"
        }`}
      >
        {item}
      </button>
      {children && isOpen && (
        // Ce conteneur ne fait QUE positionner/centrer le panneau (translate-x-1/2) — il
        // ne porte JAMAIS d'animation. Correctif d'un bug de décalage : l'animation
        // .solved-pop pose elle-même une valeur de `transform` (scale) dans ses keyframes,
        // ce qui écrasait le translateX(-50%) de centrage pendant les 0.35s de
        // l'animation (les deux se disputaient la même propriété CSS) — le panneau
        // apparaissait donc décalé à droite, puis "sautait" à sa position correcte une
        // fois l'animation terminée. En séparant centrage (ici, statique) et animation
        // (sur le panneau interne ci-dessous, qui n'a pas besoin de translateX), le
        // panneau reste centré du premier au dernier instant.
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3">
          <div className="nav-panel rounded-2xl p-4 solved-pop min-w-[220px]">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// Item de niveau supérieur SANS sous-menu — même gabarit visuel que MenuItem (pour un
// alignement parfait dans la barre), mais rendu directement comme un lien, pas un bouton
// qui ouvre un panneau. Pour "À propos" par exemple, qui n'a rien à déplier en dessous.
//
// setActive(null) au survol : sans ça, passer la souris de "Jouer" (qui ouvre son panneau)
// à "Accueil" ou "À propos" ne refermait JAMAIS le panneau — MenuLink n'avait aucun
// gestionnaire de survol, donc l'état "actif" posé par le MenuItem voisin restait figé
// indéfiniment, panneau ouvert par-dessus le reste du site.
export function MenuLink({
  href,
  active,
  setActive,
  children,
}: {
  href: string;
  active?: boolean;
  setActive?: (item: string | null) => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onMouseEnter={() => setActive?.(null)}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors inline-block ${
        active ? "text-gold" : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export function HoveredLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block text-ink-muted hover:text-gold transition-colors text-sm py-1 whitespace-nowrap"
    >
      {children}
    </Link>
  );
}

export function ProductItem({
  title,
  description,
  href,
  src,
}: {
  title: string;
  description: string;
  href: string;
  src: string;
}) {
  return (
    <Link href={href} className="group flex gap-3 items-start rounded-xl p-2 -m-2 hover:bg-white/5 transition-colors">
      <img
        src={src}
        alt={title}
        className="w-14 h-14 shrink-0 rounded-lg object-cover border border-white/10 group-hover:border-gold/40 transition-colors"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink group-hover:text-gold transition-colors">{title}</p>
        <p className="text-xs text-ink-faint mt-0.5 leading-snug line-clamp-2">{description}</p>
      </div>
    </Link>
  );
}
