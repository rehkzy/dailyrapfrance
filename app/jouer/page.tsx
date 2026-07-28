import { Play, Flame, Users, Trophy, ArrowRight, Cast, Wifi, Disc3, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDailyTheme, THEME_OPTIONS } from "@/lib/themes";
import ShareGame from "@/components/ShareGame";
import GameTabBar from "@/components/GameTabBar";
import JoinRoomInput from "@/components/JoinRoomInput";

export const metadata = {
  title: "Jouer au Blind Test Rap Français — Gratuit & Multijoueur | DailyRapFrance",
  description:
    "Lance une partie de blind test rap français en 10 secondes : défi du jour, mode solo, entre potes sur le même écran ou en salon privé en ligne. Gratuit, sans téléchargement.",
  alternates: { canonical: "https://dailyrapfrance.best/jouer" },
  openGraph: {
    title: "Jouer au Blind Test Rap Français — DailyRapFrance",
    description: "Défi du jour, mode solo, entre potes ou salon privé. Gratuit, sans téléchargement.",
    url: "https://dailyrapfrance.best/jouer",
    type: "website",
    locale: "fr_FR",
  },
};

// Données structurées — déclare le jeu comme VideoGame/WebApplication auprès de Google :
// éligible aux résultats enrichis et ancre le site sur "blind test rap français".
const JSONLD_GAME = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "Blind Test Rap Français — DailyRapFrance",
  url: "https://dailyrapfrance.best/jouer",
  description:
    "Blind test rap français en ligne et gratuit : reconnais le titre, l'artiste et le featuring avant la fin du chrono. Défi du jour, mode solo, multijoueur local et salons privés en ligne.",
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  gamePlatform: ["Web browser", "Mobile"],
  genre: ["Music", "Quiz", "Trivia"],
  inLanguage: "fr-FR",
  playMode: ["SinglePlayer", "MultiPlayer", "CoOp"],
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  publisher: { "@id": "https://dailyrapfrance.best/#org" },
};

// Compte à rebours jusqu'à minuit — rendu côté serveur en cellules de verre statiques,
// hydraté côté client par DailyCountdown (composant léger, pas de dépendance).
import DailyCountdown from "@/components/DailyCountdown";

// Quatre thèmes mis en avant en Quick Play, avec chacun sa teinte
const QUICK = [
  { id: "2000s", from: "#F0001C", to: "#FF3B7A" },
  { id: "recent", from: "#7C2CFF", to: "#FF3B7A" },
  { id: "90s", from: "#FF6A00", to: "#F0001C" },
  { id: "cloud", from: "#2C7CFF", to: "#7C2CFF" },
];

