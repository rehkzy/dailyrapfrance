import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AccountSettingsForm from "@/components/AccountSettingsForm";
import StatsBlock from "@/components/StatsBlock";
import BackToGame from "@/components/BackToGame";
import GameTabBar from "@/components/GameTabBar";
import SignInCta from "@/components/SignInCta";
import ShareProfileCard from "@/components/ShareProfileCard";
import ArtistPassport from "@/components/ArtistPassport";

export const metadata = { title: "Mon compte — DailyRapFrance" };

export default async function ParametresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
      <section className="max-w-2xl mx-auto px-6 pt-16 pb-24">
        <BackToGame />
        <div className="max-w-sm mx-auto card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto mb-4">
            <LogIn size={20} />
          </div>
          <p className="font-display text-xl font-medium mb-2">Connecte-toi</p>
          <p className="text-sm text-ink-muted mb-6">
            Il te faut un compte pour gérer ton profil et voir tes statistiques.
          </p>
          <SignInCta />
          <p className="text-[11px] text-ink-faint mt-3">Gratuit, en 10 secondes — tes scores sont sauvegardés.</p>
        </div>
      </section>
      <GameTabBar />
      </>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: scores } = await supabase
    .from("blindtest_scores")
    .select("theme,rounds,points,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const displayName = profile?.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Joueur";

  return (
    <>
    <section className="max-w-2xl mx-auto px-6 pt-16 pb-32">
      <BackToGame />
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Blind Test</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Mon compte</h1>
      <p className="text-ink-muted mb-10">Ton pseudo, ta photo, et tes statistiques de jeu.</p>

      {profile?.username && <ShareProfileCard username={profile.username} />}

      <div className="card p-5 mb-8">
        <ArtistPassport userId={user.id} />
      </div>

      <AccountSettingsForm
        userId={user.id}
        initialDisplayName={displayName}
        initialAvatarUrl={profile?.avatar_url ?? null}
        username={profile?.username ?? null}
      />

      {profile?.username && (
        <a
          href={`/profil/${profile.username}`}
          className="inline-flex items-center gap-2 text-sm text-gold hover:text-glow transition-colors mb-8"
        >
          Voir mon profil public →
        </a>
      )}

      <StatsBlock games={scores ?? []} />
    </section>
    <GameTabBar />
    </>
  );
}
