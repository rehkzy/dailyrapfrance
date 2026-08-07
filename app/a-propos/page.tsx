import { ArrowRight, ArrowUpRight, Calendar, Disc3, Share2, Ban, Bot, Lock, Megaphone, Trophy, Play } from "lucide-react";
import Reveal from "@/components/Reveal";
import Magnetic from "@/components/Magnetic";
import ParallaxGlow from "@/components/ParallaxGlow";
import CountUp from "@/components/CountUp";
import LogoReveal from "@/components/LogoReveal";
import Timeline from "@/components/Timeline";
import HistoryScroller from "@/components/HistoryScroller";
import GameCover from "@/components/GameCover";
import { resolveArtist } from "@/lib/deezerArtist";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "À propos — DailyRapFrance",
  description:
    "Plus qu'un média, une passion. L'histoire de DailyRapFrance et de son fondateur, Florian B.",
};

export const revalidate = 3600;

const STATS = [
  { value: 2020, suffix: "", label: "Naissance, en plein confinement", Icon: Calendar },
  { value: 15, suffix: "+", label: "Thèmes de blind test", Icon: Disc3 },
  { value: 3, suffix: "", label: "Réseaux où nous suivre", Icon: Share2 },
  { value: 0, suffix: "", label: "Algorithme entre vous et la scène", Icon: Ban },
];

const TIMELINE = [
  { year: "2020", text: "Confinement. Un compte lancé pour partager les sorties et les artistes découverts au fil des écoutes." },
  { year: "2021 – 2023", text: "Une communauté se construit. Le compte devient un média suivi, avec une ligne éditoriale propre." },
  { year: "Aujourd'hui", text: "Média indépendant, une arcade de jeux rap français qui s'agrandit (blind test, tracklist, pronos...), et une communauté qui continue de grandir." },
];

const HISTORY_ERAS = [
  {
    tag: "2020 — Le déclic",
    text:
      "Graphiste de métier et passionné de rap français depuis toujours, j'ai lancé DailyRapFrance pendant le confinement, sans imaginer ce que le projet allait devenir — un simple compte pour partager les sorties et les artistes que je découvrais au fil de mes écoutes.",
  },
  {
    tag: "Ce qui n'a pas changé",
    text:
      "Rester proche de la scène, prendre le temps d'écouter les projets, et donner leur chance aux artistes émergents. Beaucoup de ceux que nous avons mis en avant à leurs débuts — parfois encore totalement indépendants — sont aujourd'hui des références du rap français. Les voir remplir des salles est une fierté qui ne s'use pas.",
  },
  {
    tag: "Aujourd'hui",
    text:
      "Un média indépendant, humain et accessible, qui parle de rap avec passion, sans artifices et sans compromis.",
    strong: true,
  },
];

// Artistes régulièrement mis en avant — mêmes noms que les thèmes du blind test, portraits
// récupérés en direct depuis Deezer (même mécanisme de résolution que le jeu, donc les mêmes
// garanties : pas de portrait d'homonyme).
const FEATURED_ARTISTS = ["pnl", "booba", "jul", "sch", "ninho", "nekfeu", "badara"];

// L'arcade — le blind test n'est plus le seul jeu, et d'autres arrivent. Covers officielles,
// même composant que le hub /jouer et la page profil. Seuls Blind Test et Artists Manager
// 2026 sont jouables pour l'instant ; le reste est encore en préparation.
const ARCADE_PREVIEW = [
  { title: "Artists Manager 2026", href: "/jeux/artists-manager", cover: "/jeux/artists-manager.png", flag: "Nouveau" },
  { title: "Blind Test", href: "/jouer?play=1", cover: "/jeux/blind-test.png", flag: null },
  { title: "La Tracklist", href: "/jeux/bientot?titre=La%20Tracklist", cover: "/jeux/tracklist.png", flag: "Bientôt" },
  { title: "Plus Haut, Plus Bas", href: "/jeux/bientot?titre=Plus%20Haut%2C%20Plus%20Bas", cover: "/jeux/plus-haut.png", flag: "Bientôt" },
  { title: "Le Tribunal", href: "/jeux/bientot?titre=Le%20Tribunal", cover: "/jeux/tribunal.png", flag: "Bientôt" },
  { title: "Coach A&R", href: "/jeux/bientot?titre=Coach%20A%26R", cover: "/jeux/coach-ar.png", flag: "Bientôt" },
];

