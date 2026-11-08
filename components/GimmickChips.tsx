"use client";

import { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import type { Gimmick } from "@/lib/gimmicks";

/* Les ad-libs de l'artiste, à écouter d'un tap : ceux qui réagiront pendant la partie. */
export default function GimmickChips({ items }: { items: Gimmick[] }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  function toggle(g: Gimmick) {
    if (playing === g.id) { audio.current?.pause(); setPlaying(null); return; }
    audio.current?.pause();
    const a = new Audio(`/audio/gimmicks/${g.id}.mp3`); audio.current = a;
    a.onended = () => setPlaying(null); a.onpause = () => setPlaying((p) => (p === g.id ? null : p));
    setPlaying(g.id); void a.play().catch(() => setPlaying(null));
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((g) => (
        <li key={g.id}>
          <button type="button" onClick={() => toggle(g)} className="gimmick-chip" data-on={playing === g.id}>
            <span className="gimmick-chip-ic">{playing === g.id ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-px" />}</span>
            « {g.label} »
          </button>
        </li>
      ))}
    </ul>
  );
}
