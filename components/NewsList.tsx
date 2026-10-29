import { ExternalLink } from "lucide-react";
import type { NewsItem } from "@/lib/news";

function ago(iso: string | null) {
  if (!iso) return "";
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
}

/* Les articles : image, source, titre, heure — chaque carte ouvre l'article chez le média. */
export default function NewsList({ items, compact = false }: { items: NewsItem[]; compact?: boolean }) {
  if (!items.length) return <div className="ticket p-6 text-sm text-ink-muted">Pas d&apos;actu à afficher pour l&apos;instant — reviens dans quelques minutes.</div>;
  if (compact) {
    return (
      <div className="ticket divide-y divide-white/6">
        {items.map((n) => (
          <a key={n.link} href={n.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3">
            {n.image ? <img src={n.image} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" /> : <span className="w-14 h-14 rounded-lg bg-white/6 shrink-0" />}
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-gold">{n.source} · {ago(n.date)}</span>
              <span className="block text-sm font-semibold leading-snug line-clamp-2">{n.title}</span>
            </span>
            <ExternalLink size={14} className="text-ink-faint shrink-0" />
          </a>
        ))}
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((n, i) => (
        <a key={n.link} href={n.link} target="_blank" rel="noopener noreferrer" className={`ticket overflow-hidden flex ${i === 0 ? "sm:col-span-2 flex-col" : "flex-row items-stretch"}`}>
          {n.image ? (
            <img src={n.image} alt="" className={i === 0 ? "w-full h-48 sm:h-64 object-cover" : "w-28 shrink-0 object-cover"} loading={i < 2 ? "eager" : "lazy"} />
          ) : (
            <span className={i === 0 ? "block w-full h-28 bg-white/6" : "block w-28 shrink-0 bg-white/6"} />
          )}
          <span className="p-4 min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-gold mb-1">{n.source} · {ago(n.date)}</span>
            <span className={`block font-semibold leading-snug ${i === 0 ? "font-display text-xl sm:text-2xl" : "text-sm line-clamp-3"}`}>{n.title}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
