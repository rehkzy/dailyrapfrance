"use client";

import { useEffect, useState } from "react";
import { Lock, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { THEME_OPTIONS } from "@/lib/themes";

/*
 * Passeport artiste — un badge par thème "artist-*" joué. Dérivé directement de
 * blindtest_scores (aucune nouvelle table) : le meilleur score jamais fait sur ce thème.
 *
 * Honnêteté sur la limite : on ne sait pas rétroactivement si une partie était en QCM ou
 * texte, ni combien de featurings il y avait — impossible de garantir mathématiquement un
 * "score parfait". Le seuil "Maîtrisé" est donc une estimation (score ≥ 1.6 pt/manche en
 * moyenne, cohérent avec un sans-faute en mode texte sur un thème avec quelques feats) —
 * présentée comme telle, pas comme une certification absolue.
 */

const ARTIST_THEMES = THEME_OPTIONS.filter((t) => t.id.startsWith("artist-"));
const MASTERY_RATIO = 1.6; // points par manche, seuil indicatif de "maîtrisé"

type Best = { theme: string; points: number; rounds: number };

export default function ArtistPassport({ userId }: { userId: string }) {
  const [bests, setBests] = useState<Record<string, Best>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("blindtest_scores")
      .select("theme, points, rounds")
      .eq("user_id", userId)
      .in("theme", ARTIST_THEMES.map((t) => t.id))
      .then(({ data }) => {
        const map: Record<string, Best> = {};
        for (const row of (data as Best[]) ?? []) {
          const cur = map[row.theme];
          if (!cur || row.points > cur.points) map[row.theme] = row;
        }
        setBests(map);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return <div className="text-center py-10 text-ink-faint text-sm font-mono">Chargement du passeport...</div>;
  }

  const unlockedCount = Object.keys(bests).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-xs text-gold uppercase tracking-[0.16em]">Passeport artiste</p>
        <p className="text-xs text-ink-faint">
          {unlockedCount} / {ARTIST_THEMES.length} débloqués
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ARTIST_THEMES.map((t) => {
          const best = bests[t.id];
          const mastered = best && best.rounds > 0 && best.points / best.rounds >= MASTERY_RATIO;
          return (
            <div
              key={t.id}
              className={`relative rounded-xl p-4 border text-center ${
                best ? (mastered ? "border-gold/50 bg-gold/10" : "border-white/15 bg-white/[0.03]") : "border-white/8 bg-white/[0.015]"
              }`}
            >
              {mastered && (
                <span className="absolute top-2 right-2 text-gold">
                  <Star size={14} fill="currentColor" />
                </span>
              )}
              <div
                className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${
                  best ? "bg-gold/20 text-gold" : "bg-white/5 text-ink-faint"
                }`}
              >
                {best ? <t.Icon size={18} /> : <Lock size={14} />}
              </div>
              <p className={`text-xs font-semibold ${best ? "text-ink" : "text-ink-faint"}`}>
                {t.label.replace("Blind Test ", "")}
              </p>
              <p className="text-[10px] text-ink-faint mt-0.5">
                {best ? `${best.points} pts • ${best.rounds} manches` : "Non joué"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-ink-faint mt-4 leading-relaxed">
        ⭐ = meilleure performance estimée "maîtrisée" (≈ {MASTERY_RATIO} pt/manche en
        moyenne) — une estimation, pas une certification exacte.
      </p>
    </div>
  );
}
