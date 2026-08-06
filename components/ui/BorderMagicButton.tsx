"use client";

import React from "react";

/**
 * BorderMagicButton — bouton/lien avec bordure animée (conic-gradient rotatif)
 * dans les couleurs de la charte DRF.
 *
 * Correctif : la bordure était invisible en prod ("bouton raté" — plat, rouge uni,
 * aucune animation visible). Cause probable : `bg-[conic-gradient(...,theme(colors.gold)...)]`
 * — une valeur arbitraire Tailwind avec `theme()` imbriqué dedans, qui ne s'est
 * apparemment pas compilée comme prévu. Les couleurs sont maintenant en dur (mêmes hex
 * que tailwind.config : gold #F0001C, glow #FF3B4E) et posées en `style` inline pour le
 * dégradé et le fond — plus aucune dépendance à la façon dont Tailwind interprète une
 * valeur arbitraire imbriquée.
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

// Mêmes hex que tailwind.config.ts (colors.gold / colors.glow / colors.bg) — dupliqués
// ici en dur exprès, pour que ce composant ne dépende plus jamais de la façon dont
// Tailwind résout une valeur arbitraire imbriquée.
const GOLD = "#F0001C";
const GLOW = "#FF3B4E";
const BG_95 = "#0A0707F2"; // #0A0707 à ~95% d'opacité (F2 = 242/255)

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
      className="absolute inset-[-1000%] animate-[spin_2.5s_linear_infinite]"
      style={{
        background: `conic-gradient(from 90deg at 50% 50%, ${GLOW} 0%, ${GOLD} 50%, ${GLOW} 100%)`,
      }}
    />
  );

  const inner = (
    <span
      className="relative inline-flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-full backdrop-blur-3xl font-impact uppercase tracking-wide text-[13px] text-ink"
      style={{ backgroundColor: BG_95 }}
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