export default async function AProposPage() {
  const [artists, supabase] = await Promise.all([
    Promise.all(FEATURED_ARTISTS.map((name) => resolveArtist(name))),
    createClient(),
  ]);
  const artistPhotos = artists.filter((a): a is NonNullable<typeof a> => !!a?.picture_medium);

  const { data: topScores } = await supabase
    .from("blindtest_scores")
    .select("id, points, theme, profiles(username, display_name, avatar_url)")
    .order("points", { ascending: false })
    .limit(3);

  return (
    <>
      {/* Hero — typographie kinétique, contraste franc */}
      <section className="relative overflow-hidden">
        <ParallaxGlow />
        <div className="max-w-4xl mx-auto px-6 pt-28 pb-16 md:pt-40 md:pb-20">
          <div className="flex items-center gap-3 mb-8">
            <LogoReveal size={34} />
            <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase">À propos</p>
          </div>
          <h1 className="font-display font-semibold tracking-tight leading-[0.98]">
            <span className="block text-[11vw] md:text-[5vw] lg:text-6xl text-ink-muted">Plus qu'un média,</span>
            <span className="block text-[13vw] md:text-[6.5vw] lg:text-7xl text-ink">une passion.</span>
          </h1>
        </div>
      </section>

      {/* Chiffres clés */}
      <Reveal>
        <section className="max-w-4xl mx-auto px-6 pb-16 md:pb-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {STATS.map(({ value, suffix, label, Icon }) => (
              <div
                key={label}
                className="card card-lift relative overflow-hidden p-5 md:p-6 bg-gradient-to-b from-white/[0.04] to-transparent"
              >
                <div className="icon-tile w-9 h-9 mb-4 bg-gradient-to-br from-gold/25 to-gold/5 text-gold">
                  <Icon size={16} strokeWidth={2} />
                </div>
                <p className="font-display text-4xl md:text-5xl font-semibold text-gold tabular-nums leading-none">
                  <CountUp to={value} suffix={suffix} />
                </p>
                <p className="text-xs text-ink-muted mt-3 leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Mission */}
      <Reveal>
        <section className="max-w-3xl mx-auto px-6 pb-20 md:pb-28">
          <div className="grid md:grid-cols-[1fr_2fr] gap-4 md:gap-10">
            <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase pt-1">Notre mission</p>
            <div className="space-y-6 text-lg text-ink-muted leading-relaxed">
              <p>
                DailyRapFrance est né d'une conviction simple : les plus grands artistes de
                demain commencent souvent dans l'ombre. Nous ne couvrons pas que le buzz déjà
                installé — nous cherchons les talents qui écriront l'histoire de demain, avant
                que tout le monde ne les connaisse.
              </p>
              <p>
                Ici, pas d'algorithme qui décide de ce qui mérite d'être vu. Derrière chaque
                découverte, une équipe qui écoute, échange et croit au potentiel des nouveaux
                talents — libre dans sa ligne éditoriale, proche de sa communauté.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Citation */}
      <Reveal>
        <section className="border-y border-white/8">
          <div className="max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
            <p className="font-display text-3xl md:text-5xl font-medium leading-[1.15] tracking-tight">
              Les plus belles carrières commencent souvent bien avant les premières
              certifications. <span className="text-gold">Nous aimons être là dès le premier chapitre.</span>
            </p>
          </div>
        </section>
      </Reveal>

      {/* Frise — les grandes étapes, en un coup d'œil avant le récit détaillé */}
      <Reveal>
        <section className="max-w-2xl mx-auto px-6 py-20 md:py-28">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-8">Le parcours</p>
          <Timeline items={TIMELINE} />
        </section>
      </Reveal>

      {/* L'arcade — le blind test n'est plus seul, et d'autres jeux arrivent */}
      <Reveal>
        <section className="max-w-4xl mx-auto px-6 pb-20 md:pb-28">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-3">Ça a grandi</p>
          <h2 className="font-display text-2xl md:text-3xl font-medium leading-tight mb-6">
            Le blind test n'est plus seul — une arcade complète,
            <br className="hidden md:block" />
            et d'autres jeux arrivent.
          </h2>
          <div className="nf-row -mx-6 px-6 mb-4">
            {ARCADE_PREVIEW.map((g) => (
              <GameCover key={g.href} href={g.href} cover={g.cover} title={g.title} flag={g.flag} variant="poster" />
            ))}
          </div>
          <a
            href="/jouer"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-gold hover:text-glow transition-colors"
          >
            Voir tous les jeux <ArrowRight size={13} />
          </a>
        </section>
      </Reveal>

      {/* Histoire — panneau d'époque qui s'allume au scroll */}
      <Reveal>
        <section className="max-w-3xl mx-auto px-6 py-20 md:py-28">
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-6">Notre histoire</p>
          <h2 className="font-display text-3xl md:text-4xl font-medium leading-tight mb-10">
            2020 — un compte, une passion,
            <br />
            <span className="text-ink-faint">et une communauté qui a suivi.</span>
          </h2>
          <HistoryScroller eras={HISTORY_ERAS} />
        </section>
      </Reveal>

      {/* Artistes régulièrement mis en avant — portraits réels, résolus en direct */}
      {artistPhotos.length > 0 && (
        <Reveal>
          <section className="max-w-4xl mx-auto px-6 pb-20 md:pb-28">
            <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-6">Suivis de près</p>
            <div className="flex flex-wrap gap-4">
              {artistPhotos.map((a) => (
                <div key={a.id} className="group flex flex-col items-center gap-2 w-16">
                  <img
                    src={a.picture_medium}
                    alt={a.name}
                    className="w-16 h-16 rounded-full object-cover border border-white/10 grayscale group-hover:grayscale-0 transition-all duration-300"
                  />
                  <span className="text-[10px] text-ink-faint text-center truncate w-full">{a.name}</span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* Ce qu'on ne fait pas — position éditoriale, en négatif */}
      <Reveal>
        <section className="border-y border-white/8 bg-white/[0.02]">
          <div className="max-w-3xl mx-auto px-6 py-16 md:py-20">
            <p className="font-mono text-xs text-riseNeg tracking-[0.2em] uppercase mb-8">Ce qu'on ne fait pas</p>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { Icon: Bot, text: "Pas d'algorithme qui décide à notre place de ce qui mérite d'être vu." },
                { Icon: Megaphone, text: "Pas de contenu sponsorisé déguisé en découverte." },
                { Icon: Lock, text: "Pas de paywall — nos jeux sont gratuits, sans inscription forcée." },
              ].map(({ Icon, text }) => (
                <div key={text} className="flex flex-col gap-3">
                  <Icon size={20} className="text-riseNeg" strokeWidth={1.8} />
                  <p className="text-sm text-ink-muted leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* Le jeu est vivant — mini classement en direct + lien vers le Top 50 */}
      <Reveal>
        <section className="max-w-3xl mx-auto px-6 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-6">
              <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
                <Trophy size={13} />
                En ce moment
              </p>
              {!topScores || topScores.length === 0 ? (
                <p className="text-sm text-ink-faint">Personne n'a encore de score enregistré.</p>
              ) : (
                <div className="space-y-3">
                  {topScores.map((s, i) => {
                    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="font-mono text-xs text-ink-faint w-4">{i + 1}</span>
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px]">
                            {(profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm flex-1 truncate">{profile?.display_name ?? "Joueur"}</span>
                        <span className="font-mono text-xs text-gold">{s.points} pts</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <a href="/blindtest/classement" className="inline-block text-xs text-gold hover:text-glow mt-5 transition-colors">
                Voir le classement complet →
              </a>
            </div>

            <a
              href="/blindtest?theme=pop"
              className="group card card-lift p-6 flex flex-col justify-between bg-gradient-to-br from-[#3a0a0a] to-transparent"
            >
              <div className="icon-tile w-10 h-10 bg-gradient-to-br from-gold to-glow text-white mb-4">
                <Play size={16} fill="currentColor" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold group-hover:text-gold transition-colors">
                  Jouer le Top 50 du moment
                </p>
                <p className="text-xs text-ink-faint mt-1.5">Les sons les plus populaires, en blind test.</p>
              </div>
            </a>
          </div>
        </section>
      </Reveal>

      {/* Signature — le fondateur, avec un vrai crédit vers son travail perso. La carte reprend
          les infos officielles de florian-b.fr (image, titre, description) façon aperçu de
          lien déplié sur les réseaux, plutôt qu'un simple bouton texte vers un site externe. */}
      <Reveal>
        <section className="max-w-3xl mx-auto px-6 pb-24 md:pb-32">
          <div className="card p-8 md:p-10">
            <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Le mot du fondateur</p>
            <p className="text-ink-muted leading-relaxed mb-6">
              En parallèle de DailyRapFrance, j'exerce également en tant que graphiste et
              directeur artistique freelance. Si vous souhaitez découvrir mon univers et mes
              autres projets, vous pouvez visiter mon portfolio.
            </p>
            <div className="flex items-center gap-4 mb-8">
              <div className="min-w-0">
                <p className="font-display text-xl font-medium">Florian B.</p>
                <p className="text-sm text-ink-faint">Fondateur de DailyRapFrance · Graphiste & directeur artistique</p>
              </div>
            </div>

            <Magnetic strength={0.08} className="block">
              <a
                href="https://florian-b.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-2xl overflow-hidden border border-white/10 hover:border-gold/40 transition-colors"
              >
                <div className="relative aspect-[2400/1129] overflow-hidden bg-surface">
                  <img
                    src="https://florian-b.fr/hero-photo-flo.webp"
                    alt="Florian B. — Graphiste & Directeur Artistique"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-[11px] font-mono text-white/90">
                    florian-b.fr
                    <ArrowUpRight size={12} />
                  </span>
                </div>
                <div className="p-5 bg-white/[0.02]">
                  <p className="font-display text-base font-semibold group-hover:text-gold transition-colors">
                    Florian B. | Graphiste &amp; Directeur Artistique freelance à Paris
                  </p>
                  <p className="text-sm text-ink-faint mt-1.5 leading-relaxed line-clamp-2">
                    Branding, UI/UX Design, communication digitale et print — dont les covers de
                    BADARA (Nouvelle École, Netflix).
                  </p>
                </div>
              </a>
            </Magnetic>
          </div>
        </section>
      </Reveal>

      {/* CTA de sortie — générique (l'arcade complète), plus seulement le blind test */}
      <Reveal>
        <section className="max-w-4xl mx-auto px-6 pb-28 md:pb-36 text-center">
          <Magnetic>
            <a
              href="/jouer"
              className="inline-flex items-center gap-2 bg-gold text-white rounded-full pl-6 pr-5 py-3 text-sm font-medium hover:bg-glow transition-colors"
            >
              Découvrir l'arcade
              <ArrowRight size={16} />
            </a>
          </Magnetic>
        </section>
      </Reveal>
    </>
  );
}
