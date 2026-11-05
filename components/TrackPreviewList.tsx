"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, ExternalLink } from "lucide-react";

/*
 * Liste de titres avec écoute d'extrait (30 s Deezer) — un seul lecteur partagé, le titre
 * en cours surligné. Rendu côté client pour l'audio ; le contenu (titres, albums) est dans
 * le HTML dès le serveur pour le référencement.
 */
type T = { id: number; title: string; album: string; cover: string; preview: string; duration: string; explicit: boolean; link: string };

export default function TrackPreviewList({ tracks }: { tracks: T[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);

  useEffect(() => {
    const el = new Audio();
    el.preload = "none";
    el.addEventListener("ended", () => setPlaying(null));
    audioRef.current = el;
    return () => { el.pause(); audioRef.current = null; };
  }, []);

  async function toggle(t: T) {
    const el = audioRef.current;
    if (!el || !t.preview) return;
    if (playing === t.id) { el.pause(); setPlaying(null); return; }
    // La page est mise en cache 24 h mais les URL de preview Deezer expirent en ~15 min :
    // on redemande une URL fraîche au clic (et on retombe sur celle de la page sinon).
    setPlaying(t.id);
    let src = t.preview;
    try {
      const r = await fetch(`/api/blindtest/preview?id=${t.id}`, { cache: "no-store" });
      if (r.ok) src = ((await r.json()) as { previewUrl?: string }).previewUrl || src;
    } catch {}
    el.src = src;
    el.play().catch(() => setPlaying(null));
  }

  return (
    <ol className="divide-y divide-white/6 border-y border-white/8">
      {tracks.map((t, i) => (
        <li key={t.id} className="flex items-center gap-3 py-2.5" data-playing={playing === t.id}>
          <span className="font-display text-lg font-extrabold text-ink-faint w-7 text-right tabular-nums">{i + 1}</span>
          <button type="button" onClick={() => toggle(t)} disabled={!t.preview} aria-label={playing === t.id ? `Pause ${t.title}` : `Écouter un extrait de ${t.title}`} className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-surface border border-white/10 disabled:opacity-60">
            {t.cover && <img src={t.cover} alt="" width={48} height={48} loading="lazy" className="w-full h-full object-cover" />}
            {t.preview && (
              <span className={`absolute inset-0 grid place-items-center text-white ${playing === t.id ? "bg-gold/70" : "bg-black/35"}`}>
                {playing === t.id ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </span>
            )}
          </button>
          <span className="min-w-0 flex-1">
            <span className={`block text-sm font-semibold truncate ${playing === t.id ? "text-gold" : ""}`}>{t.title}{t.explicit && <span className="ml-1.5 text-[9px] font-bold text-ink-faint border border-white/20 rounded px-1 align-middle">E</span>}</span>
            {t.album && <span className="block text-xs text-ink-faint truncate">{t.album}</span>}
          </span>
          <span className="text-xs text-ink-faint tabular-nums">{t.duration}</span>
          {t.link && <a href={t.link} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${t.title} sur Deezer`} className="text-ink-faint hover:text-ink"><ExternalLink size={14} /></a>}
        </li>
      ))}
    </ol>
  );
}
