"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon, X as CloseIcon, Info, Home, Gamepad2, Headphones, Briefcase, ChevronDown, CalendarDays, TrendingUp, Scale, Sparkles, Mic2, Ghost } from "lucide-react";
import { InstagramIcon, TikTokIcon, XIcon } from "./SocialIcons";
import AuthButton from "./AuthButton";
import { Menu, MenuItem, MenuLink, ProductItem } from "@/components/ui/navbar-menu";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

// Liens simples du tiroir mobile (hors jeux, qui sont regroupés à part ci-dessous).
const SIMPLE_LINKS = [
  { href: "/", label: "Accueil", Icon: Home },
  { href: "/a-propos", label: "À propos", Icon: Info },
];

// Jeux du tiroir mobile — regroupés dans une section repliable "Jouer" (accordéon),
// même logique que le menu déroulant desktop, plutôt qu'une liste à plat de 8 pages :
// avoir chaque jeu comme item de menu séparé au même niveau que "Accueil"/"À propos"
// noyait la nav et donnait l'impression de se perdre parmi trop de pages.
const MOBILE_GAMES = [
  { href: "/jouer", label: "Tous les jeux", Icon: Gamepad2 },
  { href: "/jouer?play=1", label: "Blind Test", Icon: Headphones },
  { href: "/jeux/artists-manager", label: "Artists Manager 26", Icon: Briefcase },
  { href: "/jeux/tracklist", label: "La Tracklist", Icon: CalendarDays },
  { href: "/jeux/plus-haut", label: "Plus Haut, Plus Bas", Icon: TrendingUp },
  { href: "/jeux/tribunal", label: "Le Tribunal", Icon: Scale },
  { href: "/jeux/pronos", label: "Coach A&R", Icon: Sparkles },
  { href: "/jeux/punchline", label: "La Punchline", Icon: Mic2 },
  { href: "/jeux/ghostwriter", label: "Ghostwriter", Icon: Ghost },
];

// Vignette pour "Tous les jeux" dans le menu — pas de screenshot du hub, donc une petite
// grille 2x2 en dégradé (couleurs de la charte) générée en SVG inline, zéro fichier à gérer.
const ALL_GAMES_PREVIEW =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%232a0509'/%3E%3Cstop offset='100%25' stop-color='%230a0707'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='200' height='200' rx='16' fill='url(%23g)'/%3E%3Crect x='30' y='30' width='60' height='60' rx='8' fill='%23F0001C'/%3E%3Crect x='110' y='30' width='60' height='60' rx='8' fill='%237A0F0F'/%3E%3Crect x='30' y='110' width='60' height='60' rx='8' fill='%23A3121B'/%3E%3Crect x='110' y='110' width='60' height='60' rx='8' fill='%23F0001C' opacity='0.6'/%3E%3C/svg%3E";

// Menu déroulant desktop "Jouer" — regroupe désormais TOUT : le hub ("Tous les jeux",
// preview grille 2x2 ci-dessus) + l'accès direct à chaque jeu, preview image façon
// Aceternity ProductItem.
const GAME_PREVIEWS = [
  { title: "Tous les jeux", href: "/jouer", src: ALL_GAMES_PREVIEW, description: "Le hub avec l'arcade complète" },
  { title: "Artists Manager 26", href: "/jeux/artists-manager", src: "/jeux/artists-manager.svg", description: "Gère ton label, signe des talents" },
  { title: "Blind Test", href: "/jouer?play=1", src: "/jeux/blind-test.png", description: "Reconnais les sons du rap français" },
  { title: "La Tracklist", href: "/jeux/tracklist", src: "/jeux/tracklist.png", description: "Le morceau mystère du jour" },
  { title: "Plus Haut, Plus Bas", href: "/jeux/plus-haut", src: "/jeux/plus-haut.png", description: "Qui stream le plus ?" },
  { title: "Le Tribunal", href: "/jeux/tribunal", src: "/jeux/tribunal.png", description: "Le duel du jour" },
  { title: "Coach A&R", href: "/jeux/pronos", src: "/jeux/coach-ar.png", description: "Tes pronos de la semaine" },
  { title: "La Punchline", href: "/jeux/punchline", src: "/jeux/punchline.png", description: "Qui a dit ça ?" },
  { title: "Ghostwriter", href: "/jeux/ghostwriter", src: "/jeux/ghostwriter.png", description: "Démasque l'IA" },
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
  const [gamesOpen, setGamesOpen] = useState(onGamePage);

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

            {/* Jouer — accordéon regroupant tous les jeux, comme le déroulant desktop */}
            <div>
              <button
                type="button"
                onClick={() => setGamesOpen((v) => !v)}
                aria-expanded={gamesOpen}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3.5 transition-colors ${
                  onGamePage ? "bg-gold/12 text-gold" : "text-ink hover:bg-white/5"
                }`}
              >
                <Gamepad2 size={18} className={onGamePage ? "text-gold" : "text-ink-faint"} />
                <span className="text-base font-medium flex-1 text-left">Jouer</span>
                <ChevronDown size={16} className={`transition-transform ${gamesOpen ? "rotate-180" : ""}`} />
              </button>
              {gamesOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1 solved-pop">
                  {MOBILE_GAMES.map((item) => {
                    const active = pathname === item.href.split("?")[0] && (item.href === "/jouer" ? pathname === "/jouer" : true);
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                          active ? "bg-gold/12 text-gold" : "text-ink-muted hover:text-ink hover:bg-white/5"
                        }`}
                      >
                        <item.Icon size={16} className={active ? "text-gold" : "text-ink-faint"} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

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
            <MenuItem setActive={setActiveMenu} active={activeMenu} item="Jouer">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 w-[440px] max-w-[calc(100vw-3rem)]">
                {GAME_PREVIEWS.map((g) => (
                  <ProductItem key={g.href} title={g.title} href={g.href} src={g.src} description={g.description} />
                ))}
              </div>
            </MenuItem>
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
