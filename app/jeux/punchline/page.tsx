"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Mic2 } from "lucide-react";
import WhoSaidItQuiz, { type QuizRound } from "@/components/WhoSaidItQuiz";
import BrandLoader from "@/components/BrandLoader";

/*
 * La Punchline — qui a lâché cette phrase ? Le contenu vient de la table `punchlines`
 * (remplie à la main) : tant qu'elle est vide, la page affiche un état "bientôt".
 */

type ApiRound = { id: string; text: string; artist: string; decoys: string[] };

export default function PunchlinePage() {
  const [rounds, setRounds] = useState<QuizRound[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const load = useCallback(() => {
    setRounds(null);
    fetch("/api/jeux/punchline")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRounds(
          (d.rounds as ApiRound[]).map((r) => ({
            id: r.id,
            content: [`« ${r.text} »`],
            answer: r.artist,
            decoys: r.decoys,
          }))
        );
        setGameKey((k) => k + 1);
      })
      .catch(() => setError("Impossible de charger les punchlines. Réessaie."));
  }, []);

  useEffect(load, [load]);

  return (
    <section className="max-w-md mx-auto px-6 pt-10 pb-24">
      <a href="/jeux" className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide mb-8">
        <ArrowLeft size={14} /> Tous les jeux
      </a>

      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
        <Mic2 size={13} /> La Punchline
      </p>
      <h1 className="font-display text-2xl font-semibold mb-1">Qui a dit ça ?</h1>
      <p className="text-sm text-ink-muted mb-8">Une phrase, quatre suspects. À toi de trancher.</p>

      {error && <p className="text-sm text-riseNeg text-center py-10">{error}</p>}
      {!error && rounds === null && (
        <div className="h-40 flex items-center justify-center">
          <BrandLoader size="md" />
        </div>
      )}
      {rounds !== null && rounds.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-3xl mb-3" aria-hidden="true">🎤</p>
          <p className="font-display text-lg font-semibold mb-1">Bientôt disponible</p>
          <p className="text-sm text-ink-muted">Les premières punchlines arrivent très vite — reviens bientôt.</p>
        </div>
      )}
      {rounds !== null && rounds.length > 0 && (
        <WhoSaidItQuiz key={gameKey} rounds={rounds} scoreTheme="jeu-punchline" onRestart={load} />
      )}
    </section>
  );
}
