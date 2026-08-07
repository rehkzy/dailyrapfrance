"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Trophy } from "lucide-react";
import { Icon } from "@iconify/react";
import BlindTest from "@/components/BlindTest";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import BrandLoader from "@/components/BrandLoader";
import GameCover from "@/components/GameCover";

/*
 * /jouer — LE hub de tous les jeux, façon Netflix : billboard héros (cover paysage du
 * blind test en fond), rangées horizontales scrollables de covers, "Top des jeux" avec
 * les gros chiffres. Compatibilité : ?mode=, ?room=, ?play=1 montent directement le
 * blind test — le hub ne s'affiche que sur /jouer nu.
 */

const GAMES = [
  { href: "/jeux/artists-manager", title: "Artists Manager 2026", cover: "/jeux/artists-manager.png", flag: "Nouveau" },
  { href: "/jouer?play=1", title: "Blind Test", cover: "/jeux/blind-test.png", flag: null },
  { href: "/jeux/bientot?titre=La%20Tracklist", title: "La Tracklist", cover: "/jeux/tracklist.png", flag: "Bientôt" },
  { href: "/jeux/bientot?titre=Plus%20Haut%2C%20Plus%20Bas", title: "Plus Haut, Plus Bas", cover: "/jeux/plus-haut.png", flag: "Bientôt" },
  { href: "/jeux/bientot?titre=Le%20Tribunal", title: "Le Tribunal", cover: "/jeux/tribunal.png", flag: "Bientôt" },
  { href: "/jeux/bientot?titre=Coach%20A%26R", title: "Coach A&R", cover: "/jeux/coach-ar.png", flag: "Bientôt" },
  { href: "/jeux/bientot?titre=La%20Punchline", title: "La Punchline", cover: "/jeux/punchline.png", flag: "Bientôt" },
  { href: "/jeux/bientot?titre=Ghostwriter", title: "Ghostwriter", cover: "/jeux/ghostwriter.png", flag: "Bientôt" },
];

// Top des jeux — seuls les jeux réellement jouables ont une vraie activité à
// classer ; les jeux "Bientôt" n'y figurent pas (rien à classer pour l'instant).
const TOP = [GAMES[0], GAMES[1]];

const MULTI_MODES = [
  { href: "/jouer?mode=local", title: "Même écran", sub: "Un seul appareil, on se le passe", icon: "game-icons:tv" },
  { href: "/jouer?mode=online", title: "Salon privé", sub: "Un code, chacun son téléphone", icon: "game-icons:wifi-router" },
  { href: "/jouer?mode=party", title: "Mode Soirée", sub: "Écran TV + gages pour le dernier", icon: "game-icons:party-popper" },
];

function NetflixHub() {
  return (
    <div className="-mt-6">
      {/* Billboard héros — Artists Manager 2026 en jeu vedette, bannière officielle en
          fond + logo DR en watermark (façon "N" Netflix en haut du billboard) */}
      <section className="nf-billboard px-6 sm:px-10 pb-24 sm:pb-28 pt-28">
        <span
          className="absolute inset-0 -z-20"
          style={{ backgroundImage: "url(/jeux/artists-manager.png)", backgroundSize: "cover", backgroundPosition: "center" }}
          aria-hidden="true"
        />
        <img
          src="/icon.svg"
          alt=""
          aria-hidden="true"
          className="absolute top-24 left-6 sm:left-10 w-8 opacity-90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
        />
        <div className="max-w-5xl mx-auto w-full">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-3">
            DailyRap Arcade · Jeu vedette
          </p>
          <h1 className="font-impact text-4xl sm:text-7xl uppercase leading-none mb-3">
            Artists Manager 2026
          </h1>
          <p className="text-ink-muted text-sm sm:text-base max-w-md mb-6 leading-relaxed">
            Dirige ton label de rap français : signe des talents, produis leurs projets,
            gère la trésorerie et fais grimper ta réputation semaine après semaine.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <BorderMagicButton href="/jeux/artists-manager" size="lg">
              <Icon icon="game-icons:play-button" width={20} />
              Jouer
            </BorderMagicButton>
            <a
              href="/blindtest/classement?jeu=artists-manager"
              className="inline-flex items-center gap-2 glass rounded-2xl px-6 h-16 text-sm font-semibold hover:border-gold/40 transition-colors"
            >
              <Trophy size={17} />
              Classement
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 sm:px-10 space-y-12 pt-4 pb-24">
        {/* Tous les jeux — covers officielles */}
        <section>
          <h2 className="font-display text-lg sm:text-xl font-semibold mb-3">Tous les jeux</h2>
          <div className="nf-row -mx-6 px-6">
            {GAMES.map((g) => (
              <GameCover key={g.href} href={g.href} cover={g.cover} title={g.title} flag={g.flag} variant="poster" />
            ))}
          </div>
        </section>

        {/* Top façon Netflix — gros chiffres + covers portrait */}
        <section>
          <h2 className="font-display text-lg sm:text-xl font-semibold mb-3">
            Top des jeux aujourd&apos;hui 🇫🇷
          </h2>
          <div className="nf-row -mx-6 px-6 items-end">
            {TOP.map((g, i) => (
              <div key={g.href + i} className="nf-rank-item">
                <span className="nf-rank" aria-hidden="true">{i + 1}</span>
                <GameCover href={g.href} cover={g.cover} title={g.title} variant="poster" />
              </div>
            ))}
          </div>
        </section>

        {/* Multijoueur */}
        <section>
          <h2 className="font-display text-lg sm:text-xl font-semibold mb-3">Jouer à plusieurs</h2>
          <div className="nf-row -mx-6 px-6">
            {MULTI_MODES.map((m) => (
              <a
                key={m.href}
                href={m.href}
                className="nf-card flex flex-col justify-end p-3.5"
                style={{ background: "radial-gradient(110% 100% at 80% 0%, rgba(120,1,1,0.65), transparent 60%), linear-gradient(170deg, #1c090c, #0a0707)" }}
              >
                <Icon icon={m.icon} width={26} className="text-gold mb-1.5" />
                <p className="font-display text-base font-semibold leading-tight">{m.title}</p>
                <p className="text-[11px] text-ink-muted">{m.sub}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function JouerInner() {
  const params = useSearchParams();
  const wantsGame = params.get("mode") || params.get("room") || params.get("play");
  if (wantsGame) return <BlindTest />;
  return <NetflixHub />;
}

export default function JouerPage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 flex items-center justify-center">
          <BrandLoader size="md" />
        </div>
      }
    >
      <JouerInner />
    </Suspense>
  );
}
