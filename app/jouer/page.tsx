import { Play, Flame, Users, Trophy, Settings, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDailyTheme } from "@/lib/themes";
import ShareGame from "@/components/ShareGame";
import GameTabBar from "@/components/GameTabBar";

export const metadata = {
  title: "Jouer — Blind Test Rap Français | DailyRapFrance",
  description: "Lance une partie de blind test rap français, solo, entre potes ou en salon privé en ligne.",
};

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

  return (
    <>
    <section className="max-w-2xl mx-auto px-6 pt-14 sm:pt-20 pb-32">
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Blind Test</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">
        {displayName ? `Prêt, ${displayName} ?` : "Jouer"}
      </h1>
      <p className="text-ink-muted mb-10">
        Un thème, un chrono, et ta connaissance du rap français. Solo, entre potes sur le même
        écran, ou en salon privé à distance.
      </p>

      {/* CTA principal — la seule chose qu'on a vraiment besoin de faire ici */}
      <a
        href="/blindtest"
        className="cta-glow group relative block rounded-2xl p-7 sm:p-8 mb-4 overflow-hidden bg-gradient-to-br from-[#7a0f0f] to-gold text-white"
      >
        <div className="relative flex items-center gap-5">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center group-hover:scale-105 transition-transform">
            <Play size={26} fill="currentColor" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl sm:text-2xl font-semibold">Lancer une partie</p>
            <p className="text-sm text-white/80 mt-0.5">Solo, local entre potes, ou salon en ligne</p>
          </div>
        </div>
      </a>

      {/* Défi du jour — même thème pour tout le monde aujourd'hui, change à minuit */}
      <a
        href={`/blindtest?theme=${dailyTheme.id}`}
        className="group relative block rounded-2xl p-5 mb-8 overflow-hidden border border-gold/25 hover:border-gold/50 transition-colors"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#3a0a0a] via-[#780101]/60 to-transparent opacity-80" aria-hidden="true" />
        <div className="relative flex items-center gap-4">
          <div className="icon-tile w-11 h-11 shrink-0 bg-gradient-to-br from-gold to-glow text-white">
            <Flame size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Défi du jour</p>
            <p className="text-sm font-semibold mt-0.5">{dailyTheme.label}</p>
            <p className="text-xs text-ink-faint mt-0.5">{dailyTheme.text}</p>
          </div>
        </div>
      </a>

      {/* Accès rapide aux à-côtés du jeu */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <a href="/amis" className="card card-lift p-4 flex flex-col items-center gap-2 text-center">
          <Users size={18} className="text-gold" />
          <span className="text-xs font-medium">Amis</span>
        </a>
        <a href="/blindtest/classement" className="card card-lift p-4 flex flex-col items-center gap-2 text-center">
          <Trophy size={18} className="text-gold" />
          <span className="text-xs font-medium">Classement</span>
        </a>
        <a href="/parametres" className="card card-lift p-4 flex flex-col items-center gap-2 text-center">
          <Settings size={18} className="text-gold" />
          <span className="text-xs font-medium">Mon compte</span>
        </a>
      </div>

      {!user && (
        <div className="card p-5 flex items-center gap-4 mb-10">
          <div className="w-9 h-9 shrink-0 rounded-full bg-gold/15 text-gold flex items-center justify-center">
            <LogIn size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Pas encore connecté</p>
            <p className="text-xs text-ink-faint mt-0.5">Connecte-toi pour sauvegarder tes scores et jouer avec tes amis.</p>
          </div>
        </div>
      )}

      {/* Section partage — le jeu se joue à plusieurs, et le meilleur moment pour recruter des
          potes, c'est maintenant, avant même de lancer une partie. */}
      <div className="card p-6">
        <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-2">Fais-le connaître</p>
        <p className="text-sm text-ink-muted mb-4">
          Un blind test se joue mieux à plusieurs — envoie le lien à tes potes ou partage-le en
          story avant votre prochaine soirée.
        </p>
        <ShareGame />
      </div>
    </section>
    <GameTabBar />
    </>
  );
}
