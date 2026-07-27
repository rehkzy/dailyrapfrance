"use client";

import { useEffect, useRef, useState } from "react";

export default function VinylCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const pos = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || reduced) return;
    setEnabled(true);

    function onMove(e: PointerEvent) {
      pos.current = { x: e.clientX, y: e.clientY };
    }
    window.addEventListener("pointermove", onMove);

    let raf = 0;
    function tick() {
      current.current.x += (pos.current.x - current.current.x) * 0.18;
      current.current.y += (pos.current.y - current.current.y) * 0.18;
      const el = ref.current;
      if (el) {
        el.style.transform = `translate3d(${current.current.x - 14}px, ${current.current.y - 14}px, 0) rotate(${current.current.x * 0.4}deg)`;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 z-[999] w-7 h-7 rounded-full pointer-events-none mix-blend-difference"
      style={{
        background:
          "radial-gradient(circle, #fff 0%, #fff 14%, transparent 15%, transparent 55%, #fff 56%, #fff 100%)",
        willChange: "transform",
      }}
      aria-hidden="true"
    />
  );
}
