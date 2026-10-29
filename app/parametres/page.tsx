import { LogIn, User as UserIcon, ChevronRight, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AccountSettingsForm from "@/components/AccountSettingsForm";
import BackToGame from "@/components/BackToGame";
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
        <BackToGame />
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
    supabase.from("profiles").select("id,username,display_name,avatar_url,banner,bio,showcase").eq("id", user.id).maybeSingle(),
    loadProfileBundle(supabase, user.id),
  ]);
  const displayName = profile?.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Joueur";
  const allBadges = [...bundle.badges.game, ...bundle.badges.fans];
  const unlockedCount = allBadges.filter((b) => b.unlocked).length;

  return (
    <section className="max-w-2xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-32">
      <BackToGame />
      <p className="stage-kicker mb-2">Mon compte</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-2">Personnalise ton profil.</h1>
      <p className="text-ink-muted mb-6">Bannière, photo, pseudo, bio, et les badges que tu veux montrer.</p>

      {profile?.username && (
        <a href={`/profil/${profile.username}`} className="action-row mb-5" data-primary="true">
          <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0 bg-white/15 text-white"><UserIcon size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Voir mon profil public</span>
            <span className="block text-xs text-white/80">Tel que les autres le voient.</span>
          </span>
          <ChevronRight size={18} className="shrink-0" />
        </a>
      )}

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

      {/* Tous les succès, avec la progression */}
      <div className="ticket mt-4">
        <div className="p-5 flex items-baseline justify-between">
          <p className="font-display text-lg font-bold inline-flex items-center gap-1.5"><Trophy size={16} className="text-gold" /> Succès</p>
          <span className="text-xs text-ink-faint">{unlockedCount} / {allBadges.length}</span>
        </div>
        <ul className="divide-y divide-white/6">
          {[...bundle.badges.game, ...bundle.badges.fans].map((b) => (
            <li key={b.id} className={`flex items-center gap-3 px-5 py-3 ${b.unlocked ? "" : "opacity-70"}`}>
              <span className={`w-10 h-10 rounded-xl grid place-items-center text-xl shrink-0 ${b.unlocked ? "bg-gold/15" : "bg-white/5 grayscale"}`}>{b.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{b.label}</span>
                <span className="block text-xs text-ink-faint truncate">{b.unlocked ? b.desc : b.hint ?? b.desc}</span>
                {!b.unlocked && <span className="block h-1 mt-1.5 rounded-full bg-white/6 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${Math.round(b.progress * 100)}%`, background: "linear-gradient(90deg,#780101,#f0001c)" }} /></span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {profile?.username && <div className="mt-4"><ShareProfileCard username={profile.username} /></div>}
    </section>
  );
}
