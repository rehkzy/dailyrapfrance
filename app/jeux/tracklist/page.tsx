"use client";

import { redirect } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Share2, X as XIcon } from "lucide-react";
import { checkGuess } from "@/lib/blindtest-match";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import BrandLoader from "@/components/BrandLoader";

/*
 * Le Tracklist — un morceau mystère par jour (le même pour tout le monde), 6 essais.
 * Chaque mauvaise réponse dévoile un indice supplémentaire. La progression du jour est
 * conservée en localStorage : on ne peut jouer qu'une fois par jour, comme Wordle, et
 * revenir sur la page réaffiche le résultat.
 */

type Daily = {
  day: string;
  id: string;
  title: string;
  artist: string;
  cover: string;
  preview: string;
  hints: string[];
};

const MAX_TRIES = 6;

type SavedState = { day: string; guesses: string[]; won: boolean; finished: boolean };

function loadState(day: string): SavedState {
  try {
    const raw = localStorage.getItem("drf-tracklist");
    if (raw) {
      const s = JSON.parse(raw) as SavedState;
      if (s.day === day) return s;
    }
  } catch {
    // stockage indisponible (navigation privée...) : on joue en mémoire seulement
  }
  return { day, guesses: [], won: false, finished: false };
}

function saveState(s: SavedState) {
  try {
    localStorage.setItem("drf-tracklist", JSON.stringify(s));
  } catch {
    // idem — pas bloquant
  }
}

// Désactivé pour l'instant — seuls Blind Test et Artists Manager 2026 sont
// jouables. Le composant réel (TracklistPageReal, plus bas) est intact et prêt
// à être réactivé : il suffit de remplacer ce redirect par son rendu.
export default function TracklistPage() {
  redirect("/jeux/bientot?titre=La%20Tracklist");
}

export function TracklistPageReal() {
  const [daily, setDaily] = useState<Daily | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SavedState | null>(null);
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/jeux/tracklist")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDaily(d);
        setState(loadState(d.day));
      })
      .catch(() => setError("Impossible de charger le morceau du jour. Réessaie."));
  }, []);

  const revealedHints = useMemo(() => {
    if (!daily || !state) return [];
    // 1 indice de départ + 1 par mauvaise réponse
    return daily.hints.slice(0, Math.min(state.guesses.length + 1, daily.hints.length));
  }, [daily, state]);

  function submit() {
    if (!daily || !state || state.finished || !input.trim()) return;
    const ok = checkGuess(input, "", daily.title, false);
    const guesses = [...state.guesses, input.trim()];
    const finished = ok || guesses.length >= MAX_TRIES;
    const next: SavedState = { day: daily.day, guesses, won: ok, finished };
    setState(next);
    saveState(next);
    setInput("");
    if (!ok) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    if (finished) {
      // Score façon blind test : plus tu trouves tôt, plus tu marques.
      const points = ok ? MAX_TRIES + 1 - guesses.length : 0;
      fetch("/api/blindtest/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "jeu-tracklist", rounds: 1, points }),
      }).catch(() => {});
    }
  }

  function shareResult() {
    if (!daily || !state) return;
    const squares = state.guesses
      .map((g, i) => (state.won && i === state.guesses.length - 1 ? "🟥" : "⬛"))
      .join("");
    const text = `Le Tracklist DailyRapFrance — ${daily.day}\n${
      state.won ? `Trouvé en ${state.guesses.length}/${MAX_TRIES}` : `Raté ${MAX_TRIES}/${MAX_TRIES}`
    }\n${squares}\nJoue sur dailyrapfrance.best/jeux/tracklist`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  }

  if (error) {
    return <p className="max-w-md mx-auto text-center text-sm text-riseNeg py-20">{error}</p>;
  }
  if (!daily || !state) {
    return (
      <div className="h-64 flex items-center justify-center">
        <BrandLoader size="md" />
      </div>
    );
  }

  return (
    <section className="max-w-md mx-auto px-6 pt-10 pb-24">
      <a href="/jeux" className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide mb-8">
        <ArrowLeft size={14} /> Tous les jeux
      </a>

      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-2">Le Tracklist · {daily.day}</p>
      <h1 className="font-display text-2xl font-semibold mb-1">Le morceau mystère du jour</h1>
      <p className="text-sm text-ink-muted mb-8">
        {MAX_TRIES} essais pour trouver le titre. Un indice se dévoile à chaque erreur.
      </p>

      {/* Indices dévoilés */}
      <div className="space-y-2 mb-6">
        {revealedHints.map((h, i) => (
          <div key={i} className="solved-pop glass rounded-xl px-4 py-3 text-sm flex items-center gap-2.5">
            <span className="font-mono text-[10px] text-gold shrink-0">INDICE {i + 1}</span>
            {h}
          </div>
        ))}
      </div>

      {/* Essais passés */}
      {state.guesses.length > 0 && (
        <div className="space-y-1.5 mb-6">
          {state.guesses.map((g, i) => {
            const isWin = state.won && i === state.guesses.length - 1;
            return (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${
                  isWin ? "bg-gold/15 border border-gold/40 text-gold" : "bg-white/5 border border-white/8 text-ink-muted line-through"
                }`}
              >
                {isWin ? <Check size={14} /> : <XIcon size={13} className="text-riseNeg shrink-0" />}
                {g}
              </div>
            );
          })}
        </div>
      )}

      {!state.finished ? (
        <div className={shake ? "shake-wrong" : ""}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={`Titre du morceau (essai ${state.guesses.length + 1}/${MAX_TRIES})`}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-gold/50 mb-3"
          />
          <BorderMagicButton onClick={submit} fullWidth size="md" disabled={!input.trim()}>
            Valider
          </BorderMagicButton>
        </div>
      ) : (
        <div className="text-center solved-pop">
          <img src={daily.cover} alt="" className="w-28 h-28 rounded-xl object-cover mx-auto mb-4 border border-white/10" />
          <p className="font-display text-xl font-semibold">{daily.title}</p>
          <p className="text-sm text-ink-muted mb-1">{daily.artist}</p>
          <p className={`font-mono text-sm mb-6 ${state.won ? "text-gold" : "text-ink-faint"}`}>
            {state.won ? `Trouvé en ${state.guesses.length}/${MAX_TRIES} 🔥` : "Pas cette fois — reviens demain !"}
          </p>
          <audio src={daily.preview} controls className="w-full mb-6" />
          <BorderMagicButton onClick={shareResult} fullWidth size="md">
            <Share2 size={16} />
            {copied ? "Copié !" : "Partager mon score"}
          </BorderMagicButton>
          <p className="text-xs text-ink-faint font-mono mt-6">Prochain morceau mystère demain à minuit.</p>
        </div>
      )}
    </section>
  );
}
