"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Zap, RotateCcw, Users, User } from "lucide-react";
import { checkGuess } from "@/lib/blindtest-match";

type Track = { id: string; title: string; artistName: string; previewUrl: string; coverUrl: string | null };
type Mode = "solo" | "local";
type Phase = "setup" | "loading" | "playing" | "final";

const ROUND_SECONDS = 20;

const THEME_OPTIONS = [
  { id: "mix", label: "Mix — tout mélanger" },
  { id: "old", label: "À l'ancienne (90s-2000s)" },
  { id: "2010s", label: "Années 2010" },
  { id: "recent", label: "Sons récents" },
  { id: "pop", label: "Pop / mainstream" },
  { id: "cloud", label: "Cloud rap" },
  { id: "93", label: "Rappeurs du 93" },
  { id: "91", label: "Rappeurs du 91" },
] as const;

function buildQuery(themeId: string, count: number) {
  const params = new URLSearchParams();
  params.set("count", String(count));
  if (themeId === "old") {
    params.append("era", "NINETIES");
    params.append("era", "TWO_THOUSANDS");
  } else if (themeId === "2010s") {
    params.append("era", "TWENTY_TENS");
  } else if (themeId === "recent") {
    params.append("era", "RECENT");
  } else if (themeId === "pop") {
    params.set("pop", "1");
  } else if (themeId === "cloud") {
    params.append("theme", "cloud");
  } else if (themeId === "93") {
    params.append("theme", "dept-93");
  } else if (themeId === "91") {
    params.append("theme", "dept-91");
  }
  return params;
}

type Player = { id: string; name: string; score: number };

