"use client";

import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

// Scroll fluide façon lenis.dev — inertie douce sur tout le site.
// Composant invisible, monté une fois dans le layout.
export default function SmoothScroll() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.0,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    // Exposé globalement — le blind test doit pouvoir mettre Lenis en pause pendant une
    // manche : verrouiller le <body> ne suffit pas, Lenis intercepte lui-même la molette et
    // le tactile et continue de calculer un défilement virtuel par-dessus.
    window.__lenis = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      if (window.__lenis === lenis) window.__lenis = undefined;
    };
  }, []);

  return null;
}
