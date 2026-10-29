"use client";

import type { ReactNode } from "react";

/* Petites briques partagées du back-office — même vocabulaire partout (façon YouTube Studio :
   panneaux sobres, titres courts, actions à droite). */
export function Panel({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/8">
          <h3 className="text-sm font-semibold">{title}</h3>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, sub, tone = "neutral", href }: { label: string; value: number | string; sub?: string; tone?: "neutral" | "alert" | "good"; href?: string }) {
  const inner = (
    <>
      <p className="text-xs text-ink-faint">{label}</p>
      <p className={`font-display text-3xl font-bold mt-1 ${tone === "alert" ? "text-gold" : ""}`}>{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</p>
      {sub && <p className="text-[11px] text-ink-faint mt-1">{sub}</p>}
    </>
  );
  return href ? <a href={href} className={`card p-4 block hover:border-white/25 ${tone === "alert" ? "border-gold/40" : ""}`}>{inner}</a> : <div className={`card p-4 ${tone === "alert" ? "border-gold/40" : ""}`}>{inner}</div>;
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${on ? "bg-white text-black" : "bg-white/6 text-ink-muted hover:text-ink"}`}>
      {children}
    </button>
  );
}

export function Btn({ children, onClick, href, tone = "ghost", disabled, title, small }: { children: ReactNode; onClick?: () => void; href?: string; tone?: "ghost" | "primary" | "danger"; disabled?: boolean; title?: string; small?: boolean }) {
  const cls = `inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors disabled:opacity-40 ${small ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"} ${
    tone === "primary" ? "bg-gold text-white hover:bg-glow" : tone === "danger" ? "bg-riseNeg/15 text-riseNeg hover:bg-riseNeg/25" : "bg-white/6 text-ink-muted hover:text-ink hover:bg-white/10"
  }`;
  if (href) return <a href={href} className={cls} title={title} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{children}</a>;
  return <button type="button" onClick={onClick} disabled={disabled} className={cls} title={title}>{children}</button>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gold/50 ${props.className ?? ""}`} />;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card p-8 text-center text-sm text-ink-faint">{children}</div>;
}

export function Avatar({ url, name, size = 32 }: { url?: string | null; name: string; size?: number }) {
  return url ? (
    <img src={url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-full grid place-items-center text-white font-bold shrink-0" style={{ width: size, height: size, fontSize: size * 0.4, background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{(name || "?").slice(0, 1).toUpperCase()}</span>
  );
}

export function rel(iso: string | null | undefined) {
  if (!iso) return "—";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}
