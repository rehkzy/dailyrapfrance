import { Gamepad2 } from "lucide-react";
import Reveal from "@/components/Reveal";
import ParallaxGlow from "@/components/ParallaxGlow";

export const metadata = { title: "Jeux — DailyRapFrance" };

/*
 * Hub des jeux — même vocabulaire visuel que la home (vignettes .game-thumb avec
 * badges), une carte par jeu. Le blind test garde la première place.
 */
const GAMES = [
  {
    href: "/jouer",
    title: "Blind Test",
    text: "Reconnais les sons, seul ou entre potes.",
    emoji: "🎧",
    badge: "Top",
    badgeClass: "thumb-badge-top",
    gradient: "radial-gradient(120% 110% at 80% 0%, rgba(240,0,28,0.5), transparent 55%), linear-gradient(160deg, #2a0509 0%, #0a0707 100%)",
  },
  {
    href: "/jeux/tracklist",
    title: "Le Tracklist",
    text: "Un morceau mystère par jour. 6 essais, des indices, un score à partager.",
    emoji: "🗓️",
    badge: "Nouveau",
    badgeClass: "thumb-badge-new",
    gradient: "radial-gradient(120% 110% at 20% 0%, rgba(120,1,1,0.7), transparent 60%), linear-gradient(200deg, #1c090c 0%, #0a0707 100%)",
  },
  {
    href: "/jeux/plus-haut",
    title: "Plus Haut, Plus Bas",
    text: "Quel morceau a le plus de streams ? Enchaîne la plus longue série.",
    emoji: "📈",
    badge: "Nouveau",
    badgeClass: "thumb-badge-new",
    gradient: "radial-gradient(130% 110% at 50% 110%, rgba(255,59,78,0.35), transparent 60%), linear-gradient(160deg, #170a0c 0%, #0a0707 100%)",
  },
  {
    href: "/jeux/tribunal",
    title: "Le Tribunal",
    text: "Un duel par jour. La communauté tranche.",
    emoji: "⚖️",
    badge: "Hot",
    badgeClass: "thumb-badge-hot",
    gradient: "radial-gradient(120% 110% at 80% 100%, rgba(240,0,28,0.4), transparent 60%), linear-gradient(190deg, #12060a 0%, #0a0707 100%)",
  },
  {
    href: "/jeux/pronos",
    title: "Coach A&R",
    text: "Pronostique les morceaux qui resteront dans le top la semaine prochaine.",
    emoji: "🔮",
    badge: "Nouveau",
    badgeClass: "thumb-badge-new",
    gradient: "radial-gradient(120% 110% at 10% 100%, rgba(120,1,1,0.6), transparent 60%), linear-gradient(160deg, #1a070b 0%, #0a0707 100%)",
  },
  {
    href: "/jeux/punchline",
    title: "La Punchline",
    text: "Qui a lâché cette phrase ? À toi de trancher.",
    emoji: "🎤",
    badge: "Nouveau",
    badgeClass: "thumb-badge-new",
    gradient: "radial-gradient(130% 110% at 90% 10%, rgba(255,107,59,0.3), transparent 55%), linear-gradient(170deg, #200a0d 0%, #0a0707 100%)",
  },
  {
    href: "/jeux/ghostwriter",
    title: "Ghostwriter",
    text: "Une IA imite un rappeur. Démasque qui elle copie.",
    emoji: "👻",
    badge: "Hot",
    badgeClass: "thumb-badge-hot",
    gradient: "radial-gradient(120% 110% at 50% 0%, rgba(240,0,28,0.35), transparent 55%), linear-gradient(180deg, #150a10 0%, #0a0707 100%)",
  },
];

export default function JeuxPage() {
  return (
    <section className="relative max-w-5xl mx-auto px-6 pt-14 pb-24">
      <ParallaxGlow />
      <Reveal>
        <div className="mb-10">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-3 flex items-center gap-2">
            <Gamepad2 size={14} /> L&apos;arcade
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold">Tous les jeux</h1>
          <p className="text-ink-muted text-sm sm:text-base mt-2 max-w-lg">
            Teste ta culture rap français sous toutes ses formes — un nouveau défi chaque jour.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES.map((g) => (
            <a key={g.href} href={g.href} className="game-thumb min-h-[180px] p-5 flex flex-col justify-end">
              <span className="thumb-bg" style={{ background: g.gradient }} aria-hidden="true" />
              <span className={`thumb-badge ${g.badgeClass}`}>{g.badge}</span>
              <span className="text-3xl mb-2" aria-hidden="true">{g.emoji}</span>
              <h2 className="font-display text-xl font-semibold mb-1">{g.title}</h2>
              <p className="text-xs text-ink-muted leading-relaxed">{g.text}</p>
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
