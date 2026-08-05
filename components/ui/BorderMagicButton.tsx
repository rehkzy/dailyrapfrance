"use client";

import React from "react";

/**
 * BorderMagicButton — bouton/lien avec bordure animée (conic-gradient rotatif)
 * dans les couleurs de la charte DRF.
 *
 * Le dégradé pointe directement sur les tokens Tailwind du projet (gold / glow),
 * déjà utilisés partout ailleurs (ex: bg-gradient-to-br from-gold to-glow) — donc
 * si la charte évolue, ce bouton suit automatiquement, sans hex en dur.
 *
 * Deux modes :
 *   - lien   : <BorderMagicButton href="/jouer">Jouer</BorderMagicButton>
 *   - bouton : <BorderMagicButton onClick={...} type="submit">Valider</BorderMagicButton>
 *
 * Props utiles :
 *   - size : "sm" | "md" | "lg" (défaut "md")
 *   - fullWidth : true pour un bouton pleine largeur (mobile)
 */

type CommonProps = {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
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
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-sm",
  lg: "h-[3.375rem] px-6 py-3 text-sm",
};

export default function BorderMagicButton(props: Props) {
  const {
    children,
    size = "md",
    fullWidth = false,
    disabled = false,
    className = "",
    title,
  } = props;

  const wrapperClasses = [
    "relative inline-flex overflow-hidden rounded-full p-[1.5px]",
    "focus-within:outline-none focus-within:ring-2 focus-within:ring-gold/70 focus-within:ring-offset-2 focus-within:ring-offset-bg",
    "transition-transform duration-150 active:scale-[0.97]",
    disabled ? "opacity-50 pointer-events-none" : "",
    fullWidth ? "w-full" : "",
    SIZES[size],
    className,
  ].join(" ");

  const borderGlow = (
    <span
      aria-hidden="true"
      className="absolute inset-[-1000%] animate-[spin_2.5s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,theme(colors.glow)_0%,theme(colors.gold)_50%,theme(colors.glow)_100%)]"
    />
  );

  const inner = (
    <span
      className={[
        "relative inline-flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-full",
        "bg-bg/95 backdrop-blur-3xl",
        // Anton (font-impact) au lieu de l'Inter par défaut — c'était le vrai point faible
        // relevé par l'audit ("les boutons font Claude générique") : ils n'héritaient pas
        // de la personnalité du logo. Majuscules + tracking large pour l'effet affiche.
        "font-impact uppercase tracking-wide text-[13px] text-ink",
      ].join(" ")}
    >
      {children}
    </span>
  );

  if ("href" in props && props.href) {
    return (
      <a
        href={props.href}
        target={props.target}
        rel={props.rel}
        title={title}
        className={wrapperClasses}
      >
        {borderGlow}
        {inner}
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
      className={wrapperClasses}
    >
      {borderGlow}
      {inner}
    </button>
  );
}
