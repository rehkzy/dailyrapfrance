import { notFound } from "next/navigation";
import { Calendar, Play, Flame, Sparkles, Settings, ChevronRight, Swords, Trophy } from "lucide-react";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/server";
import AddFriendButton from "@/components/AddFriendButton";
import FriendPlayButtons from "@/components/FriendPlayButtons";
import ReferralCard from "@/components/ReferralCard";
import GameTabBar from "@/components/GameTabBar";
import { THEME_OPTIONS, getDailyTheme } from "@/lib/themes";
import { weekKey, weeklyNumber, weeklyNumberFor } from "@/lib/dailyStreak";
import { computeStats } from "@/lib/gameStats";
import { loadProfileBundle } from "@/lib/profileData";
import { bannerStyle } from "@/lib/badges";
import VerifiedBadge from "@/components/VerifiedBadge";
import ShareProfileCard from "@/components/ShareProfileCard";
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
    supabase.from("profiles").select("id,username,display_name,avatar_url,created_at,banner,bio,showcase,verified").eq("username", username).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!profile) notFound();
  const isMe = viewer?.id === profile.id;

  const bundle = await loadProfileBundle(supabase, profile.id);
  const { scores, customs, friends: friendsCount, badges } = bundle;
  const allBadges = [...badges.game, ...badges.fans];
  const showcase = ((profile.showcase ?? []) as string[]).map((id) => allBadges.find((b) => b.id === id)).filter((b): b is NonNullable<typeof b> => !!b && b.unlocked);
  const unlockedGame = badges.game.filter((b) => b.unlocked);
  const nextGame = badges.game.filter((b) => !b.unlocked).sort((a, b) => b.progress - a.progress).slice(0, 2);
  const fanBadges = badges.fans.slice(0, 6);
  const { gamesPlayed, bestScore, skills } = computeStats(scores);
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

        {/* 1. Identité : bannière, avatar, bio, badges mis en avant */}
        <div className="ticket overflow-hidden mb-4">
          <div className="h-28 sm:h-40 relative" style={bannerStyle(profile.banner)}>
            {badges.bestFanOf.length > 0 && (
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 border border-white/15 backdrop-blur px-3 py-1.5 text-xs font-bold text-white">👑 Meilleur fan de {badges.bestFanOf.slice(0, 2).join(" et ")}</span>
            )}
            {isMe && (
              <a href="/parametres" aria-label="Réglages du profil" className="absolute right-3 top-3 w-10 h-10 rounded-full bg-black/55 border border-white/15 backdrop-blur grid place-items-center text-white hover:bg-black/70">
                <Settings size={18} />
              </a>
            )}
          </div>
          <div className="relative z-10 px-5 sm:px-6 pb-5 sm:pb-6">
          {/* Ligne avatar + chiffres (le schéma Instagram : la photo déborde sur la bannière, les
              compteurs à sa droite, le nom en dessous — rien ne se superpose au texte) */}
          <div className="flex items-end gap-4 -mt-10 sm:-mt-12">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-[#0f0809] shrink-0" />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full text-white flex items-center justify-center text-2xl font-extrabold shrink-0 border-4 border-[#0f0809]" style={{ background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{name.slice(0, 1).toUpperCase()}</div>
            )}
            <div className="flex-1 grid grid-cols-3 gap-1 pb-1 pt-12 sm:pt-14">
              {[
                { v: gamesPlayed, l: "Parties", href: undefined as string | undefined },
                { v: bestScore, l: "Record", href: undefined as string | undefined },
                { v: friendsCount ?? 0, l: (friendsCount ?? 0) > 1 ? "Amis" : "Ami", href: isMe ? "/amis" : undefined },
              ].map((c) => {
                const inner = <><span className="block font-display text-xl sm:text-2xl font-extrabold leading-none">{c.v}</span><span className="block text-[11px] text-ink-faint mt-1">{c.l}</span></>;
                return c.href ? <a key={c.l} href={c.href} className="text-center rounded-xl hover:bg-white/5 py-1">{inner}</a> : <span key={c.l} className="text-center py-1">{inner}</span>;
              })}
            </div>
          </div>
          <div className="mt-3 min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight flex items-center gap-1.5 min-w-0">
              <span className="truncate">{name}</span>
              {profile.verified && <VerifiedBadge size={20} />}
            </h1>
            <p className="text-ink-faint text-sm truncate">{profile.username && <>@{profile.username} · </>}<span className="inline-flex items-center gap-1"><Calendar size={11} /> depuis {memberSince}</span></p>
          </div>
          {profile.bio && <p className="text-sm text-ink-muted mt-3">{profile.bio}</p>}
          {showcase.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {showcase.map((b) => <span key={b.id} className="inline-flex items-center gap-1 rounded-full bg-gold/15 border border-gold/40 px-2.5 py-1 text-xs font-semibold">{b.emoji} {b.label}</span>)}
            </div>
          )}
          {isMe && (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <a href="/parametres" className="sticker sticker-ghost h-11 text-[13px] whitespace-nowrap !px-3">Modifier le profil</a>
              <a href="#partager" className="sticker sticker-ghost h-11 text-[13px] whitespace-nowrap !px-3">Partager le profil</a>
            </div>
          )}
          {!isMe && (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <AddFriendButton targetId={profile.id} />
              <FriendPlayButtons friendName={name} />
            </div>
          )}
          </div>
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
        <a href={isMe ? "/blindtest/classement" : "/blindtest/defi"} className="action-row mb-4">
          <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0 bg-gold/15 text-gold"><Trophy size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{isMe ? "Classement général" : "Classement du défi"}</span>
            <span className="block text-xs text-ink-faint">{isMe ? `Ton record : ${bestScore} pts — où tu te places.` : `Compare-toi à ${name} cette semaine.`}</span>
          </span>
          <ChevronRight size={16} className="text-ink-faint shrink-0" />
        </a>


        {/* Fan de… : les badges d'artiste, le vrai sujet de fierté */}
        {fanBadges.length > 0 && (
          <div className="ticket p-5 mb-4">
            <div className="flex items-baseline justify-between mb-3">
              <p className="stage-kicker">{isMe ? "Tes artistes" : "Ses artistes"}</p>
              <span className="text-[11px] text-ink-faint">3 parties = Fan · 10 = Grand fan · 25 = Ultra · meilleur score du site = 👑</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {fanBadges.map((b) => (
                <a key={b.id} href={`/jouer?mode=solo&theme=${encodeURIComponent(b.id.slice(4))}`} className={`rounded-xl p-3 border ${b.unlocked ? "bg-gold/10 border-gold/35" : "bg-white/[0.04] border-white/8"}`}>
                  <span className="text-2xl">{b.emoji}</span>
                  <span className="block text-sm font-bold leading-tight mt-1 truncate">{b.label}</span>
                  <span className="block text-[11px] text-ink-faint mt-0.5 truncate">{b.unlocked ? b.desc : b.hint}</span>
                  {!b.unlocked || b.progress < 1 ? <span className="block h-1 mt-2 rounded-full bg-white/8 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${Math.round(b.progress * 100)}%`, background: "linear-gradient(90deg,#780101,#f0001c)" }} /></span> : null}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Succès débloqués + les 2 prochains (à portée) */}
        {(unlockedGame.length > 0 || isMe) && (
          <div className="ticket p-5 mb-4">
            <div className="flex items-baseline justify-between mb-3">
              <p className="stage-kicker">Succès</p>
              <span className="text-[11px] text-ink-faint">{unlockedGame.length} / {badges.game.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {unlockedGame.map((b) => <span key={b.id} title={b.desc} className="inline-flex items-center gap-1.5 rounded-full bg-white/8 border border-white/10 px-3 py-1.5 text-xs font-semibold">{b.emoji} {b.label}</span>)}
              {unlockedGame.length === 0 && <span className="text-sm text-ink-faint">Aucun pour l&apos;instant.</span>}
            </div>
            {isMe && nextGame.length > 0 && (
              <div className="mt-4 space-y-2.5">
                <p className="text-[11px] font-semibold text-ink-faint">À portée</p>
                {nextGame.map((b) => (
                  <div key={b.id} className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-white/5 grid place-items-center text-lg grayscale shrink-0">{b.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{b.label} <span className="text-ink-faint font-normal">— {b.hint}</span></span>
                      <span className="block h-1 mt-1.5 rounded-full bg-white/8 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${Math.round(b.progress * 100)}%`, background: "linear-gradient(90deg,#780101,#f0001c)" }} /></span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
        {isMe && profile.username && <div id="partager" className="mt-2 scroll-mt-24"><ShareProfileCard username={profile.username} /></div>}
        {isMe && <div className="mt-4"><ReferralCard compact /></div>}
        {!isMe && viewer && (
          <a href={dailyHref} className="sticker w-full h-14 mt-2"><Swords size={18} /> Défier {name} sur le défi</a>
        )}
      </section>
      <GameTabBar />
    </>
  );
}
