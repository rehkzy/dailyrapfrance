import { Trophy, Gamepad2, TrendingUp } from "lucide-react";
import { THEME_OPTIONS } from "@/lib/themes";
import { computeStats, type ScoreRow } from "@/lib/gameStats";

function themeLabel(id: string) {
  return THEME_OPTIONS.find((t) => t.id === id)?.label ?? id;
}

export default function StatsBlock({ games }: { games: ScoreRow[] }) {
  const { gamesPlayed, bestScore, avgScore, skills } = computeStats(games);
  const maxAvg = Math.max(1, ...skills.map((s) => s.avg));

  return (
    <>
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
    </>
  );
}
