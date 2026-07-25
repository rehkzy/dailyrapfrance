"use client";

import { useEffect, useState } from "react";
import { Menu, X as CloseIcon } from "lucide-react";

const nav = [
  { href: "/mag", label: "Mag" },
  { href: "/artistes", label: "Artistes" },
  { href: "/sorties", label: "Sorties" },
  { href: "/charts", label: "Charts" },
  { href: "/certifications", label: "Certifs" },
  { href: "/blindtest", label: "Blind Test" },
  { href: "/explorer/graphe", label: "Explorer" },
];

function ParisClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const update = () =>
      setTime(
        new Intl.DateTimeFormat("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Paris",
        }).format(new Date())
      );
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;
  return <span>Paris, {time}</span>;
}

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="glass sticky top-0 z-50 rounded-none">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 shrink-0" onClick={() => setOpen(false)}>
          <img src="/logo.svg" alt="DailyRapFrance" className="h-6 w-auto" />
        </a>

        {/* Nav desktop */}
        <nav className="hidden lg:flex items-center gap-5">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-ink-muted hover:text-ink transition-colors whitespace-nowrap"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            <span className="pulse-dot" aria-hidden="true" />
            En direct <span className="text-ink-faint/50">·</span> <ParisClock />
          </span>
          <a
            href="https://www.instagram.com/dailyrapfrance/"
            target="_blank"
            rel="noopener noreferrer"
            className="glass rounded-full px-4 py-1.5 text-xs font-medium hover:bg-white/8 hover:border-gold/40 transition-colors"
          >
            Nous suivre
          </a>
        </div>

        {/* Toggle mobile */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden p-2 -mr-2 text-ink"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          {open ? <CloseIcon size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Nav mobile */}
      {open && (
        <nav className="lg:hidden border-t border-white/8 px-6 py-5 flex flex-col gap-1">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="py-2.5 text-base text-ink-muted hover:text-ink transition-colors"
            >
              {item.label}
            </a>
          ))}
          <a
            href="https://www.instagram.com/dailyrapfrance/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 glass rounded-full px-4 py-2.5 text-sm font-medium text-center hover:bg-white/8 transition-colors"
          >
            Nous suivre
          </a>
        </nav>
      )}
    </header>
  );
}
