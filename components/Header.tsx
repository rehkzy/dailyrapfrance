"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon, X as CloseIcon, Info, Home, Gamepad2 } from "lucide-react";
import { InstagramIcon, TikTokIcon, XIcon } from "./SocialIcons";
import AuthButton from "./AuthButton";
import { Menu, MenuLink } from "@/components/ui/navbar-menu";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

// Liens simples du tiroir mobile (hors jeux, qui sont regroupés à part ci-dessous).
const SIMPLE_LINKS = [
  { href: "/", label: "Accueil", Icon: Home },
  { href: "/a-propos", label: "À propos", Icon: Info },
];

// Un seul jeu pour le moment (le blind test) : "Jouer" est un lien direct, plus
// un menu-catalogue. Les listes MOBILE_GAMES / GAME_PREVIEWS sont dans l'historique
// git pour le jour où l'arcade rouvre.
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

// Tiroir mobile — rendu via un portail DIRECTEMENT dans <body>, en dehors du <header>.
// C'est le point important : le header est en `position: sticky`, et le verrouillage du
// scroll d'arrière-plan met `<body>` en `position: fixed` pendant que le tiroir est ouvert.
// Ces deux `position` en interaction cassaient l'affichage du tiroir (visible seulement en
// partie, mal positionné) quand il était imbriqué dans le header. En le sortant via un
// portail, il n'hérite plus d'aucun contexte de positionnement parasite : son
// `position: fixed` est toujours relatif au vrai viewport.
function MobileMenu({
  open,
  onClose,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onGamePage = !!pathname && (pathname === "/jouer" || pathname.startsWith("/jeux/"));
  // Replié par défaut, sauf si on est déjà sur une page jeu — pas la peine de forcer un
  // tap supplémentaire pour retrouver où on est.

  if (!mounted) return null;

  return createPortal(
    <div
      className={`lg:hidden fixed inset-0 z-[200] transition-opacity duration-300 ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Fond — tap pour fermer */}
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={onClose}
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

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <img src="/icon.svg" alt="" aria-hidden="true" className="h-7 w-auto opacity-90" />
              <span className="font-display text-lg font-medium">DailyRapFrance</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le menu"
              className="w-9 h-9 flex items-center justify-center rounded-full glass text-ink-muted hover:text-ink"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          <nav className="space-y-1.5 mb-6">
            {/* Accueil */}
            {(() => {
              const item = SIMPLE_LINKS[0];
              const active = pathname === item.href;
              return (
                <a
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3.5 transition-colors ${
                    active ? "bg-gold/12 text-gold" : "text-ink hover:bg-white/5"
                  }`}
                >
                  <item.Icon size={18} className={active ? "text-gold" : "text-ink-faint"} />
                  <span className="text-base font-medium">{item.label}</span>
                </a>
              );
            })()}

            {/* Jouer — lien direct vers le blind test, seul jeu du site pour le moment
                (l'accordéon multi-jeux reviendra avec le catalogue). */}
            <a
              href="/jouer"
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3.5 transition-colors ${
                onGamePage ? "bg-gold/12 text-gold" : "text-ink hover:bg-white/5"
              }`}
            >
              <Gamepad2 size={18} className={onGamePage ? "text-gold" : "text-ink-faint"} />
              <span className="text-base font-medium flex-1 text-left">Jouer</span>
            </a>

            {/* À propos */}
            {(() => {
              const item = SIMPLE_LINKS[1];
              const active = pathname === item.href;
              return (
                <a
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3.5 transition-colors ${
                    active ? "bg-gold/12 text-gold" : "text-ink hover:bg-white/5"
                  }`}
                >
                  <item.Icon size={18} className={active ? "text-gold" : "text-ink-faint"} />
                  <span className="text-base font-medium">{item.label}</span>
                </a>
              );
            })()}
          </nav>

          <div className="flex flex-col gap-4 pt-4 border-t border-white/8">
            <AuthButton variant="mobile" />
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
    </div>,
    document.body
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  // Menu déroulant desktop actif ("Jouer", "Communauté", ou null) — séparé du tiroir
  // mobile, qui a son propre état `open`.
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const pathname = usePathname();

  // Verrouillage du scroll en arrière-plan — verrou partagé (compteur de références,
  // voir lib/scrollLock.ts) : évite les conflits avec un autre verrou actif ailleurs
  // sur le site (ex. une manche de blind test en cours) qui s'écrasaient l'un l'autre.
  useEffect(() => {
    if (open) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [open]);

  // Ferme le tiroir automatiquement si on navigue autrement
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="nav-panel sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 shrink-0 group/logo" onClick={() => setOpen(false)}>
          <img
            src="/logo.svg"
            alt="DailyRapFrance"
            className="h-8 w-auto transition-[filter] duration-300 group-hover/logo:drop-shadow-[0_0_14px_rgba(240,0,28,0.55)]"
          />
        </a>

        {/* Nav desktop — Accueil, Jouer (déroulant : hub "Tous les jeux" en tête + accès
            direct à chaque jeu avec preview image), À propos */}
        <div className="hidden lg:flex">
          <Menu setActive={setActiveMenu}>
            <MenuLink href="/" active={pathname === "/"} setActive={setActiveMenu}>
              Accueil
            </MenuLink>
            <MenuLink href="/jouer" active={pathname === "/jouer"} setActive={setActiveMenu}>
              Jouer
            </MenuLink>
            <MenuLink href="/a-propos" active={pathname === "/a-propos"} setActive={setActiveMenu}>
              À propos
            </MenuLink>
          </Menu>
        </div>

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
          className="lg:hidden p-2 -mr-2 text-ink relative active:scale-90 transition-transform"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
        </button>
      </div>

      <ScrollProgress />

      <MobileMenu open={open} onClose={() => setOpen(false)} pathname={pathname} />
    </header>
  );
}