export default async function JouerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    displayName = profile?.display_name ?? null;
  }

  const dailyTheme = getDailyTheme();
  const initial = (displayName ?? "?").charAt(0).toUpperCase();
  const quickThemes = QUICK.map((q) => ({ ...q, theme: THEME_OPTIONS.find((t) => t.id === q.id) })).filter((q) => q.theme);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD_GAME) }} />
      <section className="aurora">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-36 lg:pb-16">
          {/* En-tête d'app — salut + avatar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <a
                href={user ? "/parametres" : "/blindtest"}
                aria-label="Mon compte"
                className="press w-11 h-11 rounded-full bg-gradient-to-br from-[#FF3B7A] to-[#7C2CFF] ring-2 ring-white/20 flex items-center justify-center f-game text-xs text-white"
              >
                {user ? initial : <Disc3 size={19} />}
              </a>
              <div className="min-w-0 leading-tight">
                <p className="text-xs text-ink-muted">Prêt à jouer ?</p>
                <p className="font-semibold truncate">{displayName ? `Salut, ${displayName}` : "Salut"}</p>
              </div>
            </div>
            <a href="/blindtest/classement" className="press glass rounded-full px-4 py-2.5 text-xs font-semibold text-ink flex items-center gap-2">
              <Trophy size={14} className="text-[#FFC53D]" /> Classement
            </a>
          </div>

          {/* Titre */}
          <h1 className="f-game text-3xl sm:text-5xl font-bold leading-[1.08] mb-8">
            <span className="shimmer-text">Blind Test</span>
            <br />
            Rap Français
          </h1>

          {/* Bento hero — Solo/Défi + Entre potes */}
          <div className="grid lg:grid-cols-[1.45fr_1fr] gap-4 mb-10">
            {/* Carte Solo / Défi du jour */}
            <div className="relative rounded-[28px] overflow-hidden glass p-6 sm:p-8 flex flex-col min-h-[320px]">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(90% 80% at 85% 0%, rgba(240,0,28,0.4), transparent 55%), radial-gradient(70% 60% at 0% 100%, rgba(124,44,255,0.2), transparent 60%)",
                }}
                aria-hidden="true"
              />
              <div className="vinyl-disc float-soft absolute -right-14 -top-14 w-56 h-56 sm:w-72 sm:h-72 opacity-90" aria-hidden="true" />
              <div className="relative">
                <span className="tag-pill" style={{ background: "#ff3b7a1f", color: "#FF3B7A", border: "1px solid #ff3b7a40" }}>
                  <Flame size={11} /> Défi du jour · {dailyTheme.label}
                </span>
                <h2 className="f-game text-xl sm:text-2xl mt-4 mb-1">Mode Solo</h2>
                <p className="text-sm text-ink-muted max-w-[280px]">Même thème pour tout le monde aujourd'hui. Il expire dans :</p>
                <div className="mt-4">
                  <DailyCountdown />
                </div>
              </div>
              <div className="relative mt-auto pt-6 flex flex-col sm:flex-row gap-3">
                <a href="/blindtest" className="press btn-primary flex-1 flex items-center justify-center gap-2.5 rounded-2xl py-4 font-bold text-[15px] text-white">
                  <Play size={18} fill="currentColor" /> Lancer une partie
                  <ArrowRight size={17} className="opacity-80" />
                </a>
                <a
                  href={`/blindtest?theme=${dailyTheme.id}`}
                  className="press glass flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-semibold text-sm text-ink hover:bg-white/10"
                >
                  <Flame size={16} className="text-[#FF3B7A]" /> Relever le défi
                </a>
              </div>
            </div>

            {/* Colonne Entre potes */}
            <div className="flex flex-col gap-4">
              <a href="/blindtest?mode=local" className="press lift relative glass rounded-[28px] p-6 flex-1 overflow-hidden block">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(80% 70% at 100% 100%, rgba(124,44,255,0.3), transparent 60%)" }}
                  aria-hidden="true"
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <span className="tag-pill" style={{ background: "#b08cff1f", color: "#B08CFF", border: "1px solid #b08cff40" }}>
                      <Cast size={11} /> Entre potes
                    </span>
                    <h3 className="f-game text-lg mt-3 mb-1">Même écran</h3>
                    <p className="text-xs text-ink-muted">Un seul appareil, on se le passe.</p>
                  </div>
                  <span className="w-11 h-11 shrink-0 rounded-full glass flex items-center justify-center text-ink">
                    <ArrowRight size={17} />
                  </span>
                </div>
              </a>

              <div className="glass rounded-[28px] p-6 flex-1">
                <span className="tag-pill" style={{ background: "#b08cff1f", color: "#B08CFF", border: "1px solid #b08cff40" }}>
                  <Wifi size={11} /> Salon privé
                </span>
                <p className="text-xs text-ink-muted mt-3 mb-3">Entre un code pour rejoindre — ou crée ton salon.</p>
                <JoinRoomInput />
              </div>
            </div>
          </div>

          {/* Quick Play */}
          <div className="mb-10">
            <div className="flex items-end justify-between mb-4">
              <h3 className="f-game text-base">Quick Play</h3>
              <a href="/blindtest" className="text-xs text-ink-muted hover:text-ink flex items-center gap-1">
                Tous les thèmes <ArrowRight size={12} />
              </a>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {quickThemes.map(({ id, from, to, theme }) => {
                const Icon = theme!.Icon;
                return (
                  <a
                    key={id}
                    href={`/blindtest?theme=${id}`}
                    className="press lift group relative text-left rounded-3xl p-5 h-40 flex flex-col justify-end overflow-hidden border border-white/10"
                    style={{ background: `linear-gradient(155deg, ${from}33, #140a0e 65%)` }}
                  >
                    <span
                      className="absolute -top-5 -right-5 w-24 h-24 rounded-full opacity-50 group-hover:opacity-80 transition-opacity blur-2xl"
                      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                      aria-hidden="true"
                    />
                    <span className="absolute top-4 right-4 w-10 h-10 rounded-2xl glass flex items-center justify-center text-ink">
                      <Icon size={17} />
                    </span>
                    <p className="relative font-bold text-[15px] leading-tight">{theme!.label}</p>
                    <p className="relative text-[11px] text-ink-muted mt-0.5 line-clamp-1">{theme!.text}</p>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Social + connexion + partage */}
          <div className="grid md:grid-cols-2 gap-4">
            <a href="/amis" className="press lift glass rounded-[28px] p-6 block">
              <div className="flex items-center justify-between mb-2">
                <h3 className="f-game text-sm">Amis</h3>
                <span className="w-9 h-9 rounded-full bg-gold/12 text-gold flex items-center justify-center">
                  <Users size={15} />
                </span>
              </div>
              <p className="text-xs text-ink-muted">Retrouve tes potes, défie-les sur ton meilleur thème.</p>
            </a>

            {user ? (
              <a href="/blindtest/classement" className="press lift glass rounded-[28px] p-6 block">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="f-game text-sm">Top du jour</h3>
                  <Trophy size={15} className="text-[#FFC53D]" />
                </div>
                <p className="text-xs text-ink-muted">Vois qui domine le défi du jour — et prends ta place.</p>
              </a>
            ) : (
              <a href="/blindtest" className="press lift glass rounded-[28px] p-6 block">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="f-game text-sm">Pas encore connecté</h3>
                  <span className="w-9 h-9 rounded-full bg-gold/12 text-gold flex items-center justify-center">
                    <LogIn size={15} />
                  </span>
                </div>
                <p className="text-xs text-ink-muted">Connecte-toi pour sauvegarder tes scores et jouer avec tes amis.</p>
              </a>
            )}
          </div>

          {/* Partage */}
          <div className="glass rounded-[28px] p-6 mt-4">
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-2">Fais-le connaître</p>
            <p className="text-sm text-ink-muted mb-4">
              Un blind test se joue mieux à plusieurs — envoie le lien à tes potes avant votre prochaine soirée.
            </p>
            <ShareGame />
          </div>
        </div>
      </section>
      <GameTabBar />
    </>
  );
}
