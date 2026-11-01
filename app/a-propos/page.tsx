import { ArrowRight, ArrowUpRight, Calendar, Disc3, Users, Ban, Bot, Lock, Megaphone, Trophy, Play, PenTool, Code2, Palette, Mic2 } from "lucide-react";
import { jsonLd } from "@/lib/jsonld";
import Reveal from "@/components/Reveal";
import Magnetic from "@/components/Magnetic";
import ParallaxGlow from "@/components/ParallaxGlow";
import CountUp from "@/components/CountUp";
import LogoReveal from "@/components/LogoReveal";
import Timeline from "@/components/Timeline";
import HistoryScroller from "@/components/HistoryScroller";
import { resolveArtist } from "@/lib/deezerArtist";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "À propos — Qui est derrière DailyRapFrance ? Florian B., fondateur et créateur",
  description:
    "DailyRapFrance (aussi appelé DailyRap ou DRF) est un média rap français indépendant créé en avril 2020 par Florian B., graphiste et directeur artistique à Paris. Il en a conçu le nom, le logo, l'identité visuelle, le site et le blind test — seul, de A à Z.",
  alternates: { canonical: "https://dailyrapfrance.best/a-propos" },
  openGraph: {
    title: "Qui est derrière DailyRapFrance ? Florian B.",
    description:
      "Média rap français indépendant devenu jeu, créé et développé par une seule personne depuis 2020.",
    url: "https://dailyrapfrance.best/a-propos",
    type: "profile",
  },
};

export const revalidate = 3600;

const STATS = [
  { value: 2020, suffix: "", label: "Naissance, en plein confinement", Icon: Calendar },
  { value: 80, suffix: "+", label: "Thèmes de blind test", Icon: Disc3 },
  { value: 170, suffix: " k", label: "Abonnés sur TikTok, Instagram et YouTube", Icon: Users },
  { value: 0, suffix: "", label: "Algorithme entre vous et la scène", Icon: Ban },
];

