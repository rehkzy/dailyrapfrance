"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { X, Play, RotateCcw, LayoutGrid, Flame } from "lucide-react";
import { THEME_CATEGORIES, type ThemeOption } from "@/lib/themes";
import ThemeCover from "@/components/ThemeCover";
import { sfx } from "@/lib/sfx";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

/*
 * Choix du thème en plein écran, une carte à la fois — le geste que tout le monde a dans
 * les doigts : glisser à droite = je joue, à gauche = suivant, retour arrière possible.
 *
 *  - Plein écran sur téléphone (fond noir, barre de statut comprise), comme une app ;
 *    encart large sur ordinateur.
 *  - Les catégories filtrent la pile ; « Tout voir » ramène à la grille.
 *  - Tampons JOUER / SUIVANT qui apparaissent avec le geste, carte suivante visible dessous,
 *    gros boutons en bas pour celles et ceux qui ne glissent pas, aide au premier usage.
 *  - Zéro dépendance : pointer events + transforms CSS.
 */
const THRESHOLD = 90;
const HINT_KEY = "drf-swipe-hint-seen";

export default function ThemeSwipe({
  themes,
  photos,
  trending,
  highlightId,
  onPlay,
  onClose,
}: {
  themes: ThemeOption[];
  photos: Record<string, string | string[]>;
  trending: Set<string>;
  highlightId?: string | null;
  onPlay: (id: string) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState<{ dir: 1 | -1; id: string } | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [hint, setHint] = useState(false);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const order = useMemo(() => (category ? themes.filter((t) => t.category === category) : themes), [themes, category]);
  const current = order[index];
  const next = order[index + 1];
  const after = order[index + 2];

  useEffect(() => {
    setIndex(0);
    setHistory([]);
  }, [order]);

  // Plein écran : on bloque le défilement de la page derrière, et on montre l'aide une fois.
  useEffect(() => {
    lockScroll();
    try {
      if (!localStorage.getItem(HINT_KEY)) setHint(true);
    } catch {}
    return () => unlockScroll();
  }, []);
  function dismissHint() {
    if (!hint) return;
    setHint(false);
    try { localStorage.setItem(HINT_KEY, "1"); } catch {}
  }

  function commit(dir: 1 | -1) {
    if (!current || leaving) return;
    dismissHint();
    setLeaving({ dir, id: current.id });
    if (dir === 1) sfx.click();
    try { navigator.vibrate?.(dir === 1 ? 14 : 8); } catch {}
    setTimeout(() => {
      setLeaving(null);
      setDrag(null);
      if (dir === 1) onPlay(current.id);
      else {
        setHistory((h) => [...h, index]);
        setIndex((i) => (i + 1 < order.length ? i + 1 : 0));
      }
    }, 240);
  }

  function onDown(e: ReactPointerEvent) {
    if (leaving) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    setDrag({ x: 0, y: 0 });
    dismissHint();
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
    else setDrag(null);
  }
  function undo() {
    const prev = history[history.length - 1];
    if (prev === undefined) return;
    setHistory((h) => h.slice(0, -1));
    setIndex(prev);
  }

  const x = leaving ? leaving.dir * 640 : drag?.x ?? 0;
  const rot = x / 16;
  const yes = Math.max(0, Math.min(1, x / THRESHOLD));
  const no = Math.max(0, Math.min(1, -x / THRESHOLD));

  return (
    <div className="swipe-screen" role="dialog" aria-label="Choisir un thème en glissant">
      {/* Haut : fermer, titre, compteur */}
      <div className="swipe-top">
        <button type="button" onClick={onClose} aria-label="Voir tous les thèmes en grille" className="feed-icon"><LayoutGrid size={16} /></button>
        <div className="text-center min-w-0">
          <p className="font-display text-base font-extrabold leading-tight">Swipe ton thème</p>
          <p className="text-[11px] text-ink-faint">{order.length ? `${index + 1} / ${order.length}` : "Aucun thème"}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="feed-icon"><X size={16} /></button>
      </div>

      {/* Catégories : filtrent la pile */}
      <div className="swipe-cats hide-scrollbar">
        <button type="button" onClick={() => setCategory(null)} aria-pressed={category === null} className="swipe-cat">Tous</button>
        {THEME_CATEGORIES.map((c) => (
          <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c} className="swipe-cat">{c}</button>
        ))}
      </div>

      {/* La pile */}
      <div className="swipe-stage">
        {!current ? (
          <p className="text-sm text-ink-faint">Rien dans cette catégorie.</p>
        ) : (
          <div className="swipe-stack">
            {after && <div className="swipe-card" style={{ transform: "translateY(26px) scale(0.9)", opacity: 0.45 }} aria-hidden="true"><ThemeCover Icon={after.Icon} label={after.label} index={index + 2} photoUrl={photos[after.id]} /></div>}
            {next && <div className="swipe-card" style={{ transform: "translateY(13px) scale(0.95)", opacity: 0.75 }} aria-hidden="true"><ThemeCover Icon={next.Icon} label={next.label} index={index + 1} photoUrl={photos[next.id]} /></div>}
            <div
              key={current.id}
              className="swipe-card swipe-card-top"
              data-dragging={!!drag && !leaving}
              style={{ transform: `translate(${x}px, ${(drag?.y ?? 0) * 0.25}px) rotate(${rot}deg)`, transition: drag && !leaving ? "none" : "transform 0.24s cubic-bezier(0.22,1,0.36,1)" } as CSSProperties}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={() => { startRef.current = null; setDrag(null); }}
              role="group"
              aria-label={`${current.label} — glisser à droite pour jouer, à gauche pour passer`}
            >
              <ThemeCover Icon={current.Icon} label={current.label} index={index} photoUrl={photos[current.id]} />
              <span className="swipe-stamp swipe-stamp-yes" style={{ opacity: yes }}>JOUER</span>
              <span className="swipe-stamp swipe-stamp-no" style={{ opacity: no }}>SUIVANT</span>
              <span className="swipe-tint swipe-tint-yes" style={{ opacity: yes * 0.35 }} aria-hidden="true" />
              <span className="swipe-tint swipe-tint-no" style={{ opacity: no * 0.5 }} aria-hidden="true" />
              <span className="swipe-caption">
                {current.id === highlightId ? (
                  <span className="swipe-badge"><Flame size={12} /> Défi de la semaine</span>
                ) : trending.has(current.id) ? (
                  <span className="swipe-badge">Tendance</span>
                ) : (
                  <span className="swipe-badge swipe-badge-soft">{current.category}</span>
                )}
                <span className="block font-display text-3xl font-extrabold leading-[0.95] tracking-tight mt-2">{current.label.replace(/^Blind Test /i, "")}</span>
                <span className="block text-sm text-white/85 mt-1.5">{current.text}</span>
                <button type="button" onClick={() => commit(1)} className="swipe-play-pill"><Play size={14} fill="currentColor" /> Jouer ce thème</button>
              </span>
              {hint && (
                <span className="swipe-hint" aria-hidden="true">
                  <span className="swipe-hint-hand">👆</span>
                  <span className="swipe-hint-text">Glisse à droite pour jouer, à gauche pour passer</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bas : actions */}
      <div className="swipe-actions">
        <button type="button" onClick={undo} disabled={history.length === 0} aria-label="Revenir au thème précédent" className="swipe-btn swipe-btn-sm"><RotateCcw size={18} /></button>
        <button type="button" onClick={() => commit(-1)} aria-label="Passer ce thème" className="swipe-btn swipe-btn-no"><X size={28} strokeWidth={3} /></button>
        <button type="button" onClick={() => commit(1)} aria-label="Jouer ce thème" className="swipe-btn swipe-btn-yes"><Play size={30} fill="currentColor" /></button>
        <button type="button" onClick={onClose} aria-label="Tout voir" className="swipe-btn swipe-btn-sm"><LayoutGrid size={18} /></button>
      </div>
    </div>
  );
}
