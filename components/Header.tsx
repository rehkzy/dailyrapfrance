"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X as CloseIcon } from "lucide-react";
import { InstagramIcon, TikTokIcon, XIcon } from "./SocialIcons";
import AuthButton from "./AuthButton";

const nav = [
  { href: "/a-propos", label: "À propos" },
  { href: "/blindtest", label: "Blind Test" },
  { href: "/blindtest/classement", label: "Classement" },
];

const socials = [
  { label: "Instagram", href: "https://www.instagram.com/dailyrapfrance/", Icon: InstagramIcon },
  { label: "TikTok", href: "https://www.tiktok.com/@dailyrapfrance", Icon: TikTokIcon },
  { label: "X", href: "https://x.com/DailyRapFrance", Icon: XIcon },
];

// Barre de progression de lecture — fine ligne rouge sous le header, discrète mais utile
// sur un média où on lit des pages longues.
function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const h = document.documentElement;
      const scrollable = h.scrollHeight - h.clientHeight;
      setProgress(scrollable > 0 ? (h.scrollTop / scrollable) * 100 : 0);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="h-px bg-white/8 overflow-hidden">
      <div
        className="h-full bg-gold transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      className={`group/nav relative py-2 text-xs font-mono uppercase tracking-[0.12em] transition-colors ${
        active ? "text-gold" : "text-ink-muted hover:text-ink"
      }`}
    >
      {label}
      <span
        className={`absolute left-0 -bottom-0.5 h-px bg-gold transition-all duration-300 ${
          active ? "w-full" : "w-0 group-hover/nav:w-full"
        }`}
      />
    </a>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="glass sticky top-0 z-50 rounded-none">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 shrink-0 group/logo" onClick={() => setOpen(false)}>
          <img
            src="/logo.svg"
            alt="DailyRapFrance"
            className="h-8 w-auto transition-[filter] duration-300 group-hover/logo:drop-shadow-[0_0_14px_rgba(240,0,28,0.55)]"
          />
        </a>

        {/* Nav desktop */}
        <nav className="hidden lg:flex items-center gap-7">
          {nav.map((item) => (
            <NavLink key={item.href} {...item} active={pathname === item.href || pathname?.startsWith(item.href + "/")} />
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <a
            href="https://www.instagram.com/dailyrapfrance/"
            target="_blank"
            rel="noopener noreferrer"
            className="glass rounded-full px-4 py-1.5 text-xs font-medium hover:border-gold/40 transition-colors"
          >
            Nous suivre
          </a>
          <AuthButton />
        </div>

        {/* Toggle mobile */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden p-2 -mr-2 text-ink z-[60] relative"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          {open ? <CloseIcon size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <ScrollProgress />

      {/* Menu mobile — takeover plein écran, typo kinétique façon line-up */}
      {open && (
        <div className="lg:hidden fixed inset-0 top-0 z-50 bg-bg">
          <div className="grain" aria-hidden="true" />
          <div className="brand-glow" aria-hidden="true" />
          <div className="relative h-full flex flex-col px-6 pt-24 pb-10 overflow-y-auto">
            <img src="/icon.svg" alt="" aria-hidden="true" className="h-10 w-auto opacity-90 mb-6" />
            <nav className="flex-1 flex flex-col justify-center gap-1">
              {nav.map((item, i) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="group flex items-baseline gap-4 py-3 border-b border-white/8"
                  >
                    <span className="font-mono text-xs text-ink-faint w-6">{String(i + 1).padStart(2, "0")}</span>
                    <span
                      className={`font-display text-4xl sm:text-5xl font-medium tracking-tight transition-colors ${
                        active ? "text-gold" : "text-ink group-hover:text-gold"
                      }`}
                    >
                      {item.label}
                    </span>
                  </a>
                );
              })}
            </nav>

            <div className="mt-10 flex items-center justify-center gap-6">
              <AuthButton />
              <div className="flex items-center gap-3">
                {socials.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="glass w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:text-gold transition-colors"
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