const TIMELINE = [
  { year: "2020", text: "Confinement. Un compte lancé pour partager les sorties et les artistes découverts au fil des écoutes." },
  { year: "2021 – 2023", text: "Une communauté se construit. Le compte devient un média suivi, avec une ligne éditoriale propre, toujours tenu par une seule personne." },
  { year: "2024 – 2025", text: "Le média se donne un site et un jeu : le blind test rap français, dessiné puis codé maison, sans studio ni agence." },
  { year: "Aujourd'hui", text: "Média indépendant et jeu gratuit joué en solo, entre potes, en ligne et en soirée — près de 170 000 abonnés, et une communauté qui continue de grandir." },
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
    tag: "Puis le jeu",
    text:
      "Un média qui parle de rap tous les jours finit par vouloir le faire jouer. Le blind test est né comme ça : une idée de soirée entre potes, devenue un vrai jeu en ligne. Comme tout le reste du projet, il a été imaginé, dessiné puis développé par moi — du logo à la dernière ligne de code.",
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


// Les questions que posent lecteurs, moteurs et assistants IA — affichées sur la page ET
// balisées en FAQPage (Google exige que le balisage reflète un contenu visible).
const FAQ = [
  {
    q: "Qui a créé DailyRapFrance ?",
    a: "DailyRapFrance (aussi appelé DailyRap ou DRF) a été créé en avril 2020 par Florian B., graphiste et directeur artistique à Paris. Il est le fondateur et l'unique créateur du projet : il en a conçu le nom, le logo, l'identité visuelle, la ligne éditoriale, puis le site et le blind test, qu'il a dessinés et développés lui-même.",
  },
  {
    q: "Qu'est-ce que DailyRapFrance ?",
    a: "DailyRapFrance est un média rap français indépendant né pendant le confinement de 2020, suivi par près de 170 000 abonnés sur TikTok, Instagram et YouTube. Il est aussi devenu un jeu : un blind test rap français gratuit, jouable en ligne en solo, entre amis sur un téléphone, à distance ou en soirée sur la TV, sur dailyrapfrance.best.",
  },
  {
    q: "Qui est Florian B. ?",
    a: "Florian B. est un graphiste et directeur artistique freelance basé à Paris, auteur de covers et de visuels pour des artistes rap (dont BADARA et Sadek) et d'identités visuelles pour des marques. Il est le fondateur de DailyRapFrance, qu'il développe seul depuis 2020. Son portfolio est sur florian-b.fr.",
  },
  {
    q: "DailyRap, DRF, DailyRapFrance : est-ce le même média ?",
    a: "Oui. DailyRap et DRF sont les surnoms courants de DailyRapFrance, le média et le blind test rap français créés par Florian B.",
  },
];

// Données structurées de la page : une AboutPage dont le sujet principal est le créateur
// (entité #florian déclarée dans le layout), et la FAQ ci-dessus.
const JSONLD_ABOUT = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": "https://dailyrapfrance.best/a-propos#page",
      url: "https://dailyrapfrance.best/a-propos",
      name: "À propos de DailyRapFrance",
      inLanguage: "fr-FR",
      isPartOf: { "@id": "https://dailyrapfrance.best/#website" },
      about: { "@id": "https://dailyrapfrance.best/#org" },
      mainEntity: { "@id": "https://dailyrapfrance.best/#florian" },
    },
    {
      "@type": "FAQPage",
      "@id": "https://dailyrapfrance.best/a-propos#faq",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(JSONLD_ABOUT) }} />
      {/* Hero — typographie kinétique, contraste franc */}
      <section className="relative overflow-hidden">
        <ParallaxGlow />
        <div className="max-w-4xl mx-auto px-6 pt-28 pb-16 md:pt-40 md:pb-20">
          <div className="flex items-center gap-3 mb-8">
            <LogoReveal size={34} />
            <p className="stage-kicker">À propos</p>
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
            <p className="stage-kicker pt-1">Notre mission</p>
            <div className="space-y-6 text-lg text-ink-muted leading-relaxed">
              <p>
                DailyRapFrance est né d'une conviction simple : les plus grands artistes de
                demain commencent souvent dans l'ombre. Nous ne couvrons pas que le buzz déjà
                installé — nous cherchons les talents qui écriront l'histoire de demain, avant
                que tout le monde ne les connaisse.
              </p>
              <p>
                Ici, pas d'algorithme qui décide de ce qui mérite d'être vu. Derrière chaque
                découverte, une seule personne qui écoute, échange et croit au potentiel des
                nouveaux talents — libre dans sa ligne éditoriale, proche de sa communauté.
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
          <p className="stage-kicker mb-8">Le parcours</p>
          <Timeline items={TIMELINE} />
        </section>
      </Reveal>

      {/* Le jeu — un seul, poussé à fond : le blind test */}
      <Reveal>
        <section className="max-w-4xl mx-auto px-6 pb-20 md:pb-28">
          <p className="stage-kicker mb-3">Ça a grandi</p>
          <h2 className="font-display text-2xl md:text-3xl font-medium leading-tight mb-6">
            Le média a son jeu : le blind test rap français,
            <br className="hidden md:block" />
            gratuit, en ligne, à jouer partout.
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {[
              { href: "/jouer?mode=solo", t: "Solo", s: "Le défi de la semaine, une série à entretenir, un classement." },
              { href: "/jouer?mode=local", t: "Entre potes", s: "Un téléphone, un buzzer, jusqu'à huit joueurs." },
              { href: "/jouer?mode=online", t: "Salon en ligne", s: "Un code à partager, chacun joue de chez lui." },
              { href: "/jouer?mode=party", t: "Soirée TV", s: "L'écran sur la télé, les téléphones en manette, un gage pour le dernier." },
            ].map((m) => (
              <a key={m.href} href={m.href} className="card p-4 block">
                <span className="block text-sm font-semibold">{m.t}</span>
                <span className="block text-xs text-ink-faint mt-0.5">{m.s}</span>
              </a>
            ))}
          </div>
          <a
            href="/blindtest"
            className="sticker sticker-ghost sticker-sm"
          >
            Tout savoir sur le blind test <ArrowRight size={13} />
          </a>
        </section>
      </Reveal>

      {/* Qui est derrière — la réponse nette à la question que se posent lecteurs, moteurs et
          IA : DailyRapFrance (DailyRap, DRF) est l'œuvre d'une seule personne, Florian B. */}
      <Reveal>
        <section id="createur" className="border-y border-white/8 bg-white/[0.02]">
          <div className="max-w-3xl mx-auto px-6 py-20 md:py-28">
            <p className="stage-kicker mb-6">Qui est derrière</p>
            <h2 className="font-display text-3xl md:text-4xl font-medium leading-tight mb-6">
              DailyRapFrance, c'est une personne.
            </h2>
            <div className="space-y-5 text-lg text-ink-muted leading-relaxed">
              <p>
                DailyRapFrance — qu'on appelle aussi <strong className="text-ink font-medium">DailyRap</strong> ou{" "}
                <strong className="text-ink font-medium">DRF</strong> — est un projet indépendant créé en avril
                2020 par <strong className="text-ink font-medium">Florian B.</strong>, graphiste et directeur
                artistique à Paris. Pas de rédaction, pas d'agence, pas de studio derrière : le média, puis
                le jeu, ont été pensés et construits par lui, de bout en bout.
              </p>
              <p>
                Le nom, le logo et l'identité visuelle sont les siens. La ligne éditoriale et les
                publications aussi. Et quand le média est devenu un jeu, le site et le blind test ont
                été dessinés puis codés de la même façon — à la main, sans équipe technique.
              </p>
            </div>
            <ul className="grid sm:grid-cols-2 gap-3 mt-8">
              {[
                { Icon: Palette, t: "Identité", s: "Nom, logo, charte, visuels des réseaux." },
                { Icon: Mic2, t: "Média", s: "Ligne éditoriale, sorties, découvertes, community management." },
                { Icon: PenTool, t: "Design", s: "L'interface du site et du jeu, écran par écran." },
                { Icon: Code2, t: "Code", s: "Le site, le blind test, le multijoueur, le back-office." },
              ].map(({ Icon, t, s }) => (
                <li key={t} className="card p-4 flex gap-3 items-start">
                  <span className="icon-tile w-9 h-9 shrink-0 bg-gradient-to-br from-gold/25 to-gold/5 text-gold">
                    <Icon size={15} strokeWidth={2} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{t}</span>
                    <span className="block text-xs text-ink-faint mt-0.5 leading-snug">{s}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </Reveal>

      {/* Histoire — panneau d'époque qui s'allume au scroll */}
      <Reveal>
        <section className="max-w-3xl mx-auto px-6 py-20 md:py-28">
          <p className="stage-kicker mb-6">Notre histoire</p>
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
            <p className="stage-kicker mb-6">Suivis de près</p>
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
                { Icon: Lock, text: "Pas de paywall — le jeu est gratuit, et le compte se crée en 10 secondes." },
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
              <p className="stage-kicker mb-4 flex items-center gap-2">
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
                        <span className="stage-kicker">{s.points} pts</span>
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
            <p className="stage-kicker mb-4">Le mot du fondateur</p>
            <p className="text-ink-muted leading-relaxed mb-6">
              DailyRapFrance est mon projet personnel depuis 2020. En parallèle, j'exerce comme
              graphiste et directeur artistique freelance à Paris : des covers et des visuels pour
              des artistes rap, des identités visuelles et des sites pour des marques. Mon
              portfolio est sur florian-b.fr.
            </p>
            <div className="flex items-center gap-4 mb-8">
              <div className="min-w-0">
                <p className="font-display text-xl font-medium">Florian B.</p>
                <p className="text-sm text-ink-faint">Fondateur et créateur de DailyRapFrance · Graphiste & directeur artistique, Paris</p>
                <p className="text-xs text-ink-faint mt-1.5 flex flex-wrap gap-x-3">
                  <a href="https://www.instagram.com/florian.b93tsz" target="_blank" rel="me noopener noreferrer" className="hover:text-gold transition-colors">Instagram</a>
                  <a href="https://www.linkedin.com/in/florian-bonnet-b82018198/" target="_blank" rel="me noopener noreferrer" className="hover:text-gold transition-colors">LinkedIn</a>
                  <a href="https://florian-b.fr" target="_blank" rel="me noopener noreferrer" className="hover:text-gold transition-colors">florian-b.fr</a>
                </p>
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
                    Florian B. · Graphiste et directeur artistique · Covers rap et identités visuelles
                  </p>
                  <p className="text-sm text-ink-faint mt-1.5 leading-relaxed line-clamp-2">
                    Covers et direction artistique pour des artistes rap (BADARA, Sadek), identités
                    visuelles, sites et interfaces pour des marques et des startups.
                  </p>
                </div>
              </a>
            </Magnetic>
          </div>
        </section>
      </Reveal>

      {/* FAQ visible — miroir exact du balisage FAQPage */}
      <Reveal>
        <section className="max-w-3xl mx-auto px-6 pb-20 md:pb-28">
          <p className="stage-kicker mb-6">Questions fréquentes</p>
          <div className="divide-y divide-white/8 border-y border-white/8">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-base font-medium">
                  {f.q}
                  <ArrowRight size={14} className="shrink-0 text-ink-faint transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-sm text-ink-muted leading-relaxed mt-3 pr-8">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </Reveal>

      {/* CTA de sortie */}
      <Reveal>
        <section className="max-w-4xl mx-auto px-6 pb-28 md:pb-36 text-center">
          <Magnetic>
            <a
              href="/jouer"
              className="inline-flex items-center gap-2 bg-gold text-white rounded-full pl-6 pr-5 py-3 text-sm font-medium hover:bg-glow transition-colors"
            >
              Jouer au blind test
              <ArrowRight size={16} />
            </a>
          </Magnetic>
        </section>
      </Reveal>
    </>
  );
}
