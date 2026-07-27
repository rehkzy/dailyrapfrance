import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AddFriendButton from "@/components/AddFriendButton";
import StatsBlock from "@/components/StatsBlock";
import BackToGame from "@/components/BackToGame";
import GameTabBar from "@/components/GameTabBar";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${username} — Profil DailyRapFrance` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,created_at")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const { data: scores } = await supabase
    .from("blindtest_scores")
    .select("theme,rounds,points,created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const memberSince = new Date(profile.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <>
    <section className="max-w-2xl mx-auto px-6 pt-16 pb-32">
      <BackToGame />
      <div className="flex items-center gap-5 mb-10">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border border-white/10 shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gold/20 text-gold flex items-center justify-center text-2xl font-medium shrink-0">
            {(profile.display_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold truncate">{profile.display_name ?? "Joueur"}</h1>
          {profile.username && <p className="text-ink-faint text-sm">@{profile.username}</p>}
          <p className="flex items-center gap-1.5 text-xs text-ink-faint mt-1.5">
            <Calendar size={12} />
            Membre depuis {memberSince}
          </p>
        </div>
        <AddFriendButton targetId={profile.id} />
      </div>

      <StatsBlock games={scores ?? []} />
    </section>
    <GameTabBar />
    </>
  );
}
