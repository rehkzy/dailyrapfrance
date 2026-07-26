"use client";

import { useEffect, useState } from "react";

const COLORS = ["#F0001C", "#FF3B4E", "#F5E8E8", "#780101", "#FFFFFF"];

type Piece = { id: number; left: number; delay: number; duration: number; rotate: number; color: string; drift: number };

// Une salve de confettis, générée une fois au montage et auto-nettoyée. Purement décoratif,
// pointer-events désactivés pour ne jamais gêner un clic en dessous.
export default function Confetti({ count = 60 }: { count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPieces(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 2.2 + Math.random() * 1.4,
        rotate: Math.random() * 360,
        drift: (Math.random() - 0.5) * 140,
        color: COLORS[i % COLORS.length],
      }))
    );
    const t = setTimeout(() => setPieces([]), 4200);
    return () => clearTimeout(t);
  }, [count]);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: p.color,
            // @ts-expect-error -- custom property consommée par le keyframe CSS
            "--drift": `${p.drift}px`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
