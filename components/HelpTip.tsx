"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HelpCircle, X } from "lucide-react";

/*
 * Le « ? » du site. Remplace les lignes grises d'explication posées à côté des titres :
 * un petit bouton rond, et l'explication n'apparaît que si on la demande — en bulle sur
 * desktop, en feuille en bas sur mobile. `title` = la question qu'on se pose, `children` =
 * la réponse (texte court, ou une liste).
 */
export default function HelpTip({ title, children, label = "Comment ça marche ?" }: { title: string; children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [open]);

  return (
    <div ref={ref} className="help-tip">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id} aria-label={label} title={label} className="help-tip-btn">
        <HelpCircle size={15} />
      </button>
      {open && (
        <div id={id} role="dialog" aria-label={title} className="help-tip-pop solved-pop">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-sm font-bold leading-snug">{title}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="w-7 h-7 -mr-1 -mt-1 rounded-full grid place-items-center text-ink-faint hover:text-ink"><X size={14} /></button>
          </div>
          <div className="text-sm text-ink-muted leading-relaxed [&_ul]:space-y-1.5 [&_li]:flex [&_li]:items-start [&_li]:gap-2 [&_b]:text-ink [&_b]:font-semibold">{children}</div>
        </div>
      )}
    </div>
  );
}
