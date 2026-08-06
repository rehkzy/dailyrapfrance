"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import { Icon } from "@iconify/react";
import BlindTest from "@/components/BlindTest";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import BrandLoader from "@/components/BrandLoader";

/*
 * /jouer — transformé en hub façon Netflix : billboard héros, rangées horizontales
 * scrollables, "Top des jeux" avec les gros chiffres, badges rouges.
 *
 * IMPORTANT — compatibilité des liens existants : tous les deep-links historiques
 * (?mode=solo|local|online|party, ?room=CODE) continuent de lancer directement le
 * blind test comme avant. Le hub ne s'affiche que sur /jouer "nu". Le CTA du
 * billboard pointe vers ?play=1, qui monte aussi le blind test (écran de config).
 */

const NEW_GAMES = [
  { href: "/jeux/tracklist", title: "Le Tracklist", sub: "Le morceau mystère du jour", icon: "game-icons:calendar", flag: "Défi du jour", g: "radial-gradient(100% 100% at 80% 0%, rgba(240,0,28,0.55), transparent 60%), linear-gradient(160deg, #2a0509, #0d0708)" },
  { href: "/jeux/plus-haut", title: "Plus Haut, Plus Bas", sub: "Qui stream le plus ?", icon: "game-icons:chart", flag: null, g: "radial-gradient(110% 100% at 20% 100%, rgba(255,59,78,0.4), transparent 60%), linear-gradient(200deg, #1c090c, #0a0707)" },
  { href: "/jeux/tribunal", title: "Le Tribunal", sub: "Le duel du jour", icon: "game-icons:scales", flag: "Vote du jour", g: "radial-gradient(110% 100% at 85% 100%, rgba(120,1,1,0.75), transparent 60%), linear-gradient(160deg, #170a0c, #0a0707)" },
  { href: "/jeux/pronos", title: "Coach A&R", sub: "Tes pronos de la semaine", icon: "game-icons:crystal-ball", flag: null, g: "radial-gradient(100% 100% at 15% 0%, rgba(240,0,28,0.35), transparent 55%), linear-gradient(180deg, #1a070b, #0a0707)" },
  { href: "/jeux/punchline", title: "La Punchline", sub: "Qui a dit ça ?", icon: "game-icons:microphone", flag: null, g: "radial-gradient(110% 100% at 90% 15%, rgba(255,107,59,0.3), transparent 55%), linear-gradient(170deg, #200a0d, #0a0707)" },
  { href: "/jeux/ghostwriter", title: "Ghostwriter", sub: "Démasque l'IA", icon: "game-icons:ghost", flag: null, g: "radial-gradient(100% 100% at 50% 0%, rgba(240,0,28,0.35), transparent 55%), linear-gradient(180deg, #150a10, #0a0707)" },
];

// Le Top — l'ordre reflète simplement la mise en avant éditoriale du moment.
const TOP_GAMES = [
  { href: "/jouer?play=1", title: "Blind Test", icon: "game-icons:headphones", g: "radial-gradient(120% 100% at 50% 0%, rgba(240,0,28,0.6), transparent 65%), linear-gradient(180deg, #3a0508, #0d0708)" },
  { href: "/jeux/tracklist", title: "Le Tracklist", icon: "game-icons:calendar", g: "linear-gradient(200deg, #7a0f0f, #12060a)" },
  { href: "/jeux/plus-haut", title: "Plus Haut", icon: "game-icons:chart", g: "linear-gradient(160deg, #a3121b, #150708)" },
  { href: "/jeux/tribunal", title: "Le Tribunal", icon: "game-icons:scales", g: "linear-gradient(180deg, #5c0a10, #0d0708)" },
  { href: "/jeux/pronos", title: "Coach A&R", icon: "game-icons:crystal-ball", g: "linear-gradient(200deg, #43060b, #0a0707)" },
];

const MULTI_MODES = [
  { href: "/jouer?mode=local", title: "Même écran", sub: "Un seul appareil, on se le passe", icon: "game-icons:tv" },
  { href: "/jouer?mode=online", title: "Salon privé", sub: "Un code, chacun son téléphone", icon: "game-icons:wifi-router" },
  { href: "/jouer?mode=party", title: "Mode Soirée", sub: "Écran TV + gages pour le dernier", icon: "game-icons:party-popper" },
];

function NetflixHub() {
  return (
    <div className="-mt-6">
      {/* Billboard héros */}
      <section className="nf-billboard px-6 sm:px-10 pb-10 pt-28 -mx-6">
        <div className="max-w-5xl mx-auto w-full">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-3">
            DailyRap Arcade · Jeu vedette
          </p>
          <h1 className="font-impact text-5xl sm:text-7xl uppercase leading-none mb-3">
            Blind Test
          </h1>
          <p className="text-ink-muted text-sm sm:text-base max-w-md mb-6 leading-relaxed">
            Reconnais les sons du rap français — seul, entre potes sur le même écran, ou
            en salon à distance. Des dizaines de thèmes, un classement à grimper.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <BorderMagicButton href="/jouer?play=1" size="lg">
              <Icon icon="game-icons:play-button" width={20} />
              Jouer
            </BorderMagicButton>
            <a
              href="/blindtest/classement"
              className="inline-flex items-center gap-2 glass rounded-2xl px-6 h-16 text-sm font-semibold hover:border-gold/40 transition-colors"
            >
              <Info size={17} />
              Classement
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto space-y-10 pb-24">
        {/* Nouveaux jeux */}
        <section>
          <h2 className="font-display text-lg sm:text-xl font-semibold mb-3">Nouveaux jeux</h2>
          <div className="nf-row -mx-6 px-6">
            {NEW_GAMES.map((g) => (
              <a key={g.href} href={g.href} className="nf-card flex flex-col justify-end p-3.5" style={{ background: g.g }}>
                <Icon icon={g.icon} width={26} className="text-gold mb-1.5" />
                <p className="font-display text-base font-semibold leading-tight">{g.title}</p>
                <p className="text-[11px] text-ink-muted">{g.sub}</p>
                {g.flag && <span className="nf-flag">{g.flag}</span>}
              </a>
            ))}
          </div>
        </section>

        {/* Top façon Netflix — gros chiffres */}
        <section>
          <h2 className="font-display text-lg sm:text-xl font-semibold mb-3">
            Top des jeux aujourd&apos;hui 🇫🇷
          </h2>
          <div className="nf-row -mx-6 px-6 items-end">
            {TOP_GAMES.map((g, i) => (
              <a key={g.href + i} href={g.href} className="nf-rank-item">
                <span className="nf-rank" aria-hidden="true">{i + 1}</span>
                <span className="nf-card flex flex-col items-center justify-center gap-2 p-3 text-center" style={{ background: g.g }}>
                  <Icon icon={g.icon} width={34} className="text-gold" />
                  <span className="font-display text-sm font-semibold leading-tight">{g.title}</span>
                </span>
              </a>
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
  // Deep-links historiques (?mode=, ?room=) + nouveau ?play=1 → blind test directement.
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
