"use client";

import { useEffect, useRef, useState } from "react";
import { Swords, Wifi, Check, ChevronDown } from "lucide-react";
import { getDailyTheme } from "@/lib/themes";

/*
 * Actions de jeu par ami (page Amis + profil) :
 *
 * · "Défier" — ouvre désormais un petit menu pour choisir SUR QUEL JEU défier l'ami
 *   (toute l'arcade, plus seulement le blind test). Chaque jeu a son lien et son
 *   message de partage adapté. Partage natif (WhatsApp, iMessage…) quand le navigateur
 *   le permet, sinon copie du lien.
 * · "Salon" — inchangé : écran de création de salon privé en ligne (?mode=online).
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

export default function FriendPlayButtons({ friendName }: { friendName: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Ferme le menu au clic à l'extérieur — indispensable dans une liste d'amis où
  // plusieurs instances de ce composant cohabitent.
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
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
      // dernier recours : navigation directe vers le jeu
      window.location.href = url;
    }
  }

  return (
    <div ref={wrapRef} className="relative flex items-center gap-2 shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="press inline-flex items-center gap-1.5 rounded-full bg-gold hover:bg-glow text-white text-xs font-semibold px-3.5 py-2 transition-colors"
        title="Envoyer un défi sur un jeu"
      >
        {copied ? <Check size={13} /> : <Swords size={13} />}
        {copied ? "Copié !" : "Défier"}
        {!copied && <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 z-30 w-56">
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
        </div>
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
