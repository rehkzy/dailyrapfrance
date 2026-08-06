"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Ghost } from "lucide-react";
import WhoSaidItQuiz, { type QuizRound } from "@/components/WhoSaidItQuiz";
import BrandLoader from "@/components/BrandLoader";

/*
 * Ghostwriter — une IA a écrit ces lignes en imitant le style d'un rappeur (aucune
 * vraie parole, uniquement du pastiche généré). Devine qui elle copie. Le contenu vient
 * de la table `ghostwriter_rounds` (remplie à la main).
 */

type ApiRound = { id: string; lines: string[]; artist: string; decoys: string[] };

export default function GhostwriterPage() {
  const [rounds, setRounds] = useState<QuizRound[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const load = useCallback(() => {
    setRounds(null);
    fetch("/api/jeux/ghostwriter")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRounds(
          (d.rounds as ApiRound[]).map((r) => ({
            id: r.id,
            content: r.lines,
            answer: r.artist,
            decoys: r.decoys,
          }))
        );
        setGameKey((k) => k + 1);
      })
      .catch(() => setError("Impossible de charger les manches. Réessaie."));
  }, []);

  useEffect(load, [load]);

  return (
    <section className="max-w-md mx-auto px-6 pt-10 pb-24">
      <a href="/jeux" className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide mb-8">
        <ArrowLeft size={14} /> Tous les jeux
      </a>

      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
        <Ghost size={13} /> Ghostwriter
      </p>
      <h1 className="font-display text-2xl font-semibold mb-1">Qui l&apos;IA imite-t-elle ?</h1>
      <p className="text-sm text-ink-muted mb-8">
        Ces lignes sont écrites par une IA qui pastiche un rappeur. Démasque le modèle.
      </p>

      {error && <p className="text-sm text-riseNeg text-center py-10">{error}</p>}
      {!error && rounds === null && (
        <div className="h-40 flex items-center justify-center">
          <BrandLoader size="md" />
        </div>
      )}
      {rounds !== null && rounds.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-3xl mb-3" aria-hidden="true">👻</p>
          <p className="font-display text-lg font-semibold mb-1">Bientôt disponible</p>
          <p className="text-sm text-ink-muted">Les premières manches arrivent très vite — reviens bientôt.</p>
        </div>
      )}
      {rounds !== null && rounds.length > 0 && (
        <WhoSaidItQuiz key={gameKey} rounds={rounds} scoreTheme="jeu-ghostwriter" onRestart={load} />
      )}
    </section>
  );
}
