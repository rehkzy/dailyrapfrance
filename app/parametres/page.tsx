import { LogIn, User as UserIcon, ChevronLeft } from "lucide-react";
import BackToGame from "@/components/BackToGame";
import { createClient } from "@/lib/supabase/server";
import AccountSettingsForm from "@/components/AccountSettingsForm";
import VerificationRequest from "@/components/VerificationRequest";
import PushToggle from "@/components/PushToggle";
import DeleteAccount from "@/components/DeleteAccount";
import AccountSecurity from "@/components/AccountSecurity";
import HelpLinks from "@/components/HelpLinks";
import SignInCta from "@/components/SignInCta";
import ShareProfileCard from "@/components/ShareProfileCard";
import { loadProfileBundle } from "@/lib/profileData";

export const metadata = { title: "Mon compte — DailyRapFrance" };

/*
 * Mon compte = personnaliser son profil (bannière, photo, pseudo, bio, badges mis en avant)
 * et suivre ses succès. Les statistiques et la vitrine, c'est la page profil.
 */
export default async function ParametresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="max-w-2xl mx-auto px-6 pt-16 pb-24">
        <BackToGame fallback="/profil" />
        <div className="max-w-sm mx-auto ticket p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto mb-4"><LogIn size={20} /></div>
          <p className="font-display text-xl font-bold mb-2">Connecte-toi</p>
          <p className="text-sm text-ink-muted mb-6">Un compte pour ton profil, tes scores, tes badges et tes blind tests.</p>
          <SignInCta />
          <p className="text-[11px] text-ink-faint mt-3">Gratuit, en 10 secondes.</p>
        </div>
      </section>
    );
  }

  const [{ data: profile }, bundle] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name,avatar_url,banner,bio,showcase,verified,verification_requested_at").eq("id", user.id).maybeSingle(),
    loadProfileBundle(supabase, user.id),
  ]);
  const displayName = profile?.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Joueur";
  const allBadges = [...bundle.badges.game, ...bundle.badges.fans];

  return (
    <section className="max-w-2xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-32">
      <div className="flex items-center justify-between mb-5">
        <a href={profile?.username ? `/profil/${profile.username}` : "/profil"} className="back-link">
          <ChevronLeft size={16} /> Mon profil
        </a>
        {profile?.username && (
          <a href={`/profil/${profile.username}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink min-h-[40px]">
            <UserIcon size={14} /> Voir comme les autres
          </a>
        )}
      </div>
      <p className="stage-kicker mb-2">Réglages</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-2">Ton compte, de A à Z.</h1>
      <p className="text-ink-muted mb-8">Profil, connexion, notifications, aide. Chaque bloc s&apos;enregistre seul.</p>

      <h2 className="stage-kicker mb-2.5">Profil</h2>
      <AccountSettingsForm
        userId={user.id}
        username={profile?.username ?? null}
        initialDisplayName={displayName}
        initialAvatarUrl={profile?.avatar_url ?? null}
        initialBanner={profile?.banner ?? null}
        initialBio={profile?.bio ?? null}
        initialShowcase={profile?.showcase ?? []}
        badges={allBadges}
      />
      {profile?.username && <div className="mt-4"><ShareProfileCard username={profile.username} /></div>}
      <div className="mt-4">
        <VerificationRequest userId={user.id} verified={!!profile?.verified} requestedAt={profile?.verification_requested_at ?? null} />
      </div>

      <h2 className="stage-kicker mt-10 mb-2.5">Compte et connexion</h2>
      <AccountSecurity email={user.email ?? null} providers={(user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider ?? "email"]} />

      <h2 className="stage-kicker mt-10 mb-2.5">Notifications</h2>
      <PushToggle />

      <h2 className="stage-kicker mt-10 mb-2.5">Aide et contact</h2>
      <HelpLinks username={profile?.username ?? null} />

      <h2 className="stage-kicker mt-10 mb-2.5">Zone sensible</h2>
      <DeleteAccount />
    </section>
  );
}
