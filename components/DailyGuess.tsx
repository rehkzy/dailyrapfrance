"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Check, X, Share2, RotateCcw } from "lucide-react";
import { isCloseMatch } from "@/lib/blindtest-match";
import { markPlayedToday, getStreak } from "@/lib/dailyStreak";
import { sfx } from "@/lib/sfx";

type Track = {
  id: string;
  title: string;
  artistName: string;
  previewUrl: string;
  coverUrl: string | null;
};

const REVEAL_SECONDS = [1, 2, 4, 7, 11, 16]; // durée d'écoute autorisée à chaque essai
const MAX_ATTEMPTS = REVEAL_SECONDS.length;

type SavedState = {
  date: string;
  guesses: string[];
  status: "playing" | "won" | "lost";
};

function storageKey(date: string) {
  return `drf-daily-guess-${date}`;
}

function loadState(date: string): SavedState {
  try {
    const raw = localStorage.getItem(storageKey(date));
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { date, guesses: [], status: "playing" };
}

function saveState(state: SavedState) {
  try {
    localStorage.setItem(storageKey(state.date), JSON.stringify(state));
  } catch {
    /* stockage indisponible — la partie ne sera juste pas retrouvée au rechargement */
  }
}

export default function DailyGuess() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);

  const [guesses, setGuesses] = useState<string[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [input, setInput] = useState("");
  const [wrongFlash, setWrongFlash] = useState(false);
  const [copied, setCopied] = useState(false);
  const [streak, setStreak] = useState(0);

  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopAtRef = useRef<number>(REVEAL_SECONDS[0]);

  useEffect(() => {
    fetch("/api/blindtest/daily-guess")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setTrack(d.track);
        setDayNumber(d.dayNumber);
        setDate(d.date);
        const saved = loadState(d.date);
        setGuesses(saved.guesses);
        setStatus(saved.status);
        setStreak(getStreak());
      })
      .catch(() => setError("Impossible de charger le titre du jour."))
      .finally(() => setLoading(false));
  }, []);

  const attemptsLeft = MAX_ATTEMPTS - guesses.length;
  const currentRevealSeconds = REVEAL_SECONDS[Math.min(guesses.length, MAX_ATTEMPTS - 1)];

  useEffect(() => {
    stopAtRef.current = currentRevealSeconds;
  }, [currentRevealSeconds]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
    setPlaying(true);
  }

  function onTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime >= stopAtRef.current) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
    }
  }

  function finish(next: "won" | "lost", nextGuesses: string[]) {
    if (!date) return;
    setStatus(next);
    saveState({ date, guesses: nextGuesses, status: next });
    setStreak(markPlayedToday());
    if (next === "won") sfx.victory();
    else sfx.wrong();
  }

  function submitGuess() {
    if (!track || !date || status !== "playing" || !input.trim()) return;
    const value = input.trim();
    const nextGuesses = [...guesses, value];
    setGuesses(nextGuesses);
    setInput("");

    if (isCloseMatch(value, track.title)) {
      finish("won", nextGuesses);
      return;
    }
    sfx.wrong();
    setWrongFlash(true);
    setTimeout(() => setWrongFlash(false), 400);
    if (nextGuesses.length >= MAX_ATTEMPTS) {
      finish("lost", nextGuesses);
      return;
    }
    saveState({ date, guesses: nextGuesses, status: "playing" });
  }

  const resultGrid = useMemo(() => {
    const cells = guesses.map(() => "🟥");
    if (status === "won" && cells.length) cells[cells.length - 1] = "🟩";
    while (cells.length < MAX_ATTEMPTS) cells.push("⬜");
    return cells.join("");
  }, [guesses, status]);

  async function share() {
    if (!dayNumber) return;
    const scoreLine = status === "won" ? `${guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
    const text = `Devine du jour DailyRapFrance #${dayNumber} — ${scoreLine}\n${resultGrid}\ndailyrapfrance.best/devine`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* rien */
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-ink-faint text-sm font-mono">Chargement du titre du jour...</div>;
  }
  if (error || !track) {
    return <div className="text-center py-16 text-riseNeg text-sm">{error ?? "Titre du jour indisponible."}</div>;
  }

  const finished = status !== "playing";

  return (
    <div className="max-w-md mx-auto">
      <audio ref={audioRef} src={track.previewUrl} onTimeUpdate={onTimeUpdate} onEnded={() => setPlaying(false)} preload="none" />

      <div className="text-center mb-6">
        <p className="font-mono text-xs text-gold uppercase tracking-[0.2em] mb-1">Devine du jour #{dayNumber}</p>
        <p className="text-sm text-ink-faint">
          {finished ? "Nouveau titre demain à minuit." : `Écoute, devine le titre — ${attemptsLeft} essai${attemptsLeft > 1 ? "s" : ""} restant${attemptsLeft > 1 ? "s" : ""}.`}
        </p>
        {streak > 1 && (
          <p className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-gold/15 text-gold px-3 py-1 text-xs font-bold">
            🔥 {streak} jours d&apos;affilée
          </p>
        )}
      </div>

      {/* Lecteur */}
      <div className={`card p-6 flex flex-col items-center mb-5 ${wrongFlash ? "shake-wrong" : ""}`}>
        {finished && track.coverUrl ? (
          <img src={track.coverUrl} alt="" className="w-28 h-28 rounded-xl mb-4 object-cover" />
        ) : (
          <button
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Écouter"}
            className="w-20 h-20 rounded-full bg-gold hover:bg-glow text-white flex items-center justify-center mb-4 transition-colors press"
          >
            {playing ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-1" />}
          </button>
        )}
        {!finished && (
          <button onClick={togglePlay} className="text-xs font-mono text-ink-faint hover:text-ink mb-1">
            {playing ? "Pause" : `Écouter ${currentRevealSeconds}s`}
          </button>
        )}
        {finished && (
          <>
            <p className="font-display text-lg font-bold text-center">{track.title}</p>
            <p className="text-sm text-ink-faint">{track.artistName}</p>
          </>
        )}
      </div>

      {/* Grille de résultat — essais précédents */}
      {guesses.length > 0 && (
        <div className="space-y-1.5 mb-5">
          {guesses.map((g, i) => {
            const correct = isCloseMatch(g, track.title);
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                  correct ? "bg-[#3DDC84]/10 text-[#3DDC84]" : "bg-riseNeg/10 text-riseNeg"
                }`}
              >
                {correct ? <Check size={14} /> : <X size={14} />}
                <span className="truncate">{g}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Saisie ou résultat final */}
      {!finished ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitGuess();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Titre du morceau..."
            autoFocus
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-gold/50"
          />
          <button
            type="submit"
            className="bg-gold hover:bg-glow text-white rounded-full px-5 font-semibold text-sm transition-colors"
          >
            Valider
          </button>
        </form>
      ) : (
        <div className="text-center">
          <p className={`font-display text-xl font-bold mb-4 ${status === "won" ? "text-[#3DDC84]" : "text-riseNeg"}`}>
            {status === "won" ? `Trouvé en ${guesses.length}/${MAX_ATTEMPTS} !` : "Raté pour aujourd'hui"}
          </p>
          <button
            onClick={share}
            className="press inline-flex items-center gap-2 bg-gold hover:bg-glow text-white rounded-full px-6 py-3 font-semibold text-sm transition-colors"
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? "Copié !" : "Partager mon résultat"}
          </button>
          <p className="font-mono text-lg tracking-widest mt-4">{resultGrid}</p>
          <a
            href="/jouer"
            className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink mt-6 font-mono uppercase tracking-wide"
          >
            <RotateCcw size={12} /> Envie de plus ? Lance une vraie partie
          </a>
        </div>
      )}
    </div>
  );
}
