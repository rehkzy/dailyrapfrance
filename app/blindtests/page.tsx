import VerifiedBadge from "@/components/VerifiedBadge";
import type { Metadata } from "next";
import { Play, Sparkles, Users } from "lucide-react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/server";
import BackToGame from "@/components/BackToGame";
import GameTabBar from "@/components/GameTabBar";

export const metadata: Metadata = {
  title: "Blind tests de la communauté — créés par les joueurs | DailyRapFrance",
  description: "Les blind tests créés par les joueurs et rendus publics : anniversaires, soirées, spécial artiste… Joue-les gratuitement, ou crée le tien.",
  alternates: { canonical: "https://dailyrapfrance.best/blindtests" },
};
export const revalidate = 60;

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_blindtests")
    .select("id, slug, title, description, track_ids, plays, featured, created_at, profiles(username, display_name, verified)")
    .eq("is_public", true)
    .order("featured", { ascending: false })
    .order("plays", { ascending: false })
    .limit(60);
  const items = data ?? [];
  return (
    <>
      <section className="max-w-2xl mx-auto px-6 pt-16 pb-32">
        <BackToGame />
        <p className="stage-kicker mb-2 inline-flex items-center gap-1.5"><Users size={13} /> Communauté</p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-2">Les blind tests des joueurs</h1>
        <p className="text-ink-muted mb-6">Créés avec le constructeur et rendus publics. Chacun se joue en solo ou entre potes.</p>
        <a href="/creer" className="sticker h-12 px-6 mb-8"><Sparkles size={16} /> Créer mon blind test</a>
        {items.length === 0 ? (
          <div className="card p-10 text-center text-ink-muted text-sm">Aucun blind test public pour l&apos;instant — le tien peut être le premier.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2.5">
            {items.map((it) => {
              const p = Array.isArray(it.profiles) ? it.profiles[0] : it.profiles;
              return (
                <a key={it.id} href={`/b/${it.slug}`} className="ticket p-4 flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0"><Icon icon="game-icons:music-spell" width={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{it.featured && <span className="text-gold mr-1" title="Sélection DailyRap">★</span>}{it.title}</span>
                    {it.description && <span className="block text-xs text-ink-muted truncate">{it.description}</span>}
                    <span className="block text-xs text-ink-faint truncate">{it.track_ids.length} titres · par {p?.display_name ?? p?.username ?? "un joueur"}{p?.verified && <VerifiedBadge size={12} className="ml-1" />} · {it.plays} partie{it.plays > 1 ? "s" : ""}</span>
                  </span>
                  <Play size={16} className="text-gold shrink-0" fill="currentColor" />
                </a>
              );
            })}
          </div>
        )}
      </section>
      <GameTabBar />
    </>
  );
}
