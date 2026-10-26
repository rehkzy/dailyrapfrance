import { ArrowRight, User, Users, Globe, Tv, QrCode, Smartphone, Flame, Timer, Skull, Shuffle, Trophy, Clapperboard } from "lucide-react";
import DailyCard from "@/components/DailyCard";
import SavedPresets from "@/components/SavedPresets";
import SocialLinks from "@/components/SocialLinks";
import { BrandTile } from "@/components/BrandMark";
import LivePlayersBadge from "@/components/LivePlayersBadge";
import { AppStoreCallout } from "@/components/AppComingSoon";
import { THEME_OPTIONS } from "@/lib/themes";
import { themeSlug } from "@/lib/seo";

/*
 * Accueil v2 — construit autour d'une seule idée : on vient ici pour jouer, maintenant ou
 * samedi soir. Dans l'ordre : le défi de la semaine (une action), les quatre façons de jouer, les
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
    href: "/jouer?mode=clips",
    label: "Devine le clip",
    sub: "Swipe, regarde, réponds. Clips officiels, lancés après l'intro.",
    tag: "Nouveau · vidéo",
    Icon: Clapperboard,
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

const POPULAR_THEME_LINKS = THEME_OPTIONS.filter((t) => t.id !== "mix")
  .slice(0, 24)
  .map((t) => ({ href: `/blindtest/${themeSlug(t)}`, t: t.label }));

export default function Home() {
  return (
    <>
      {/* Hero : la promesse en une ligne, puis directement le défi de la semaine. */}
      <section className="relative overflow-hidden">
        <div className="brand-glow" aria-hidden="true" />
        <div className="max-w-5xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <BrandTile size={40} />
            <div>
              <p className="font-display text-base font-semibold leading-tight">Blind test rap français</p>
              <p className="text-xs text-ink-faint">Gratuit, compte en 10 secondes · par DailyRapFrance</p>
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

      {/* Cinq façons de jouer */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 py-12 sm:py-16" aria-labelledby="modes-title">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 id="modes-title" className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Cinq façons de jouer
            </h2>
            <p className="text-sm text-ink-muted mt-1">Seul dans le métro ou à huit sur un canapé — même jeu, mêmes 80 thèmes.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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

      {/* Variantes — des façons de rejouer quand on connaît déjà le jeu */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 pb-12 sm:pb-16" aria-labelledby="defis-title">
        <h2 id="defis-title" className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-1">Envie d&apos;autre chose ?</h2>
        <p className="text-sm text-ink-muted mb-4">Mêmes extraits, règles différentes. Chaque variante a son propre classement.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/jouer?mode=solo&v=survival&theme=mix", Icon: Skull, t: "Survie", s: "Un son raté et c'est fini. Jusqu'où tu vas ?" },
            { href: "/jouer?mode=solo&v=sprint&theme=pop", Icon: Timer, t: "Sprint", s: "20 extraits, 8 secondes chacun. Que de l'instinct." },
            { href: "/jouer?mode=solo&theme=random&autostart=1", Icon: Shuffle, t: "Thème surprise", s: "Un thème tiré au sort, lancé direct." },
            { href: "/blindtest/classement", Icon: Trophy, t: "Classement", s: "Les meilleurs scores par thème et par variante." },
          ].map((d) => (
            <a key={d.href} href={d.href} className="card p-4 flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0">
                <d.Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{d.t}</span>
                <span className="block text-xs text-ink-faint mt-0.5 leading-snug">{d.s}</span>
              </span>
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

      {/* L'app : bientôt sur les stores, déjà sur l'écran d'accueil */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 pb-12 sm:pb-16" aria-label="Installer l'app">
        <AppStoreCallout />
      </section>

      {/* Texte de référence + maillage (SEO/GEO) — présent dans le HTML, replié par défaut */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 py-6 border-t border-white/8">
        <details className="group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-semibold text-ink-muted hover:text-ink min-h-[44px]">
            À propos du blind test rap français — thèmes, modes, accès
            <ArrowRight size={14} className="text-ink-faint shrink-0 transition-transform group-open:rotate-90" />
          </summary>
          <div className="pt-4 grid md:grid-cols-[1.1fr_1fr] gap-8">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight mb-2">Le blind test rap français gratuit, en ligne, inscription en 10 secondes</h2>
              <p className="text-sm text-ink-muted leading-relaxed mb-3">
                DailyRapFrance propose le blind test rap français le plus complet : plus de quarante thèmes — les années 90, 2000,
                2010 et les sons du moment, la drill, la trap, le cloud rap, le boom bap, les scènes du 93, du 91, de Marseille ou de Lyon,
                et des blind tests dédiés à un seul artiste. Il se joue dans le navigateur, sans rien télécharger, en France comme en
                Belgique, en Suisse ou au Québec.
              </p>
              <p className="text-sm text-ink-muted leading-relaxed">
                Seul pour le classement et le défi de la semaine, entre amis sur un téléphone, à distance avec un code, en soirée sur la TV
                avec des gages, ou en devinant le clip : même jeu, mêmes extraits Deezer renouvelés à chaque partie.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {[
                  { href: "/blindtest/solo", t: "Blind test solo" },
                  { href: "/blindtest/entre-amis", t: "Entre amis" },
                  { href: "/blindtest/en-ligne", t: "En ligne à distance" },
                  { href: "/blindtest/soiree", t: "Jeu de soirée" },
                  { href: "/jouer?mode=clips", t: "Devine le clip" },
                ].map((x) => (
                  <a key={x.href} href={x.href} className="rounded-full glass px-3.5 py-1.5 text-xs font-medium hover:border-gold/40 transition-colors">
                    {x.t}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3">Thèmes populaires</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_THEME_LINKS.map((x) => (
                  <a key={x.href} href={x.href} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:border-gold/40 transition-colors">
                    {x.t}
                  </a>
                ))}
                <a href="/blindtest" className="rounded-full px-3 py-1.5 text-xs text-gold hover:text-glow">Tous les thèmes →</a>
              </div>
            </div>
          </div>
        </details>
      </section>

      {/* Communauté */}
      <section className="relative overflow-hidden border-t border-white/8">
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-16 sm:py-24 text-center">
          <BrandTile size={56} className="mx-auto mb-5" />
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
