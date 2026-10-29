"use client";

import { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";

/*
 * Un seul lecteur d'extraits pour toute la page : appuyer sur un titre coupe le précédent.
 * Bouton rond posé sur la pochette, comme sur n'importe quelle app de musique.
 */
let audio: HTMLAudioElement | null = null;
let currentId: string | null = null;
const listeners = new Set<(id: string | null) => void>();
function notify() { listeners.forEach((l) => l(currentId)); }

export function stopPreview() {
  audio?.pause();
  currentId = null;
  notify();
}

export default function PreviewButton({ id, src, size = 36, className = "" }: { id: string; src: string | null; size?: number; className?: string }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const l = (cur: string | null) => setPlaying(cur === id);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, [id]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!src) return;
    if (!audio) {
      audio = new Audio();
      audio.addEventListener("ended", () => { currentId = null; notify(); });
    }
    if (currentId === id) { stopPreview(); return; }
    audio.src = src;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
    currentId = id;
    notify();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!src}
      aria-label={playing ? "Pause" : "Écouter l'extrait"}
      aria-pressed={playing}
      className={`grid place-items-center rounded-full text-white shadow-[0_6px_18px_rgba(0,0,0,0.45)] disabled:opacity-40 transition-transform active:scale-95 ${playing ? "bg-gold" : "bg-black/60 backdrop-blur border border-white/20"} ${className}`}
      style={{ width: size, height: size }}
    >
      {playing ? <Pause size={size * 0.42} fill="currentColor" /> : <Play size={size * 0.42} fill="currentColor" className="ml-0.5" />}
    </button>
  );
}
