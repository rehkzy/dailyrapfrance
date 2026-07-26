"use client";

import { useEffect, useRef } from "react";

// Halo de marque avec un léger parallax au scroll — profite du scroll déjà lissé par Lenis
// pour un mouvement fluide plutôt que saccadé. Effet discret : quelques dizaines de pixels,
// jamais du kitsch.
export default function ParallaxGlow({ intensity = 0.15 }: { intensity?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    function update() {
      const el = ref.current;
      if (el) {
        const rect = el.parentElement?.getBoundingClientRect();
        if (rect) {
          const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
          const offset = (progress - 0.5) * 100 * intensity;
          el.style.transform = `translate3d(0, ${offset}px, 0)`;
        }
      }
      raf = requestAnimationFrame(update);
    }
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [intensity]);

  return <div ref={ref} className="brand-glow" aria-hidden="true" />;
}