export default function BlindTest() {
  // Setup
  const [mode, setMode] = useState<Mode>("solo");
  const [themeId, setThemeId] = useState<string>("mix");
  const [roundCount, setRoundCount] = useState(10);
  const [playerNames, setPlayerNames] = useState<string[]>(["Joueur 1", "Joueur 2"]);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Partie
  const [phase, setPhase] = useState<Phase>("setup");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);

  // Round courant
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [buzzedBy, setBuzzedBy] = useState<string | null>(null);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [soloWrongFlash, setSoloWrongFlash] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const track = tracks[roundIndex];

  const clearTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    intervalRef.current = null;
    advanceTimeoutRef.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const revealRound = useCallback(
    (winner: string | null) => {
      setRevealed(true);
      setWinnerId(winner);
      clearTimers();
      audioRef.current?.pause();
      advanceTimeoutRef.current = setTimeout(() => {
        setRoundIndex((i) => {
          const next = i + 1;
          if (next >= tracks.length) {
            setPhase("final");
          }
          return next;
        });
      }, 2600);
    },
    [clearTimers, tracks.length]
  );

  const tick = useCallback(() => {
    setTimeLeft((t) => {
      if (t <= 1) {
        revealRound(null);
        return 0;
      }
      return t - 1;
    });
  }, [revealRound]);

  function resetRoundState() {
    setStarted(false);
    setTimeLeft(ROUND_SECONDS);
    setBuzzedBy(null);
    setLocked(new Set());
    setGuess("");
    setRevealed(false);
    setWinnerId(null);
    setSoloWrongFlash(false);
    clearTimers();
  }

  // Reset le round quand on avance dans la partie
  useEffect(() => {
    if (phase === "playing") resetRoundState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, phase]);

  async function startGame() {
    setSetupError(null);
    if (mode === "local" && playerNames.filter((n) => n.trim()).length < 2) {
      setSetupError("Il faut au moins 2 joueurs en mode local.");
      return;
    }
    setPhase("loading");
    try {
      const res = await fetch(`/api/blindtest/pool?${buildQuery(themeId, roundCount)}`);
      const data = await res.json();
      const pool: Track[] = data.tracks ?? [];
      if (pool.length < 5) {
        setSetupError(
          "Pas assez de titres disponibles pour ce thème. Le pool doit être peuplé — voir pipelines/ingest-blindtest-pool.js."
        );
        setPhase("setup");
        return;
      }
      setTracks(pool);
      setPlayers(
        mode === "solo"
          ? [{ id: "solo", name: "Toi", score: 0 }]
          : playerNames.filter((n) => n.trim()).map((n, i) => ({ id: `p${i}`, name: n.trim(), score: 0 }))
      );
      setRoundIndex(0);
      setPhase("playing");
    } catch {
      setSetupError("Impossible de charger le pool de titres. Réessaie.");
      setPhase("setup");
    }
  }

  function launchExtract() {
    if (started || revealed) return;
    setStarted(true);
    audioRef.current?.play().catch(() => {});
    intervalRef.current = setInterval(tick, 1000);
  }

  function awardPoints(playerId: string) {
    const bonus = Math.round(100 + timeLeft * 4);
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, score: p.score + bonus } : p)));
  }

  // Mode local : buzz d'un joueur
  function handleBuzz(playerId: string) {
    if (!started || revealed || buzzedBy || locked.has(playerId)) return;
    setBuzzedBy(playerId);
    audioRef.current?.pause();
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function submitLocalGuess() {
    if (!buzzedBy || !track) return;
    const correct = checkGuess(guess, track.artistName, track.title);
    if (correct) {
      awardPoints(buzzedBy);
      revealRound(buzzedBy);
      return;
    }
    const nextLocked = new Set(locked);
    nextLocked.add(buzzedBy);
    setLocked(nextLocked);
    setBuzzedBy(null);
    setGuess("");
    if (nextLocked.size >= players.length) {
      revealRound(null);
      return;
    }
    audioRef.current?.play().catch(() => {});
    intervalRef.current = setInterval(tick, 1000);
  }

  // Mode solo : deviner directement, sans buzz
  function submitSoloGuess() {
    if (!started || revealed || !track) return;
    const correct = checkGuess(guess, track.artistName, track.title);
    if (correct) {
      awardPoints("solo");
      revealRound("solo");
    } else {
      setSoloWrongFlash(true);
      setGuess("");
      setTimeout(() => setSoloWrongFlash(false), 500);
    }
  }

  function playAgain() {
    clearTimers();
    setPhase("setup");
    setTracks([]);
    setPlayers([]);
    setRoundIndex(0);
    resetRoundState();
  }

  // ── Rendu ──────────────────────────────────────────────────────────────

  if (phase === "setup" || phase === "loading") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-6 md:p-8 space-y-8">
          <div>
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Mode</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode("solo")}
                className={`rounded-xl border p-4 flex flex-col items-center gap-2 transition-colors ${
                  mode === "solo" ? "border-gold bg-gold/10" : "border-white/10 hover:border-white/20"
                }`}
              >
                <User size={20} className={mode === "solo" ? "text-gold" : "text-ink-muted"} />
                <span className="text-sm font-medium">Solo</span>
              </button>
              <button
                onClick={() => setMode("local")}
                className={`rounded-xl border p-4 flex flex-col items-center gap-2 transition-colors ${
                  mode === "local" ? "border-gold bg-gold/10" : "border-white/10 hover:border-white/20"
                }`}
              >
                <Users size={20} className={mode === "local" ? "text-gold" : "text-ink-muted"} />
                <span className="text-sm font-medium">À plusieurs (même écran)</span>
              </button>
            </div>
          </div>

          {mode === "local" && (
            <div>
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Joueurs</p>
              <div className="space-y-2">
                {playerNames.map((name, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={name}
                      onChange={(e) =>
                        setPlayerNames((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))
                      }
                      placeholder={`Joueur ${i + 1}`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50"
                    />
                    {playerNames.length > 2 && (
                      <button
                        onClick={() => setPlayerNames((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-ink-faint hover:text-ink px-2"
                        aria-label="Retirer ce joueur"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {playerNames.length < 8 && (
                  <button
                    onClick={() => setPlayerNames((prev) => [...prev, `Joueur ${prev.length + 1}`])}
                    className="text-xs font-mono text-gold hover:text-glow transition-colors"
                  >
                    + Ajouter un joueur
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Thème</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  className={`rounded-lg border px-4 py-2.5 text-sm text-left transition-colors ${
                    themeId === t.id ? "border-gold bg-gold/10 text-ink" : "border-white/10 text-ink-muted hover:border-white/20"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Nombre de manches</p>
            <div className="flex gap-2">
              {[10, 15, 20, 30].map((n) => (
                <button
                  key={n}
                  onClick={() => setRoundCount(n)}
                  className={`rounded-full px-4 py-1.5 text-sm font-mono transition-colors ${
                    roundCount === n ? "bg-gold text-white" : "glass text-ink-muted hover:text-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {setupError && <p className="text-sm text-riseNeg">{setupError}</p>}

          <button
            onClick={startGame}
            disabled={phase === "loading"}
            className="w-full bg-gold hover:bg-glow disabled:opacity-60 text-white rounded-full py-3.5 font-medium transition-colors flex items-center justify-center gap-2"
          >
            {phase === "loading" ? "Chargement..." : "Lancer la partie"}
            {phase !== "loading" && <Play size={16} />}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "final") {
    const ranked = [...players].sort((a, b) => b.score - a.score);
    return (
      <div className="max-w-xl mx-auto text-center">
        <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Terminé</p>
        <h2 className="font-display text-3xl md:text-4xl font-semibold mb-10">
          {mode === "solo" ? `${ranked[0]?.score ?? 0} points` : "Résultats"}
        </h2>
        {mode === "local" && (
          <div className="card divide-y divide-white/8 overflow-hidden mb-8 text-left">
            {ranked.map((p, i) => (
              <div key={p.id} className="flex items-center gap-4 py-4 px-5">
                <span className="font-display text-xl text-ink-faint w-8">{i + 1}</span>
                <span className="flex-1 font-medium">{p.name}</span>
                <span className="font-mono text-gold">{p.score}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={playAgain}
          className="inline-flex items-center gap-2 bg-gold hover:bg-glow text-white rounded-full px-6 py-3 font-medium transition-colors"
        >
          <RotateCcw size={16} />
          Rejouer
        </button>
      </div>
    );
  }

  // phase === "playing"
  if (!track) return null;

  const activePlayer = mode === "local" ? players.find((p) => p.id === buzzedBy) : players[0];

  return (
    <div className="max-w-2xl mx-auto">
      <audio ref={audioRef} src={track.previewUrl} preload="auto" />

      <div className="flex items-center justify-between mb-6">
        <span className="font-mono text-xs text-ink-faint uppercase tracking-wide">
          Manche {roundIndex + 1} / {tracks.length}
        </span>
        {mode === "local" && (
          <div className="flex gap-3 font-mono text-xs text-ink-muted">
            {players.map((p) => (
              <span key={p.id}>{p.name} · {p.score}</span>
            ))}
          </div>
        )}
      </div>

      <div className="card p-8 text-center relative overflow-hidden">
        {revealed && <div className="brand-glow" aria-hidden="true" />}

        {!started ? (
          <button
            onClick={launchExtract}
            className="mx-auto flex items-center gap-3 bg-gold hover:bg-glow text-white rounded-full px-8 py-4 font-medium transition-colors"
          >
            <Play size={20} />
            Lancer l'extrait
          </button>
        ) : !revealed ? (
          <>
            <div className="w-24 h-24 mx-auto rounded-full glass-strong flex items-center justify-center mb-6">
              <span className="font-display text-3xl text-gold">{timeLeft}</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-8 max-w-xs mx-auto">
              <div
                className="h-full bg-gold transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / ROUND_SECONDS) * 100}%` }}
              />
            </div>

            {mode === "local" ? (
              buzzedBy ? (
                <div className="max-w-sm mx-auto">
                  <p className="text-sm text-ink-muted mb-3">
                    <span className="text-gold font-medium">{activePlayer?.name}</span> a buzzé —
                    artiste ou titre ?
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitLocalGuess();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      autoFocus
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50"
                      placeholder="Ta réponse..."
                    />
                    <button type="submit" className="bg-gold hover:bg-glow text-white rounded-lg px-4 text-sm font-medium">
                      Valider
                    </button>
                  </form>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
                  {players.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleBuzz(p.id)}
                      disabled={locked.has(p.id)}
                      className="glass rounded-xl py-4 flex flex-col items-center gap-1.5 hover:border-gold/40 disabled:opacity-30 disabled:hover:border-white/8 transition-colors"
                    >
                      <Zap size={18} className="text-gold" />
                      <span className="text-sm font-medium">{p.name}</span>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSoloGuess();
                }}
                className="max-w-sm mx-auto flex gap-2"
              >
                <input
                  autoFocus
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  className={`flex-1 bg-white/5 border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
                    soloWrongFlash ? "border-riseNeg" : "border-white/10 focus:border-gold/50"
                  }`}
                  placeholder="Artiste ou titre..."
                />
                <button type="submit" className="bg-gold hover:bg-glow text-white rounded-lg px-4 text-sm font-medium">
                  Valider
                </button>
              </form>
            )}
          </>
        ) : (
          <div>
            {track.coverUrl && (
              <img src={track.coverUrl} alt={track.title} className="w-24 h-24 rounded-lg object-cover mx-auto mb-4" />
            )}
            <p className="font-display text-2xl font-medium">{track.title}</p>
            <p className="text-ink-muted mt-1">{track.artistName}</p>
            {winnerId && (
              <p className="mt-4 font-mono text-sm text-gold">
                {mode === "solo" ? "Bien joué !" : `${players.find((p) => p.id === winnerId)?.name} marque !`}
              </p>
            )}
            {!winnerId && <p className="mt-4 font-mono text-sm text-ink-faint">Personne n'a trouvé.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
