import { ArrowRight, User, Users, Globe, Tv, QrCode, Smartphone, Share2, Flame } from "lucide-react";
import DailyCard from "@/components/DailyCard";
import SavedPresets from "@/components/SavedPresets";
import SocialLinks from "@/components/SocialLinks";
import GameCover from "@/components/GameCover";
import BrandMark, { BrandTile } from "@/components/BrandMark";
import LivePlayersBadge from "@/components/LivePlayersBadge";

/*
 * Accueil v2 — construit autour d'une seule idée : on vient ici pour jouer, maintenant ou
 * samedi soir. Dans l'ordre : le défi du jour (une action), les quatre façons de jouer, les
 * soirées enregistrées (si on en a), comment marche une soirée, l'app sur l'écran d'accueil,
 * le reste de l'arcade, et la communauté.
 */

const MODES = [
  {
    href: "/jouer?mode=solo",
    label: "Solo",
    sub: "Cinq minutes, à ton rythme. Score sauvegardé si tu es connecté.",
    tag: "1 joueur",
    Icon: User,
  },
  {
    href: "/jouer?mode=local",
    label: "Entre potes",
    sub: "Un seul téléphone, un buzzer, les pseudos de tout le monde.",
    tag: "2 à 8",
    Icon: Users,
  },
  {
    href: "/jouer?mode=online",
    label: "Salon en ligne",
    sub: "Un code à partager, chacun joue depuis chez lui.",
    tag: "À distance",
    Icon: Globe,
  },
  {
    href: "/jouer?mode=party",
    label: "Soirée TV",
    sub: "L'écran partagé sur la télé, les téléphones en manette, un gage pour le dernier.",
    tag: "2 à 8 + TV",
    Icon: Tv,
    featured: true,
  },
];

