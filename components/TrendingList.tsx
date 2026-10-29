import { Sparkles } from "lucide-react";
import PreviewButton from "@/components/PreviewPlayer";
import type { TrendTrack } from "@/lib/trending";

/* Classement des titres du moment : rang, pochette + lecture, titre/artiste, et « Blind test »
   qui ouvre le constructeur pré-rempli avec cet artiste. */
export default function TrendingList({ tracks, numbered = true }: { tracks: TrendTrack[]; numbered?: boolean }) {
  if (!tracks.length) return <div className="ticket p-6 text-sm text-ink-muted">Les tendances sont indisponibles pour l&apos;instant — reviens dans quelques minutes.</div>;
  return (
    <ol className="ticket divide-y divide-white/6">
      {tracks.map((t) => (
        <li key={t.id} className="flex items-center gap-3 px-3.5 py-2.5">
          {numbered && <span className={`w-6 text-center font-display font-extrabold text-sm shrink-0 ${t.rank <= 3 ? "text-gold" : "text-ink-faint"}`}>{t.rank}</span>}
          <span className="relative w-12 h-12 shrink-0">
            {t.cover ? <img src={t.cover} alt="" className="w-12 h-12 rounded-lg object-cover" loading="lazy" /> : <span className="block w-12 h-12 rounded-lg bg-white/6" />}
            <PreviewButton id={`t${t.id}`} src={t.preview} size={30} className="absolute inset-0 m-auto" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold truncate">{t.title}</span>
            <span className="block text-xs text-ink-faint truncate">{t.artist}</span>
          </span>
          <a href={`/creer?q=${encodeURIComponent(t.artist)}`} className="sticker sticker-ghost sticker-sm shrink-0 !h-9 !px-3 text-xs whitespace-nowrap" aria-label={`Créer un blind test ${t.artist}`}>
            <Sparkles size={12} /> Blind test
          </a>
        </li>
      ))}
    </ol>
  );
}
