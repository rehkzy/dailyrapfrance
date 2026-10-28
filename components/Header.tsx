"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon, X as CloseIcon, Play, Trophy, Users, Info, Home, Tv, User, Globe, Clapperboard, Sparkles } from "lucide-react";
import { InstagramIcon, TikTokIcon, XIcon } from "./SocialIcons";
import AuthButton from "./AuthButton";
import DailyCard from "@/components/DailyCard";
import { BrandTile } from "@/components/BrandMark";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

/*
 * En-tête v2 — un seul objectif : amener au jeu en un tap.
 *  - Desktop : logo, 4 liens, et un bouton rouge "Jouer" toujours visible.
 *  - Mobile : logo + bouton "Jouer" + menu. Le tiroir contient le défi de la semaine (compact),
 *    les 5 façons de jouer en tuiles, puis les pages secondaires.
 */

const NAV = [
  { href: "/", label: "Accueil", Icon: Home },
  { href: "/jouer", label: "Jouer", Icon: Play },
  { href: "/creer", label: "Créer", Icon: Sparkles },
  { href: "/blindtest/classement", label: "Classement", Icon: Trophy },
  { href: "/a-propos", label: "À propos", Icon: Info },
];

const MODES = [
  { href: "/jouer?mode=solo", label: "Solo", sub: "À ton rythme", Icon: User },
  { href: "/jouer?mode=clips", label: "Devine le clip", sub: "Swipe, regarde, réponds", Icon: Clapperboard },
  { href: "/jouer?mode=local", label: "Entre potes", sub: "Un écran, un buzzer", Icon: Users },
  { href: "/jouer?mode=online", label: "Salon en ligne", sub: "Un code, chacun chez soi", Icon: Globe },
  { href: "/jouer?mode=party", label: "Soirée TV", sub: "Téléphones + gages", Icon: Tv },
  { href: "/creer", label: "Crée le tien", sub: "Tes morceaux, ton lien — nouveau", Icon: Sparkles },
];

const socials = [
  { label: "Instagram", href: "https://www.instagram.com/dailyrapfrance/", Icon: InstagramIcon },
  { label: "TikTok", href: "https://www.tiktok.com/@dailyrapfrance", Icon: TikTokIcon },
  { label: "X", href: "https://x.com/DailyRapFrance", Icon: XIcon },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// Tiroir mobile — portail directement dans <body> (le header est sticky et le verrou de
// scroll met <body> en position: fixed ; imbriqué, le tiroir se positionnait mal).
function MobileMenu({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Touche Échap = fermer (clavier, iPad avec clavier, ordinateur en fenêtre étroite)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`lg:hidden fixed inset-0 z-[200] transition-opacity duration-300 ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <button type="button" aria-label="Fermer le menu" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      {/*
        Hauteur en dvh/svh (pas en vh) : sur iPhone, 100vh = l'écran SANS les barres de Safari,
        donc un tiroir de 88vh dépassait par le haut quand les barres étaient affichées et la
        croix de fermeture devenait inaccessible. L'en-tête du tiroir (poignée + croix) est
        maintenant HORS de la zone qui défile : il reste toujours visible.
      */}
      <div
        className={`drawer-sheet absolute left-0 right-0 bottom-0 mx-auto w-full sm:max-w-lg flex flex-col rounded-t-3xl bg-[#120b0c] border-t border-x-0 sm:border-x border-white/10 overflow-hidden transition-transform duration-[350ms] ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="shrink-0 px-5 pt-3 pb-3 border-b border-white/[0.06]">
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BrandTile size={30} />
              <span className="font-display text-lg font-semibold">DailyRapFrance</span>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer le menu" className="w-11 h-11 -mr-1 flex items-center justify-center rounded-full glass text-ink hover:text-ink">
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-5 pt-4 pb-8 overflow-y-auto overscroll-contain" data-lenis-prevent>
          <div className="mb-5">
            <DailyCard variant="compact" />
          </div>

          <p className="text-xs font-semibold text-ink-faint mb-2">Jouer</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {MODES.map((m, i) => (
              <a key={m.href} href={m.href} className={`mode-tile min-h-[104px] p-3.5 ${i === MODES.length - 1 && MODES.length % 2 === 1 ? "col-span-2" : ""}`}>
                <span className="mode-wash" aria-hidden="true" />
                <span className="mode-icon !w-8 !h-8 !rounded-lg !top-3 !left-3"><m.Icon size={15} /></span>
                <span className="relative text-sm font-semibold">{m.label}</span>
                <span className="relative text-[11px] text-ink-faint">{m.sub}</span>
              </a>
            ))}
          </div>

          <nav className="space-y-1 mb-6">
            {NAV.filter((n) => n.href !== "/jouer").map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${active ? "bg-gold/12 text-gold" : "text-ink hover:bg-white/5"}`}
                >
                  <item.Icon size={18} className={active ? "text-gold" : "text-ink-faint"} />
                  <span className="text-[15px] font-medium">{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="flex flex-col gap-4 pt-4 border-t border-white/8">
            <AuthButton variant="mobile" />
            <div className="flex items-center gap-2">
              {socials.map(({ label, href, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="glass w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:text-gold transition-colors">
                  <Icon />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const onGame = isActive(pathname, "/jouer") || isActive(pathname, "/blindtest");

  // En mode app (écran d'accueil iOS, barre de statut translucide), le header passait sous
  // l'heure et la batterie dès qu'on scrollait : on réserve la zone sûre en haut.
  return (
    <header className="nav-panel sticky top-0 z-50 rounded-none border-x-0 border-t-0" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center gap-4">
        <a href="/" className="flex items-center shrink-0 group/logo" aria-label="DailyRapFrance — accueil">
          <img
            src="/logo.svg"
            alt="DailyRapFrance"
            className="h-7 sm:h-8 w-auto transition-[filter] duration-300 group-hover/logo:drop-shadow-[0_0_14px_rgba(240,0,28,0.55)]"
          />
        </a>

        <nav className="hidden lg:flex items-center gap-1 ml-6" aria-label="Navigation principale">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${active ? "text-gold bg-gold/10" : "text-ink-muted hover:text-ink hover:bg-white/5"}`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {!onGame && (
            <a
              href="/jouer"
              className="inline-flex items-center gap-1.5 h-10 px-4 sm:px-5 rounded-full bg-gold hover:bg-glow text-white text-sm font-semibold transition-colors shadow-brand"
            >
              <Play size={15} fill="currentColor" />
              Jouer
            </a>
          )}
          <div className="hidden lg:block">
            <AuthButton />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden w-10 h-10 -mr-2 grid place-items-center text-ink active:scale-90 transition-transform"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>

      <MobileMenu open={open} onClose={() => setOpen(false)} pathname={pathname} />
    </header>
  );
}
