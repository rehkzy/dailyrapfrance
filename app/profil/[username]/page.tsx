import { notFound } from "next/navigation";
import { Trophy, Gamepad2, TrendingUp, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { THEME_OPTIONS } from "@/lib/themes";
import AddFriendButton from "@/components/AddFriendButton";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${username} — Profil DailyRapFrance` };
}

function themeLabel(id: string) {
  return THEME_OPTIONS.find((t) => t.id === id)?.label ?? id;
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

  const games = scores ?? [];
  const gamesPlayed = games.length;
  const bestScore = games.reduce((m, g) => Math.max(m, g.points), 0);
  const avgScore = gamesPlayed > 0 ? Math.round(games.reduce((s, g) => s + g.points, 0) / gamesPlayed) : 0;

  // "Compétences" — moyenne de points par thème joué, pour repérer les points forts.
  // Nécessite au moins 2 parties sur un thème pour être affiché (une seule partie n'est pas
  // un signal fiable de compétence).
  const byTheme = new Map<string, { total: number; count: number }>();
  for (const g of games) {
    const cur = byTheme.get(g.theme) ?? { total: 0, count: 0 };
    cur.total += g.points;
    cur.count += 1;
    byTheme.set(g.theme, cur);
  }
  const skills = [...byTheme.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([theme, v]) => ({ theme, avg: Math.round(v.total / v.count), count: v.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6);
  const maxAvg = Math.max(1, ...skills.map((s) => s.avg));

  const memberSince = new Date(profile.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <section className="max-w-2xl mx-auto px-6 pt-16 pb-24">
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

      <div className="grid grid-cols-3 gap-3 mb-10">
        <div className="card p-4 text-center">
          <Gamepad2 size={16} className="text-gold mx-auto mb-2" />
          <p className="font-display text-xl font-semibold">{gamesPlayed}</p>
          <p className="text-[11px] text-ink-faint font-mono uppercase tracking-wide mt-0.5">Parties</p>
        </div>
        <div className="card p-4 text-center">
          <Trophy size={16} className="text-gold mx-auto mb-2" />
          <p className="font-display text-xl font-semibold">{bestScore}</p>
          <p className="text-[11px] text-ink-faint font-mono uppercase tracking-wide mt-0.5">Meilleur score</p>
        </div>
        <div className="card p-4 text-center">
          <TrendingUp size={16} className="text-gold mx-auto mb-2" />
          <p className="font-display text-xl font-semibold">{avgScore}</p>
          <p className="text-[11px] text-ink-faint font-mono uppercase tracking-wide mt-0.5">Score moyen</p>
        </div>
      </div>

      <div>
        <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Compétences</p>
        {skills.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-muted">
            Pas encore assez de parties sur un même thème pour dégager des points forts —
            {gamesPlayed === 0 ? " aucune partie enregistrée pour l'instant." : " encore un peu de jeu et ça viendra."}
          </div>
        ) : (
          <div className="card p-5 space-y-3.5">
            {skills.map((s) => (
              <div key={s.theme}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium">{themeLabel(s.theme)}</span>
                  <span className="font-mono text-xs text-ink-faint">
                    {s.avg} pts moy. · {s.count} partie{s.count > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-signal to-gold rounded-full"
                    style={{ width: `${Math.max(6, (s.avg / maxAvg) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
