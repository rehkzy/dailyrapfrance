"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * FlipWords — mot qui change avec une animation fluide (montée + fondu),
 * version 100% CSS/React : AUCUNE dépendance (pas de framer-motion),
 * donc zéro risque au build Vercel.
 *
 * Usage :
 *   Le rap français, raconté avec <FlipWords words={["passion", "style", "culture"]} />
 *
 * Props :
 *   - words     : liste des mots à faire tourner
 *   - duration  : temps d'affichage de chaque mot en ms (défaut 3000)
 *   - className : classes en plus (couleur, taille…). Par défaut rouge charte.
 */

type Props = {
  words: string[];
  duration?: number;
  className?: string;
};

export default function FlipWords({
  words,
  duration = 3000,
  className = "",
}: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => {
    if (!words || words.length <= 1) return;

    const t1 = setTimeout(() => setPhase("out"), duration);
    const t2 = setTimeout(() => {
      setIndex((i) => (i + 1) % words.length);
      setPhase("in");
    }, duration + 350); // 350ms = durée de l'anim de sortie

    timers.current.push(t1, t2);
    return clearTimers;
  }, [index, duration, words, clearTimers]);

  const word = words && words.length ? words[index] : "";

  return (
    <span
      className={[
        "inline-block align-baseline will-change-transform",
        "transition-all duration-350 ease-out",
        phase === "in"
          ? "opacity-100 translate-y-0 blur-0"
          : "opacity-0 -translate-y-2 blur-[6px]",
        // Couleur par défaut : rouge charte. Surcharge via className si besoin.
        className || "text-[#e50914]",
      ].join(" ")}
      style={{ transitionDuration: "350ms" }}
    >
      {word}
    </span>
  );
}
