import { Medal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Classement — Blind Test DailyRapFrance",
};

export const revalidate = 60;

export default async function ClassementPage() {
  const supabase = await createClient();
  const { data: scores } = await supabase
    .from("blindtest_scores")
    .select("id, points, rounds, theme, created_at, profiles(display_name, avatar_url)")
    .order("points", { ascending: false })
    .limit(50);

  return (
    <section className="max-w-2xl mx-auto px-6 pt-16 pb-24">
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Blind Test</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Classement</h1>
      <p className="text-ink-muted mb-10">
        Les meilleurs scores solo, tous thèmes confondus. Connecte-toi et termine une partie
        pour y apparaître.
      </p>

      {!scores || scores.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted text-sm">
          Personne n'a encore de score enregistré — sois le premier.
        </div>
      ) : (
        <div className="card divide-y divide-white/8 overflow-hidden">
          {scores.map((s, i) => {
            const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
            return (
              <div key={s.id} className="flex items-center gap-4 py-4 px-5">
                <span className="font-display text-lg w-7 text-center shrink-0">
                  {i < 3 ? (
                    <Medal size={18} className={i === 0 ? "text-gold" : "text-ink-faint"} />
                  ) : (
                    <span className="text-ink-faint text-sm">{i + 1}</span>
                  )}
                </span>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs shrink-0">
                    {(profile?.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.display_name ?? "Joueur"}</p>
                  <p className="text-xs text-ink-faint">
                    {s.theme} · {s.rounds} manches
                  </p>
                </div>
                <span className="font-mono text-gold shrink-0">{s.points} pts</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
