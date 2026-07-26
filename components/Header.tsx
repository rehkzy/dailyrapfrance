"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X as CloseIcon, Info, Gamepad2, Trophy } from "lucide-react";
import { InstagramIcon, TikTokIcon, XIcon } from "./SocialIcons";
import AuthButton from "./AuthButton";

const nav = [
  { href: "/a-propos", label: "À propos", Icon: Info },
  { href: "/blindtest", label: "Blind Test", Icon: Gamepad2 },
  { href: "/blindtest/classement", label: "Classement", Icon: Trophy },
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
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const scrollYRef = useRef(0);

  // Verrouillage du scroll en arrière-plan — la technique fiable sur iOS Safari.
  // `overflow: hidden` sur body seul ne suffit pas sur iOS : Safari continue de scroller
  // le body sous certaines conditions (rebond, clavier, etc.). On fixe le body à sa position
  // de scroll actuelle, puis on la restaure à la fermeture.
  useEffect(() => {
    if (open) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    } else {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      if (scrollYRef.current) window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
    };
  }, [open]);

  // Ferme le tiroir automatiquement si on navigue autrement (bouton retour, etc.)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => setMounted(true), []);

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
            <NavLink key={item.href} href={item.href} label={item.label} active={pathname === item.href || pathname?.startsWith(item.href + "/")} />
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
          className="lg:hidden p-2 -mr-2 text-ink relative z-[70] active:scale-90 transition-transform"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          {open ? <CloseIcon size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <ScrollProgress />

      {/* Menu mobile — tiroir qui remonte du bas, façon app native (plus naturel au pouce
          qu'un menu plein écran classique) */}
      {mounted && (
        <div
          className={`lg:hidden fixed inset-0 z-[65] transition-opacity duration-300 ${
            open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Fond — tap pour fermer */}
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Tiroir */}
          <div
            className={`absolute left-0 right-0 bottom-0 max-h-[85vh] rounded-t-3xl glass-strong overflow-hidden transition-transform duration-[350ms] ease-out ${
              open ? "translate-y-0" : "translate-y-full"
            }`}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="grain" aria-hidden="true" />
            <div className="relative px-6 pt-3 pb-8 overflow-y-auto max-h-[85vh]">
              {/* Poignée */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />

              <div className="flex items-center gap-2.5 mb-6">
                <img src="/icon.svg" alt="" aria-hidden="true" className="h-7 w-auto opacity-90" />
                <span className="font-display text-lg font-medium">DailyRapFrance</span>
              </div>

              <nav className="space-y-1.5 mb-6">
                {nav.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 transition-colors ${
                        active ? "bg-gold/12 text-gold" : "text-ink hover:bg-white/5"
                      }`}
                    >
                      <item.Icon size={18} className={active ? "text-gold" : "text-ink-faint"} />
                      <span className="text-base font-medium">{item.label}</span>
                    </a>
                  );
                })}
              </nav>

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/8">
                <AuthButton />
                <div className="flex items-center gap-2">
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
        </div>
      )}
    </header>
  );
}
