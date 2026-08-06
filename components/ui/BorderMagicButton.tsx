"use client";

import React from "react";

/**
 * BorderMagicButton — nouvelle direction : bouton "jeu mobile" plutôt que bordure
 * animée à la Aceternity (jugée trop générique). Mécanique empruntée aux gros studios
 * mobile (Supercell, King, Duolingo) : une tranche de couleur pleine posée sur une base
 * plus sombre (box-shadow SANS flou, donc un vrai "socle" net, pas un glow), qui s'enfonce
 * visuellement au clic — le bouton descend exactement de la hauteur de son socle pendant
 * que l'ombre disparaît. Zéro dépendance externe, juste du CSS.
 *
 * Le nom du composant est conservé tel quel pour ne rien casser dans les imports
 * existants (BlindTest.tsx, BlindTestRoom.tsx, page.tsx...).
 *
 * Deux modes :
 *   - lien   : <BorderMagicButton href="/jouer">Jouer</BorderMagicButton>
 *   - bouton : <BorderMagicButton onClick={...} type="submit">Valider</BorderMagicButton>
 *
 * Props :
 *   - size : "sm" | "md" | "lg" (défaut "md")
 *   - variant : "primary" (rouge, défaut) | "dark" (sombre, pour les actions secondaires)
 *   - fullWidth : true pour un bouton pleine largeur (mobile)
 */

type CommonProps = {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "dark";
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
};

type AsLink = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
  onClick?: never;
  type?: never;
};

type AsButton = CommonProps & {
  href?: undefined;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
  target?: never;
  rel?: never;
};

type Props = AsLink | AsButton;

const SIZES: Record<NonNullable<CommonProps["size"]>, string> = {
  sm: "h-11 px-5 text-xs gap-1.5",
  md: "h-[3.25rem] px-7 text-sm gap-2",
  lg: "h-16 px-9 text-base gap-2.5",
};

const VARIANTS: Record<NonNullable<CommonProps["variant"]>, string> = {
  primary: "game-btn game-btn-primary",
  dark: "game-btn game-btn-dark",
};

export default function BorderMagicButton(props: Props) {
  const {
    children,
    size = "md",
    variant = "primary",
    fullWidth = false,
    disabled = false,
    className = "",
    title,
  } = props;

  const classes = [
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? "w-full" : "",
    className,
  ].join(" ");

  if ("href" in props && props.href) {
    return (
      <a
        href={props.href}
        target={props.target}
        rel={props.rel}
        title={title}
        className={classes}
        aria-disabled={disabled || undefined}
      >
        {children}
      </a>
    );
  }

  const buttonProps = props as AsButton;
  return (
    <button
      type={buttonProps.type ?? "button"}
      onClick={buttonProps.onClick}
      disabled={disabled}
      title={title}
      className={classes}
    >
      {children}
    </button>
  );
}
