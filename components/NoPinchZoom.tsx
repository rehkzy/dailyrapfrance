"use client";

import { useEffect } from "react";

/*
 * Comportement d'app : pas de zoom au pincement ni au double-tap. Safari iPhone ignore
 * `user-scalable=no` pour le pincement, mais respecte preventDefault sur les gestes.
 * Un zoom accidentel en pleine partie décale tout l'écran (barre du bas, rail de réactions).
 */
export default function NoPinchZoom() {
  useEffect(() => {
    const gesture = (e: Event) => e.preventDefault();
    const touch = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    let lastTap = 0;
    const dbl = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTap < 300 && e.touches.length === 0) {
        const t = e.target as HTMLElement | null;
        if (!t?.closest("input, textarea, [contenteditable]")) e.preventDefault();
      }
      lastTap = now;
    };
    document.addEventListener("gesturestart", gesture, { passive: false });
    document.addEventListener("gesturechange", gesture, { passive: false });
    document.addEventListener("touchmove", touch, { passive: false });
    document.addEventListener("touchend", dbl, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", gesture); document.removeEventListener("gesturechange", gesture);
      document.removeEventListener("touchmove", touch); document.removeEventListener("touchend", dbl);
    };
  }, []);
  return null;
}
