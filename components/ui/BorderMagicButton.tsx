"use client";

import React from "react";

/**
 * BorderMagicButton — bouton avec bordure animée (conic-gradient rotatif)
 * adapté à la charte DailyRap : rouge signature sur fond noir profond.
 *
 * Usage :
 *   <BorderMagicButton onClick={...}>Jouer au Blind Test</BorderMagicButton>
 *
 * Props utiles :
 *   - size : "sm" | "md" | "lg" (défaut "md")
 *   - fullWidth : true pour un bouton pleine largeur (mobile)
 *   - as : "button" (défaut) — mets ton propre <a>/<Link> autour si besoin
 */

type Props = {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
};

const SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

export default function BorderMagicButton({
  children,
  onClick,
  type = "button",
  size = "md",
  fullWidth = false,
  disabled = false,
  className = "",
  title,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "relative inline-flex overflow-hidden rounded-full p-[1.5px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        "transition-transform duration-150 active:scale-[0.97]",
        disabled ? "opacity-50 pointer-events-none" : "",
        fullWidth ? "w-full" : "",
        SIZES[size],
        className,
      ].join(" ")}
    >
      {/* Bordure animée — conic gradient dans la charte DRF */}
      <span
        aria-hidden="true"
        className="absolute inset-[-1000%] animate-[spin_2.5s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 90deg at 50% 50%, #ffb3b3 0%, #e50914 25%, #3a0000 50%, #e50914 75%, #ffb3b3 100%)",
        }}
      />
      {/* Cœur du bouton */}
      <span
        className={[
          "relative inline-flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-full",
          "bg-[#0a0a0a]/95 backdrop-blur-3xl",
          "font-semibold text-white",
        ].join(" ")}
      >
        {children}
      </span>
    </button>
  );
}