export default function Home() {
  return (
    <>
      {/* Hero : la promesse en une ligne, puis directement le défi du jour. */}
      <section className="relative overflow-hidden">
        <div className="brand-glow" aria-hidden="true" />
        <div className="max-w-5xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <BrandTile size={40} />
            <div>
              <p className="font-display text-base font-semibold leading-tight">Blind test rap français</p>
              <p className="text-xs text-ink-faint">Gratuit, sans inscription · par DailyRapFrance</p>
            </div>
            <div className="ml-auto hidden sm:block">
              <LivePlayersBadge />
            </div>
          </div>

          <h1 className="poster-title text-[2.6rem] sm:text-6xl md:text-7xl max-w-3xl mb-8">
            Reconnais le son avant tes potes.
          </h1>

          <DailyCard />
        </div>
      </section>

      {/* Quatre façons de jouer */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 py-12 sm:py-16" aria-labelledby="modes-title">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 id="modes-title" className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Quatre façons de jouer
            </h2>
            <p className="text-sm text-ink-muted mt-1">Seul dans le métro ou à huit sur un canapé — même jeu, mêmes 40 thèmes.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {MODES.map((m) => (
            <a key={m.href} href={m.href} className="mode-tile min-h-[168px] sm:min-h-[196px]" data-active={m.featured ? "true" : undefined}>
              <span className="mode-wash" aria-hidden="true" />
              <span className="mode-icon">
                <m.Icon size={18} />
              </span>
              <span className="relative text-[11px] font-semibold text-gold">{m.tag}</span>
              <span className="relative font-display text-lg sm:text-xl font-bold leading-tight">{m.label}</span>
              <span className="relative text-xs text-ink-muted leading-snug">{m.sub}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Soirées enregistrées — n'apparaît que s'il y en a */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 pb-12 sm:pb-16">
        <SavedPresets />
      </section>

      {/* Comment se passe une soirée — une vraie séquence, donc numérotée */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 py-12 sm:py-16 border-t border-white/8" aria-labelledby="party-title">
        <div className="grid md:grid-cols-[1fr_1.2fr] gap-8 md:gap-14 items-center">
          <div>
            <h2 id="party-title" className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Une soirée blind test, prête en une minute
            </h2>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed mb-6">
              Branche la télé, ouvre le site, montre le code. Personne n&apos;installe rien : chacun rejoint avec
              son téléphone et répond dessus. Le dernier du classement tire un gage.
            </p>
            <a href="/jouer?mode=party" className="game-btn game-btn-primary h-12 px-6 text-sm gap-2">
              Lancer une soirée <ArrowRight size={16} />
            </a>
          </div>
          <ol className="space-y-3">
            {[
              { n: 1, Icon: Tv, t: "Ouvre la page Soirée sur la TV ou l'ordi branché", s: "Un code à 4 lettres et un QR code s'affichent en grand." },
              { n: 2, Icon: QrCode, t: "Tout le monde scanne et choisit un pseudo", s: "Les avatars apparaissent sur l'écran au fur et à mesure." },
              { n: 3, Icon: Smartphone, t: "L'extrait joue sur la TV, on répond sur son téléphone", s: "Les plus rapides marquent plus. Dix extraits, deux minutes par manche." },
              { n: 4, Icon: Flame, t: "Classement, gage, et on relance", s: "Enregistre la config pour la prochaine fois : même thème, mêmes potes, un tap." },
            ].map((step) => (
              <li key={step.n} className="card p-4 flex items-start gap-4">
                <span className="score-num text-2xl text-gold w-7 shrink-0 pt-0.5">{step.n}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{step.t}</span>
                  <span className="block text-xs text-ink-faint mt-0.5 leading-snug">{step.s}</span>
                </span>
                <step.Icon size={18} className="text-ink-faint shrink-0 ml-auto mt-0.5" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* L'app sur l'écran d'accueil */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 pb-12 sm:pb-16">
        <div className="card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <BrandTile size={72} />
          <div className="flex-1">
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">Garde-le sur ton écran d&apos;accueil</h2>
            <p className="text-sm text-ink-muted mt-1.5 leading-relaxed max-w-xl">
              Le blind test s&apos;installe comme une app, sans passer par un store : plein écran, lancement instantané, le défi
              du jour à portée de pouce. Sur iPhone : Partager → « Sur l&apos;écran d&apos;accueil ». Sur Android : « Installer l&apos;application » dans le menu.
            </p>
          </div>
          <a href="/jouer" className="inline-flex items-center gap-2 h-11 px-5 rounded-full glass text-sm font-medium hover:border-gold/40 transition-colors shrink-0">
            <Share2 size={15} className="text-gold" /> Ouvrir le jeu
          </a>
        </div>
      </section>

      {/* Le reste de l'arcade */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 py-12 sm:py-16 border-t border-white/8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">Aussi dans l&apos;arcade</h2>
          <a href="/jeux" className="text-sm text-gold hover:text-glow transition-colors inline-flex items-center gap-1">
            Tous les jeux <ArrowRight size={14} />
          </a>
        </div>
        <div className="nf-row -mx-5 px-5 sm:-mx-6 sm:px-6">
          {[
            { title: "La Tracklist", href: "/jeux/tracklist", cover: "/jeux/tracklist.png", flag: "Défi du jour" },
            { title: "Plus Haut, Plus Bas", href: "/jeux/plus-haut", cover: "/jeux/plus-haut.png", flag: null },
            { title: "Le Tribunal", href: "/jeux/tribunal", cover: "/jeux/tribunal.png", flag: "Vote du jour" },
            { title: "Coach A&R", href: "/jeux/pronos", cover: "/jeux/coach-ar.png", flag: null },
            { title: "La Punchline", href: "/jeux/punchline", cover: "/jeux/punchline.png", flag: null },
            { title: "Ghostwriter", href: "/jeux/ghostwriter", cover: "/jeux/ghostwriter.png", flag: null },
          ].map((g) => (
            <GameCover key={g.href} href={g.href} cover={g.cover} title={g.title} flag={g.flag} variant="poster" />
          ))}
        </div>
      </section>

      {/* Communauté */}
      <section className="relative overflow-hidden border-t border-white/8">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-16 sm:py-24 text-center">
          <BrandMark size={28} className="text-gold mx-auto mb-5" />
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Le rap français, raconté depuis 2020
          </h2>
          <p className="text-ink-muted text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Pas d&apos;algorithme entre vous et la scène. Des milliers de passionnés suivent DailyRapFrance
            pour l&apos;actu, les sorties et les débats — et maintenant pour se mesurer au blind test.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <SocialLinks />
          </div>
          <a href="/a-propos" className="inline-flex items-center gap-1.5 mt-6 text-sm text-gold hover:text-glow transition-colors">
            Lire notre histoire <ArrowRight size={14} />
          </a>
        </div>
      </section>
    </>
  );
}
