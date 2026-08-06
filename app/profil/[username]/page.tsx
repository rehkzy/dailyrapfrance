import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AddFriendButton from "@/components/AddFriendButton";
import FriendPlayButtons from "@/components/FriendPlayButtons";
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
      {/*
        Correctif audit mobile : avatar + nom + boutons étaient tous forcés sur UNE seule
        ligne (`flex items-center`), quelle que soit la largeur d'écran. Sur mobile, ça
        écrasait le pseudo en `truncate` (illisible, coupé à 2-3 caractères) et compressait
        les deux boutons dans une colonne étroite collée à droite ("boutons étriqués").
        Empilé verticalement en dessous de `sm:`, redevient une ligne horizontale à partir
        de `sm:` (tablette/desktop) où la largeur ne manque plus.
      */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-10">
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-white/10 shrink-0" />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold/20 text-gold flex items-center justify-center text-2xl font-medium shrink-0">
              {(profile.display_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold truncate">{profile.display_name ?? "Joueur"}</h1>
            {profile.username && <p className="text-ink-faint text-sm truncate">@{profile.username}</p>}
            <p className="flex items-center gap-1.5 text-xs text-ink-faint mt-1.5">
              <Calendar size={12} />
              Membre depuis {memberSince}
            </p>
          </div>
        </div>
        {/* Boutons pleine largeur et empilés sur mobile (au lieu d'une colonne étroite à
            droite) — reprend une largeur naturelle et s'aligne à droite à partir de sm:. */}
        <div className="flex flex-col gap-2.5 w-full sm:w-auto sm:items-end sm:shrink-0 [&>*]:w-full sm:[&>*]:w-auto">
          <AddFriendButton targetId={profile.id} />
          <FriendPlayButtons friendName={profile.display_name ?? profile.username ?? "Toi"} />
        </div>
      </div>

      <StatsBlock games={scores ?? []} />
    </section>
    <GameTabBar />
    </>
  );
}
