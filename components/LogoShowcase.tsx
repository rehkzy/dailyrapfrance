"use client";

import { useRef } from "react";

// Emblème de marque mis en valeur : anneau lumineux qui tourne en continu, verre dépoli,
// balayage de lumière fréquent, icône qui flotte doucement, et un effet 3D qui suit le
// curseur (desktop) ou respire tout seul (mobile, pas de souris).
export default function LogoShowcase() {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--ry", `${px * 22}deg`);
    el.style.setProperty("--rx", `${-py * 22}deg`);
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--ry", `0deg`);
    el.style.setProperty("--rx", `0deg`);
  }

  return (
    <div className="relative [perspective:800px]">
      {/* Anneau lumineux qui tourne en continu derrière la carte */}
      <div className="logo-ring absolute -inset-3 rounded-[2.5rem] opacity-70 blur-md" aria-hidden="true" />

      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="logo-tilt relative w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-[2rem] glass-strong flex items-center justify-center overflow-hidden transition-transform duration-300 ease-out"
        style={{
          transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
          boxShadow: "0 30px 80px -20px rgba(240,0,28,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {/* Balayage de lumière — bande diagonale qui traverse le verre en boucle */}
        <div className="logo-sweep absolute inset-0 pointer-events-none" aria-hidden="true" />

        <img
          src="/icon.svg"
          alt="DailyRapFrance"
          className="logo-float relative w-[58%] h-[58%] object-contain drop-shadow-[0_0_30px_rgba(240,0,28,0.55)]"
        />
      </div>
    </div>
  );
}
