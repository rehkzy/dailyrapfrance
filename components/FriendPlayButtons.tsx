"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Swords, Wifi, Check, ChevronDown } from "lucide-react";
import { getDailyTheme } from "@/lib/themes";

/*
 * Actions de jeu par ami (page Amis + profil) :
 *
 * · "Défier" — ouvre un menu pour choisir SUR QUEL JEU défier l'ami (toute l'arcade).
 *   Correctif : ce menu était rendu en `position: absolute` DANS la liste d'amis, dont
 *   le conteneur parent (la carte) a `overflow: hidden` pour arrondir proprement les
 *   séparateurs entre lignes — mais ça coupait aussi tout élément positionné qui dépasse
 *   son cadre, quel que soit son z-index. Le menu est maintenant rendu via un portail
 *   directement dans <body> (même technique que le tiroir de nav mobile), positionné en
 *   `fixed` à partir des coordonnées réelles du bouton — il ne peut plus être coupé par
 *   aucun ancêtre, peu importe où ce composant est utilisé sur le site.
 * · "Salon" — inchangé.
 */

type GameChallenge = {
  id: string;
  label: string;
  url: (origin: string) => string;
  text: (friendName: string) => string;
};

const GAMES: GameChallenge[] = [
  {
    id: "blindtest",
    label: "Blind Test — défi du jour",
    url: (o) => {
      const daily = getDailyTheme();
      return `${o}/blindtest?theme=${daily.id}`;
    },
    text: (n) => {
      const daily = getDailyTheme();
      return `${n}, je te défie sur le défi du jour du Blind Test Rap Français (thème : ${daily.label}) — viens battre mon score 🔥`;
    },
  },
  {
    id: "tracklist",
    label: "La Tracklist",
    url: (o) => `${o}/jeux/tracklist`,
    text: (n) => `${n}, t'as trouvé le morceau mystère du jour ? Même son pour tout le monde — viens comparer 🎯`,
  },
  {
    id: "plus-haut",
    label: "Plus Haut, Plus Bas",
    url: (o) => `${o}/jeux/plus-haut`,
    text: (n) => `${n}, viens battre ma série sur Plus Haut, Plus Bas — qui connaît le mieux les streams ? 📈`,
  },
  {
    id: "tribunal",
    label: "Le Tribunal",
    url: (o) => `${o}/jeux/tribunal`,
    text: (n) => `${n}, le duel du jour est chaud — viens voter avant que ça ferme ⚖️`,
  },
  {
    id: "pronos",
    label: "Coach A&R",
    url: (o) => `${o}/jeux/pronos`,
    text: (n) => `${n}, pose tes 3 pronos de la semaine — on compare nos flairs d'A&R 🔮`,
  },
  {
    id: "punchline",
    label: "La Punchline",
    url: (o) => `${o}/jeux/punchline`,
    text: (n) => `${n}, sauras-tu reconnaître qui a dit quoi ? Viens te mesurer sur La Punchline 🎤`,
  },
  {
    id: "ghostwriter",
    label: "Ghostwriter",
    url: (o) => `${o}/jeux/ghostwriter`,
    text: (n) => `${n}, une IA imite des rappeurs — viens voir si tu démasques mieux que moi 👻`,
  },
];

const MENU_WIDTH = 224; // largeur du menu (w-56)

export default function FriendPlayButtons({ friendName }: { friendName: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  function toggleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // Aligné à droite du bouton (comme avant), mais borné pour ne jamais sortir de
      // l'écran côté gauche sur mobile.
      let left = rect.right - MENU_WIDTH;
      left = Math.max(12, Math.min(left, window.innerWidth - MENU_WIDTH - 12));
      setMenuPos({ top: rect.bottom + 8, left });
    }
    setOpen((v) => !v);
  }

  // Ferme au clic à l'extérieur — vérifie le bouton ET le menu porté (qui vit maintenant
  // hors de l'arborescence DOM de ce composant, donc les deux refs sont nécessaires).
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  async function challenge(game: GameChallenge) {
    setOpen(false);
    const url = game.url(window.location.origin);
    const text = game.text(friendName);
    if (navigator.share) {
      try {
        await navigator.share({ title: "DailyRapFrance", text, url });
        return;
      } catch {
        // partage annulé → on retombe sur la copie
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = url;
    }
  }

  return (
    <div className="relative flex items-center gap-2 shrink-0">
      <button
        ref={btnRef}
        onClick={toggleOpen}
        aria-expanded={open}
        className="press inline-flex items-center gap-1.5 rounded-full bg-gold hover:bg-glow text-white text-xs font-semibold px-3.5 py-2 transition-colors"
        title="Envoyer un défi sur un jeu"
      >
        {copied ? <Check size={13} /> : <Swords size={13} />}
        {copied ? "Copié !" : "Défier"}
        {!copied && <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>

      {mounted &&
        open &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: MENU_WIDTH, zIndex: 200 }}
          >
            <div className="glass-strong rounded-2xl border border-white/10 p-2 shadow-2xl solved-pop">
              <p className="font-mono text-[10px] text-ink-faint uppercase tracking-wide px-2.5 pt-1.5 pb-2">
                Défier sur...
              </p>
              {GAMES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => challenge(g)}
                  className="w-full text-left text-sm rounded-lg px-2.5 py-2 text-ink-muted hover:text-gold hover:bg-white/5 transition-colors"
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}

      <a
        href="/blindtest?mode=online"
        className="press inline-flex items-center gap-1.5 rounded-full glass text-xs font-semibold px-3.5 py-2 text-ink hover:border-gold/40 transition-colors"
        title="Créer un salon privé et l'inviter"
      >
        <Wifi size={13} className="text-glow" />
        Salon
      </a>
    </div>
  );
}
