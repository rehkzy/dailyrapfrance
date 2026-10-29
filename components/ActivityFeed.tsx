"use client";

import { useEffect, useState } from "react";
import { Users, Play, Sparkles, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { THEME_OPTIONS } from "@/lib/themes";
import { weeklyNumberFor } from "@/lib/dailyStreak";
import VerifiedBadge from "@/components/VerifiedBadge";

/*
 * « Chez tes potes » — le fil social de l'accueil, visible seulement connecté : les
 * derniers scores de tes amis (avec un « Je fais mieux » qui lance le même thème) et les
 * blind tests que la communauté vient de publier. C'est ce qui donne une raison de revenir
 * sans qu'on ait rien à faire : on voit les autres jouer.
 */
type Prof = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; verified?: boolean | null };
type ScoreRow = { id: string; user_id: string; theme: string; points: number; rounds: number; created_at: string; profiles: Prof | Prof[] | null };
type CustomRow = { id: string; slug: string; title: string; track_ids: number[]; created_at: string; profiles: Prof | Prof[] | null };
type Item =
  | { kind: "score"; id: string; at: string; who: Prof | null; theme: string; points: number; rounds: number }
  | { kind: "custom"; id: string; at: string; who: Prof | null; slug: string; title: string; count: number };

function one<T>(p: T | T[] | null): T | null { return Array.isArray(p) ? p[0] ?? null : p; }
function themeLabel(raw: string) {
  if (raw === "custom") return "un blind test perso";
  if (raw.startsWith("defi:")) return `le défi de la semaine #${weeklyNumberFor(raw.slice(5))}`;
  const [a, b] = raw.includes(":") ? raw.split(":") : [null, raw];
  const label = (THEME_OPTIONS.find((t) => t.id === b)?.label ?? b).replace(/^Blind Test /i, "");
  return a === "survival" ? `${label} en Survie` : a === "sprint" ? `${label} en Sprint` : label;
}
function replayHref(raw: string) {
  if (raw === "custom") return "/creer";
  if (raw.startsWith("defi:")) return "/blindtest/defi";
  const [a, b] = raw.includes(":") ? raw.split(":") : [null, raw];
  return `/jouer?mode=solo&theme=${encodeURIComponent(b)}${a ? `&v=${a}` : ""}&autostart=1`;
}
function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
}

function Avatar({ p }: { p: Prof | null }) {
  const name = p?.display_name ?? "Joueur";
  return p?.avatar_url ? (
    <img src={p.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
  ) : (
    <span className="w-10 h-10 rounded-full text-white grid place-items-center text-sm font-extrabold shrink-0" style={{ background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{name.slice(0, 1).toUpperCase()}</span>
  );
}

export default function ActivityFeed() {
  const { user, loading } = useUser();
  const [items, setItems] = useState<Item[] | null>(null);
  const [friendCount, setFriendCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    (async () => {
      const { data: fr } = await supabase.from("friendships").select("requester_id,addressee_id").eq("status", "accepted").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const ids = Array.from(new Set((fr ?? []).map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id))));
      setFriendCount(ids.length);
      const [scores, customs] = await Promise.all([
        ids.length
          ? supabase.from("blindtest_scores").select("id,user_id,theme,points,rounds,created_at,profiles(id,username,display_name,avatar_url,verified)").in("user_id", ids).not("theme", "like", "jeu-%").order("created_at", { ascending: false }).limit(8)
          : Promise.resolve({ data: [] as ScoreRow[] }),
        supabase.from("custom_blindtests").select("id,slug,title,track_ids,created_at,profiles(id,username,display_name,avatar_url,verified)").eq("is_public", true).neq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
      ]);
      const list: Item[] = [
        ...(((scores.data ?? []) as unknown as ScoreRow[]).map((s) => ({ kind: "score" as const, id: `s${s.id}`, at: s.created_at, who: one(s.profiles), theme: s.theme, points: s.points, rounds: s.rounds }))),
        ...(((customs.data ?? []) as unknown as CustomRow[]).map((c) => ({ kind: "custom" as const, id: `c${c.id}`, at: c.created_at, who: one(c.profiles), slug: c.slug, title: c.title, count: c.track_ids.length }))),
      ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
      setItems(list);
    })().catch(() => setItems([]));
  }, [user]);

  if (loading || !user) return null;

  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-6 pt-2 pb-4" aria-labelledby="feed-title">
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="feed-title" className="font-display text-xl sm:text-2xl font-bold">Chez tes potes</h2>
        <a href="/amis" className="text-xs font-semibold text-glow inline-flex items-center gap-1">{friendCount} ami{friendCount > 1 ? "s" : ""} <ChevronRight size={12} /></a>
      </div>

      {items === null ? (
        <div className="ticket p-5 text-sm text-ink-faint">Chargement…</div>
      ) : items.length === 0 ? (
        <a href="/amis" className="ticket p-5 flex items-center gap-4">
          <span className="w-11 h-11 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0"><Users size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Ajoute des potes pour voir leurs scores ici.</span>
            <span className="block text-xs text-ink-faint">Cherche-les par pseudo, ou envoie-leur ton lien de profil.</span>
          </span>
          <ChevronRight size={16} className="text-ink-faint shrink-0" />
        </a>
      ) : (
        <div className="ticket divide-y divide-white/6">
          {items.map((it) => {
            const who = it.who;
            const name = who?.display_name ?? "Un joueur";
            const profileHref = who?.username ? `/profil/${who.username}` : undefined;
            return (
              <div key={it.id} className="flex items-center gap-3 px-4 py-3">
                {profileHref ? <a href={profileHref} className="shrink-0"><Avatar p={who} /></a> : <Avatar p={who} />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <a href={profileHref ?? "#"} className="font-semibold inline-flex items-center gap-1">{name}{who?.verified && <VerifiedBadge size={13} />}</a>{" "}
                    {it.kind === "score" ? (
                      <>a fait <span className="font-semibold text-glow">{it.points} pts</span> sur {themeLabel(it.theme)}</>
                    ) : (
                      <>a publié <span className="font-semibold">« {it.title} »</span> · {it.count} titres</>
                    )}
                  </p>
                  <p className="text-[11px] text-ink-faint">{ago(it.at)}</p>
                </div>
                {it.kind === "score" ? (
                  <a href={replayHref(it.theme)} className="sticker sticker-ghost sticker-sm shrink-0 !h-9 !px-3 text-xs whitespace-nowrap">Je fais mieux</a>
                ) : (
                  <a href={`/b/${it.slug}`} className="sticker sticker-sm shrink-0 !h-9 !px-3 text-xs"><Play size={12} fill="currentColor" /> Jouer</a>
                )}
              </div>
            );
          })}
          <a href="/blindtests" className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-ink-muted hover:text-ink"><Sparkles size={13} className="text-gold" /> Tous les blind tests de la communauté <ChevronRight size={12} className="ml-auto" /></a>
        </div>
      )}
    </section>
  );
}
