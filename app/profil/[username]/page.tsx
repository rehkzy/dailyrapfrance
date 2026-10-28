import { notFound } from "next/navigation";
import { Calendar, Play, Flame, Trophy, Gamepad2, TrendingUp, Sparkles, Settings, Users, ChevronRight, Swords } from "lucide-react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/server";
import AddFriendButton from "@/components/AddFriendButton";
import FriendPlayButtons from "@/components/FriendPlayButtons";
import ReferralCard from "@/components/ReferralCard";
import BackToGame from "@/components/BackToGame";
import GameTabBar from "@/components/GameTabBar";
import { THEME_OPTIONS, getDailyTheme } from "@/lib/themes";
import { weekKey, weeklyNumber, weeklyNumberFor } from "@/lib/dailyStreak";
import { computeStats, type ScoreRow } from "@/lib/gameStats";
import { configToSearch, DEFAULT_CONFIG } from "@/lib/presets";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${username} — Profil DailyRapFrance` };
}

/*
 * Profil (v3) — une page qui donne envie de rejouer :
 *  1. qui c'est (avatar, pseudo, depuis quand) ;
 *  2. UNE action principale : jouer le défi de la semaine (soi-même) / défier (un autre) ;
 *  3. ses chiffres, ses points forts, ses dernières parties ;
 *  4. ses blind tests publics ;
 *  5. pour soi : parrainage et raccourcis (créer, réglages).
 * Les anciens jeux de l'arcade (scores "jeu-*") ne sont plus affichés.
 */
function themeLabel(raw: string): string {
  if (raw === "custom") return "Blind test perso";
  if (raw.startsWith("defi:")) return `Défi de la semaine #${weeklyNumberFor(raw.slice(5))}`;
  const [a, b] = raw.includes(":") ? raw.split(":") : [null, raw];
  const label = THEME_OPTIONS.find((t) => t.id === b)?.label ?? b;
  const variant = a === "survival" ? "Survie" : a === "sprint" ? "Sprint" : null;
  return variant ? `${variant} · ${label}` : label;
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const [{ data: profile }, { data: { user: viewer } }] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name,avatar_url,created_at").eq("username", username).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!profile) notFound();
  const isMe = viewer?.id === profile.id;

  const [{ data: scoresRaw }, { data: customs }, { count: friendsCount }] = await Promise.all([
    supabase.from("blindtest_scores").select("theme,rounds,points,created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(300),
    supabase.from("custom_blindtests").select("id, slug, title, track_ids, plays, is_public").eq("user_id", profile.id).order("plays", { ascending: false }).limit(6),
    supabase.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted").or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`),
  ]);
  const scores = ((scoresRaw ?? []) as ScoreRow[]).filter((s) => !s.theme.startsWith("jeu-"));
  const { gamesPlayed, bestScore, avgScore, skills } = computeStats(scores);
  const maxAvg = Math.max(1, ...skills.map((s) => s.avg));

  const daily = getDailyTheme();
  const week = weekKey();
  const weekScores = scores.filter((s) => s.theme === `defi:${week}`);
  const weekBest = weekScores.reduce((m, s) => Math.max(m, s.points), 0);
  const dailyHref = `/jouer?${configToSearch({ ...DEFAULT_CONFIG, theme: daily.id }, { daily: "1", autostart: "1" })}`;
  const memberSince = new Date(profile.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const name = profile.display_name ?? "Joueur";
  const visibleCustoms = (customs ?? []).filter((c) => c.is_public || isMe);

  return (
    <>
      <section className="max-w-2xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-32">
        <BackToGame />

        {/* 1. Identité */}
        <div className="ticket p-5 sm:p-6 mb-4">
          <div className="flex items-center gap-4 min-w-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white/15 shrink-0" />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold text-white flex items-center justify-center text-2xl font-extrabold shrink-0" style={{ background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{name.slice(0, 1).toUpperCase()}</div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight truncate">{name}</h1>
              {profile.username && <p className="text-ink-faint text-sm truncate">@{profile.username}{isMe && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-gold">c&apos;est toi</span>}</p>}
              <p className="flex items-center gap-3 text-xs text-ink-faint mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1"><Calendar size={11} /> depuis {memberSince}</span>
                <span className="inline-flex items-center gap-1"><Users size={11} /> {friendsCount ?? 0} ami{(friendsCount ?? 0) > 1 ? "s" : ""}</span>
              </p>
            </div>
            {isMe && <a href="/parametres" aria-label="Réglages du compte" className="w-10 h-10 rounded-full bg-white/6 grid place-items-center text-ink-muted hover:text-ink shrink-0"><Settings size={17} /></a>}
          </div>
          {!isMe && (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <AddFriendButton targetId={profile.id} />
              <FriendPlayButtons friendName={name} />
            </div>
          )}
        </div>

        {/* 2. L'action principale : le défi de la semaine */}
        <a href={dailyHref} className="action-row mb-4" data-primary="true">
          <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0 bg-white/15 text-white"><Flame size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Défi de la semaine #{weeklyNumber()} — {daily.label.replace(/^Blind Test /i, "")}</span>
            <span className="block text-xs text-white/80">
              {isMe
                ? weekScores.length ? `Ton meilleur score : ${weekBest} pts · ${weekScores.length} tentative${weekScores.length > 1 ? "s" : ""} — rejoue pour faire mieux` : "Pas encore joué cette semaine — lance-toi"
                : weekScores.length ? `${name} : ${weekBest} pts — tu fais mieux ?` : `${name} n'a pas encore joué — prends de l'avance`}
            </span>
          </span>
          <Play size={18} className="shrink-0" fill="currentColor" />
        </a>

        {/* 3. Chiffres */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { Icon: Gamepad2, v: gamesPlayed, l: "Parties" },
            { Icon: Trophy, v: bestScore, l: "Record" },
            { Icon: TrendingUp, v: avgScore, l: "Moyenne" },
          ].map((s) => (
            <div key={s.l} className="ticket p-4 text-center">
              <s.Icon size={15} className="text-gold mx-auto mb-1.5" />
              <p className="score-num text-2xl">{s.v}</p>
              <p className="text-[11px] text-ink-faint mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>

        {gamesPlayed === 0 && (
          <div className="ticket p-6 text-center mb-4">
            <p className="font-display text-xl font-bold mb-1">{isMe ? "Aucune partie enregistrée." : `${name} n'a pas encore de score.`}</p>
            <p className="text-sm text-ink-muted mb-4">{isMe ? "Une partie solo connectée suffit pour apparaître ici et dans le classement." : "Défie-le sur le défi de la semaine pour lancer les hostilités."}</p>
            <a href={isMe ? "/jouer?mode=solo" : dailyHref} className="sticker h-12 px-6"><Play size={16} fill="currentColor" /> {isMe ? "Jouer une partie" : "Jouer le défi"}</a>
          </div>
        )}

        {/* Points forts */}
        {skills.length > 0 && (
          <div className="ticket p-5 mb-4">
            <p className="stage-kicker mb-3">{isMe ? "Tes points forts" : "Ses points forts"}</p>
            <div className="space-y-3">
              {skills.slice(0, 4).map((s) => (
                <a key={s.theme} href={`/jouer?mode=solo&theme=${encodeURIComponent(s.theme.includes(":") ? s.theme.split(":")[1] : s.theme)}`} className="block">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold truncate">{themeLabel(s.theme)}</span>
                    <span className="font-mono text-xs text-ink-faint shrink-0">{s.avg} pts · {s.count} parties</span>
                  </div>
                  <div className="h-1.5 bg-white/6 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(8, (s.avg / maxAvg) * 100)}%`, background: "linear-gradient(90deg,#780101,#f0001c)" }} /></div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 4. Ses blind tests */}
        {(visibleCustoms.length > 0 || isMe) && (
          <div className="ticket mb-4">
            <div className="p-5 flex items-center justify-between gap-3">
              <p className="stage-kicker">{isMe ? "Mes blind tests" : "Ses blind tests"}</p>
              {isMe && <a href="/creer" className="text-xs font-semibold text-glow inline-flex items-center gap-1"><Sparkles size={12} /> Créer <ChevronRight size={12} /></a>}
            </div>
            {visibleCustoms.length === 0 ? (
              <div className="px-5 pb-5 text-sm text-ink-faint">Aucun pour l&apos;instant. Crée-en un avec tes morceaux et partage le lien à tes potes.</div>
            ) : (
              <ul className="divide-y divide-white/6">
                {visibleCustoms.map((c) => (
                  <li key={c.id}>
                    <a href={`/b/${c.slug}`} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-10 h-10 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0"><Icon icon="game-icons:music-spell" width={18} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold truncate">{c.title}</span>
                        <span className="block text-xs text-ink-faint">{c.track_ids.length} titres · {c.plays} partie{c.plays > 1 ? "s" : ""}{!c.is_public ? " · privé" : ""}</span>
                      </span>
                      <Play size={15} className="text-gold shrink-0" fill="currentColor" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Dernières parties */}
        {scores.length > 0 && (
          <div className="ticket mb-4">
            <p className="stage-kicker p-5 pb-3">Dernières parties</p>
            <ul className="divide-y divide-white/6">
              {scores.slice(0, 8).map((s, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{themeLabel(s.theme)}</span>
                    <span className="block text-xs text-ink-faint">{new Date(s.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {s.rounds} manches</span>
                  </span>
                  <span className="score-num text-lg text-gold">{s.points} <span className="text-xs text-ink-faint">pts</span></span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 5. Pour soi : parrainage */}
        {isMe && <div className="mt-6"><ReferralCard compact /></div>}
        {!isMe && viewer && (
          <a href={dailyHref} className="sticker w-full h-14 mt-2"><Swords size={18} /> Défier {name} sur le défi</a>
        )}
      </section>
      <GameTabBar />
    </>
  );
}
