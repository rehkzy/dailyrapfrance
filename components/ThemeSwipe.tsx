"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { X, Play, RotateCcw } from "lucide-react";
import type { ThemeOption } from "@/lib/themes";
import ThemeCover from "@/components/ThemeCover";
import { sfx } from "@/lib/sfx";

/*
 * Choix du thème en « pile de cartes » : une affiche à la fois, on glisse à droite pour jouer,
 * à gauche pour passer (ou on touche les deux boutons). Le geste que tout le monde connaît,
 * appliqué au seul choix qui compte avant de lancer une partie. Zéro dépendance : pointer
 * events + transforms CSS.
 */
const THRESHOLD = 90; // px à partir desquels le geste est pris en compte

export default function ThemeSwipe({
  themes,
  photos,
  trending,
  highlightId,
  onPlay,
}: {
  themes: ThemeOption[];
  photos: Record<string, string | string[]>;
  trending: Set<string>;
  highlightId?: string | null;
  onPlay: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState<{ dir: 1 | -1; id: string } | null>(null);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  const order = useMemo(() => themes, [themes]);
  const current = order[index];
  const next = order[index + 1];
  const after = order[index + 2];

  useEffect(() => {
    setIndex(0);
    setHistory([]);
  }, [order]);

  function commit(dir: 1 | -1) {
    if (!current || leaving) return;
    setLeaving({ dir, id: current.id });
    if (dir === 1) sfx.click();
    setTimeout(() => {
      setLeaving(null);
      setDrag(null);
      if (dir === 1) onPlay(current.id);
      else {
        setHistory((h) => [...h, index]);
        setIndex((i) => (i + 1 < order.length ? i + 1 : 0));
      }
    }, 260);
  }

  function onDown(e: ReactPointerEvent) {
    if (leaving) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    setDrag({ x: 0, y: 0 });
  }
  function onMove(e: ReactPointerEvent) {
    if (!startRef.current) return;
    setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  }
  function onUp(e: ReactPointerEvent) {
    const s = startRef.current;
    startRef.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dt = Date.now() - s.t;
    const fast = Math.abs(dx) > 40 && dt < 220;
    if (dx > THRESHOLD || (fast && dx > 0)) commit(1);
    else if (dx < -THRESHOLD || (fast && dx < 0)) commit(-1);
    else if (Math.abs(dx) < 6 && dt < 300) commit(1); // simple tap = jouer
    else setDrag(null);
  }

  function undo() {
    const prev = history[history.length - 1];
    if (prev === undefined) return;
    setHistory((h) => h.slice(0, -1));
    setIndex(prev);
  }

  if (!current) return null;

  const x = leaving ? leaving.dir * 520 : drag?.x ?? 0;
  const rot = x / 18;
  const likeOpacity = Math.max(0, Math.min(1, x / THRESHOLD));
  const nopeOpacity = Math.max(0, Math.min(1, -x / THRESHOLD));

  return (
    <div className="swipe-wrap">
      <div className="swipe-stack">
        {after && <div className="swipe-card" style={{ transform: "translateY(22px) scale(0.9)", opacity: 0.5 }} aria-hidden="true"><ThemeCover Icon={after.Icon} label={after.label} index={index + 2} photoUrl={photos[after.id]} /></div>}
        {next && <div className="swipe-card" style={{ transform: "translateY(11px) scale(0.95)", opacity: 0.8 }} aria-hidden="true"><ThemeCover Icon={next.Icon} label={next.label} index={index + 1} photoUrl={photos[next.id]} /></div>}
        <div
          key={current.id}
          className="swipe-card swipe-card-top"
          data-dragging={!!drag && !leaving}
          style={{ transform: `translate(${x}px, ${(drag?.y ?? 0) * 0.3}px) rotate(${rot}deg)`, transition: drag && !leaving ? "none" : "transform 0.26s cubic-bezier(0.22,1,0.36,1)" } as CSSProperties}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => { startRef.current = null; setDrag(null); }}
          role="button"
          aria-label={`${current.label} — glisser à droite pour jouer, à gauche pour passer`}
        >
          <ThemeCover Icon={current.Icon} label={current.label} index={index} photoUrl={photos[current.id]} tag={current.id === highlightId ? "🔥 Défi de la semaine" : trending.has(current.id) ? "Tendance" : current.category === "Artistes" ? "Artiste" : undefined} />
          <span className="swipe-stamp swipe-stamp-yes" style={{ opacity: likeOpacity }}>JOUER</span>
          <span className="swipe-stamp swipe-stamp-no" style={{ opacity: nopeOpacity }}>SUIVANT</span>
          <span className="swipe-caption">
            <span className="block font-display text-2xl font-extrabold leading-tight">{current.label}</span>
            <span className="block text-sm text-white/80 mt-1">{current.text}</span>
          </span>
        </div>
      </div>

      <div className="swipe-actions">
        <button type="button" onClick={undo} disabled={history.length === 0} aria-label="Revenir au thème précédent" className="swipe-btn swipe-btn-sm"><RotateCcw size={16} /></button>
        <button type="button" onClick={() => commit(-1)} aria-label="Passer ce thème" className="swipe-btn swipe-btn-no"><X size={26} strokeWidth={3} /></button>
        <button type="button" onClick={() => commit(1)} aria-label="Jouer ce thème" className="swipe-btn swipe-btn-yes"><Play size={26} fill="currentColor" /></button>
        <span className="swipe-btn swipe-btn-sm swipe-counter" aria-live="polite">{index + 1}/{order.length}</span>
      </div>
      <p className="text-center text-xs text-ink-faint mt-3">Glisse à droite pour jouer, à gauche pour passer.</p>
    </div>
  );
}
