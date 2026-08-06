"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import { sfx } from "@/lib/sfx";

/*
 * Moteur de quiz "qui est-ce ?" partagé par La Punchline et Ghostwriter :
 * un contenu affiché (punchline ou lignes de pastiche IA), 4 choix d'artistes
 * (bonne réponse + 3 leurres, mélangés une fois par manche), score sur la partie,
 * enregistrement du score final via la route blindtest existante.
 */

export type QuizRound = {
  id: string;
  content: string[];   // 1+ lignes à afficher
  answer: string;      // le bon artiste
  decoys: string[];    // 3 leurres
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function WhoSaidItQuiz({
  rounds,
  scoreTheme,
  onRestart,
}: {
  rounds: QuizRound[];
  scoreTheme: string;   // ex "jeu-punchline" — pour blindtest_scores
  onRestart: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const round = rounds[index];
  // Options mélangées UNE fois par manche (useMemo sur l'id) — pas à chaque rendu,
  // sinon elles bougeraient sous le doigt au moindre re-render.
  const options = useMemo(
    () => (round ? shuffle([round.answer, ...round.decoys]) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round?.id]
  );

  function pick(option: string) {
    if (picked || !round) return;
    setPicked(option);
    const ok = option === round.answer;
    if (ok) {
      sfx.correct();
      setScore((s) => s + 1);
    } else {
      sfx.wrong();
    }
    setTimeout(() => {
      if (index + 1 >= rounds.length) {
        setFinished(true);
        sfx.victory();
        const finalScore = ok ? score + 1 : score;
        fetch("/api/blindtest/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: scoreTheme, rounds: rounds.length, points: finalScore }),
        }).catch(() => {});
      } else {
        setIndex((i) => i + 1);
        setPicked(null);
      }
    }, 1200);
  }

  if (finished) {
    return (
      <div className="text-center solved-pop py-8">
        <p className="font-impact text-5xl text-gold mb-2">{score}/{rounds.length}</p>
        <p className="text-sm text-ink-muted mb-8">
          {score === rounds.length ? "Sans faute — encyclopédie vivante 🔥" : score >= rounds.length / 2 ? "Solide !" : "Ça se travaille..."}
        </p>
        <BorderMagicButton onClick={onRestart} size="lg">
          <RotateCcw size={18} /> Rejouer
        </BorderMagicButton>
      </div>
    );
  }

  if (!round) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <span className="font-mono text-xs text-ink-faint uppercase tracking-wide">
          Manche {index + 1} / {rounds.length}
        </span>
        <span className="font-impact text-lg text-gold">{score}</span>
      </div>

      <div key={round.id} className="solved-pop glass-strong rounded-2xl p-6 mb-6">
        {round.content.map((line, i) => (
          <p key={i} className="font-display text-lg sm:text-xl font-medium leading-relaxed">
            {line}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {options.map((o) => {
          const isAnswer = o === round.answer;
          const isPicked = o === picked;
          return (
            <button
              key={o}
              onClick={() => pick(o)}
              disabled={!!picked}
              className={`rounded-xl px-4 py-3.5 text-sm font-semibold border transition-colors ${
                picked
                  ? isAnswer
                    ? "border-gold bg-gold/15 text-gold"
                    : isPicked
                    ? "border-riseNeg bg-riseNeg/10 text-riseNeg shake-wrong"
                    : "border-white/8 bg-white/[0.02] text-ink-faint"
                  : "border-white/10 bg-white/5 hover:border-gold/40 hover:bg-white/[0.07]"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
