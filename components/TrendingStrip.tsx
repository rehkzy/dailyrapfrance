"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Flame } from "lucide-react";
import PreviewButton from "@/components/PreviewPlayer";
import type { TrendTrack } from "@/lib/trending";

/*
 * Bande horizontale « Les sons du moment » — pochettes qu'on fait défiler au pouce, lecture
 * de l'extrait au tap. Posée sur l'accueil et sur l'écran de fin de partie : on reste au
 * courant sans quitter le jeu. Tout le détail est sur /actu.
 */
export default function TrendingStrip({ title = "Les sons du moment", kind = "rap", limit = 10 }: { title?: string; kind?: "rap" | "tout"; limit?: number }) {
  const [tracks, setTracks] = useState<TrendTrack[] | null>(null);
  useEffect(() => {
    fetch(`/api/actu?what=tendances&kind=${kind}&limit=${limit}`).then((r) => r.json()).then((d) => setTracks(d.items ?? [])).catch(() => setTracks([]));
  }, [kind, limit]);
  if (tracks && tracks.length === 0) return null;
  return (
    <section aria-labelledby="trend-title">
      <div className="flex items-baseline justify-between mb-2.5">
        <h2 id="trend-title" className="font-display text-lg sm:text-xl font-bold inline-flex items-center gap-1.5"><Flame size={16} className="text-gold" /> {title}</h2>
        <a href="/actu" className="text-xs font-semibold text-glow inline-flex items-center gap-1">Actu &amp; tendances <ChevronRight size={12} /></a>
      </div>
      <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1 snap-x" style={{ scrollbarWidth: "none" }}>
        {(tracks ?? Array.from({ length: 6 }, () => null)).map((t, i) => (
          <div key={t?.id ?? i} className="w-[124px] shrink-0 snap-start">
            <div className="relative w-[124px] h-[124px] rounded-2xl overflow-hidden bg-white/6">
              {t?.cover && <img src={t.cover} alt="" className="w-full h-full object-cover" loading="lazy" />}
              {t && <span className="absolute left-2 top-2 rounded-full bg-black/60 backdrop-blur text-[10px] font-extrabold text-white px-1.5 py-0.5">#{t.rank}</span>}
              {t && <PreviewButton id={`s${t.id}`} src={t.preview} size={38} className="absolute right-2 bottom-2" />}
            </div>
            <p className="text-xs font-semibold truncate mt-1.5">{t?.title ?? " "}</p>
            <p className="text-[11px] text-ink-faint truncate">{t?.artist ?? " "}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
