"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Play, Zap, RotateCcw, Users, User, Disc, MapPin, Cloud, Flame,
  Clock, Shuffle, Medal, Headphones, Check, Globe, LogIn, ChevronLeft, ChevronRight, SkipForward, Mic2,
} from "lucide-react";
import { checkGuess } from "@/lib/blindtest-match";
import { sfx } from "@/lib/sfx";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import Magnetic from "@/components/Magnetic";
import Confetti from "@/components/Confetti";
import ThemeCover from "@/components/ThemeCover";
import Row from "@/components/Row";
import BlindTestRoom from "@/components/BlindTestRoom";

type Track = {
  id: string;
  title: string;
  artistName: string;
  previewUrl: string;
  coverUrl: string | null;
  feats: string[];
};
type Mode = "solo" | "local" | "online";
type Phase = "setup" | "loading" | "playing" | "final";
type Player = { id: string; name: string; score: number; jokerUsed: boolean; timeJokerUsed: boolean };
type FieldKey = "title" | "artist" | "feat";

const ROUND_SECONDS = 25;
const POINTS: Record<FieldKey, number> = { title: 1, artist: 1, feat: 2 };

const THEME_OPTIONS = [
  { id: "mix", label: "Mix", text: "Toutes les époques mélangées", Icon: Shuffle, category: "Époques" },
  { id: "old", label: "À l'ancienne", text: "90s et 2000s", Icon: Clock, category: "Époques" },
  { id: "2010s", label: "Années 2010", text: "L'âge d'or du son cloud", Icon: Clock, category: "Époques" },
  { id: "recent", label: "Sons récents", text: "Ce qui tourne en ce moment", Icon: Clock, category: "Époques" },
  { id: "pop", label: "Pop / mainstream", text: "Les plus gros sons du moment", Icon: Flame, category: "Styles" },
  { id: "cloud", label: "Cloud rap", text: "Suikoden, Josman, Lomepal...", Icon: Cloud, category: "Styles" },
  { id: "lagui-sadek", label: "Lagui & Sadek", text: "Que des sons de ces deux-là", Icon: Mic2, category: "Styles" },
  { id: "93", label: "Rappeurs du 93", text: "Kaaris, Vald, Maes, Kalash Criminel...", Icon: MapPin, category: "Régions" },
  { id: "91", label: "Rappeurs du 91", text: "PNL, Niska, Koba LaD...", Icon: MapPin, category: "Régions" },
  { id: "92", label: "Rappeurs du 92", text: "Booba, SDM, Benash...", Icon: MapPin, category: "Régions" },
  { id: "77", label: "Rappeurs du 77", text: "Djadja & Dinaz, RK, Timal...", Icon: MapPin, category: "Régions" },
  { id: "78", label: "Rappeurs du 78", text: "La Fouine...", Icon: MapPin, category: "Régions" },
  { id: "13", label: "Marseille (13)", text: "JUL, SCH, Soprano, Alonzo...", Icon: MapPin, category: "Régions" },
  { id: "59", label: "Rappeurs du 59", text: "Gradur...", Icon: MapPin, category: "Régions" },
  { id: "idf", label: "Île-de-France", text: "Tout le rap francilien mélangé", Icon: MapPin, category: "Régions" },
] as const;

const THEME_CATEGORIES = ["Époques", "Styles", "Régions"] as const;

function buildQuery(themeId: string, count: number) {
  const params = new URLSearchParams();
  params.set("theme", themeId);
  params.set("count", String(count));
  return params;
}

export default function BlindTest() {
  const { user, loading: userLoading } = useUser();
  const searchParams = useSearchParams();
  const joinRoomCode = searchParams.get("room");

  // Setup — assistant en 3 étapes pour limiter le scroll
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2>(0);
  // Setup
  const [mode, setMode] = useState<Mode>(joinRoomCode ? "online" : "solo");
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
  const [solved, setSolved] = useState<Partial<Record<FieldKey, string>>>({}); // field -> playerId
  const [guess, setGuess] = useState<{ title: string; artist: string; feat: string }>({ title: "", artist: "", feat: "" });
  const [revealed, setRevealed] = useState(false);
  const [roundGain, setRoundGain] = useState<{ playerId: string; points: number; nonce: number } | null>(null);
  const gainCounter = useRef(0);
  const [wrongFlash, setWrongFlash] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineRef = useRef<number | null>(null); // horodatage de fin de manche — le décompte
  // se recalcule à chaque tick à partir de l'heure réelle, plutôt que de décrémenter un
  // compteur : ça évite qu'il se désynchronise ou paraisse "bloqué" si le navigateur retarde
  // une frame (ouverture du clavier virtuel, re-rendu lourd, etc.)

  const track = tracks[roundIndex];
  const applicableFields: FieldKey[] = track?.feats?.length ? ["title", "artist", "feat"] : ["title", "artist"];

  // Historique de la partie — un récap façon "Wrapped" à la fin. Refs à jour à chaque rendu
  // pour éviter que revealRound() (mémoïsé, dépendances limitées) capture une valeur périmée.
  const [roundHistory, setRoundHistory] = useState<{ track: Track; solved: Partial<Record<FieldKey, string>> }[]>([]);
  const trackRef = useRef<Track | undefined>(undefined);
  trackRef.current = track;
  const solvedRef = useRef<Partial<Record<FieldKey, string>>>({});
  solvedRef.current = solved;

  const clearTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    intervalRef.current = null;
    advanceTimeoutRef.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const revealRound = useCallback(() => {
    setRevealed(true);
    sfx.reveal();
    clearTimers();
    audioRef.current?.pause();
    if (trackRef.current) {
      setRoundHistory((prev) => [...prev, { track: trackRef.current!, solved: solvedRef.current }]);
    }
    advanceTimeoutRef.current = setTimeout(() => {
      setRoundIndex((i) => {
        const next = i + 1;
        if (next >= tracks.length) setPhase("final");
        return next;
      });
    }, 3200);
  }, [clearTimers, tracks.length]);

  const tick = useCallback(() => {
    if (deadlineRef.current == null) return;
    const remaining = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
    setTimeLeft(remaining);
    if (remaining <= 0) {
      sfx.wrong();
      revealRound();
      return;
    }
    if (remaining <= 6) sfx.tick();
  }, [revealRound]);

  function resetRoundState() {
    setStarted(false);
    setTimeLeft(ROUND_SECONDS);
    deadlineRef.current = null;
    setBuzzedBy(null);
    setLocked(new Set());
    setSolved({});
    setGuess({ title: "", artist: "", feat: "" });
    setRevealed(false);
    setRoundGain(null);
    setWrongFlash(false);
    clearTimers();
  }

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
      if (pool.length < 3) {
        setSetupError("Deezer n'a pas renvoyé assez de titres pour ce thème. Réessaie, ou choisis un autre thème.");
        setPhase("setup");
        return;
      }
      setTracks(pool);
      setRoundHistory([]);
      setPlayers(
        mode === "solo"
          ? [{ id: "solo", name: "Toi", score: 0, jokerUsed: false, timeJokerUsed: false }]
          : playerNames.filter((n) => n.trim()).map((n, i) => ({ id: `p${i}`, name: n.trim(), score: 0, jokerUsed: false, timeJokerUsed: false }))
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
    sfx.click();
    setStarted(true);
    audioRef.current?.play().catch(() => {});
    deadlineRef.current = Date.now() + ROUND_SECONDS * 1000;
    intervalRef.current = setInterval(tick, 1000);
  }

  function useJoker(playerId: string) {
    const player = players.find((p) => p.id === playerId);
    const audio = audioRef.current;
    if (!player || player.jokerUsed || !audio || !started || revealed || buzzedBy) return;
    sfx.joker();
    const dur = audio.duration;
    const jump = Number.isFinite(dur) ? Math.min(dur - 3, audio.currentTime + 9) : audio.currentTime + 9;
    audio.currentTime = Math.max(0, jump);
    audio.play().catch(() => {});
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, jokerUsed: true } : p)));
  }

  const TIME_JOKER_SECONDS = 15;

  // 2e joker — prolonge le temps de la manche pour finir de répondre. Une fois par joueur
  // et par partie, comme le premier.
  function useTimeJoker(playerId: string) {
    const player = players.find((p) => p.id === playerId);
    if (!player || player.timeJokerUsed || !started || revealed) return;
    sfx.joker();
    deadlineRef.current = (deadlineRef.current ?? Date.now()) + TIME_JOKER_SECONDS * 1000;
    setTimeLeft((t) => t + TIME_JOKER_SECONDS);
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, timeJokerUsed: true } : p)));
  }

  function awardPoints(playerId: string, points: number) {
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, score: p.score + points } : p)));
    gainCounter.current += 1;
    const nonce = gainCounter.current;
    setRoundGain({ playerId, points, nonce });
    setTimeout(() => setRoundGain((g) => (g?.nonce === nonce ? null : g)), 1200);
  }

  function checkFields(playerId: string, values: { title: string; artist: string; feat: string }) {
    if (!track) return 0;
    let gained = 0;
    const newlySolved: Partial<Record<FieldKey, string>> = {};

    if (!solved.title && values.title.trim() && isTitleMatch(values.title, track.title)) {
      newlySolved.title = playerId;
      gained += POINTS.title;
      sfx.correct();
    }
    if (!solved.artist && values.artist.trim() && isArtistMatch(values.artist, track.artistName)) {
      newlySolved.artist = playerId;
      gained += POINTS.artist;
      sfx.correct();
    }
    if (applicableFields.includes("feat") && !solved.feat && values.feat.trim() && track.feats.some((f) => isArtistMatch(values.feat, f))) {
      newlySolved.feat = playerId;
      gained += POINTS.feat;
      sfx.bonus();
    }

    if (gained > 0) {
      setSolved((prev) => ({ ...prev, ...newlySolved }));
      awardPoints(playerId, gained);
    }
    return gained;
  }

  function isTitleMatch(guessVal: string, title: string) {
    return checkGuess(guessVal, "", title);
  }
  function isArtistMatch(guessVal: string, name: string) {
    return checkGuess(guessVal, name, "");
  }

  // Local : buzz
  function handleBuzz(playerId: string) {
    if (!started || revealed || buzzedBy || locked.has(playerId)) return;
    sfx.buzz();
    setBuzzedBy(playerId);
    if (intervalRef.current) clearInterval(intervalRef.current);
    deadlineRef.current = null; // en pause — timeLeft garde sa dernière valeur affichée
  }

  function submitLocalGuess() {
    if (!buzzedBy || !track) return;
    const gained = checkFields(buzzedBy, guess);
    if (gained === 0) {
      sfx.wrong();
      const nextLocked = new Set(locked);
      nextLocked.add(buzzedBy);
      setLocked(nextLocked);
      setBuzzedBy(null);
      setGuess({ title: "", artist: "", feat: "" });
      if (nextLocked.size >= players.length) {
        revealRound();
        return;
      }
      deadlineRef.current = Date.now() + timeLeft * 1000;
      intervalRef.current = setInterval(tick, 1000);
      return;
    }
    // Points marqués : le useEffect sur `solved` déclenchera revealRound() tout seul si
    // c'était le dernier champ manquant — sinon on relance le chrono pour la suite.
    setBuzzedBy(null);
    setGuess({ title: "", artist: "", feat: "" });
    deadlineRef.current = Date.now() + timeLeft * 1000;
    intervalRef.current = setInterval(tick, 1000);
  }

  // Solo : formulaire toujours ouvert, champs résolus se verrouillent au fur et à mesure
  function submitSoloGuess() {
    if (!started || revealed || !track) return;
    const gained = checkFields("solo", guess);
    if (gained === 0) {
      sfx.wrong();
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 450);
      return;
    }
    setGuess({ title: "", artist: "", feat: "" });
  }

  useEffect(() => {
    if (started && !revealed && track && applicableFields.every((f) => solved[f])) {
      revealRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  // Sauvegarde du score solo — no-op silencieux si personne n'est connecté (géré côté route).
  const [scoreSaveStatus, setScoreSaveStatus] = useState<"idle" | "saved" | "guest">("idle");
  const [showConfetti, setShowConfetti] = useState(false);
  useEffect(() => {
    if (phase !== "final") return;
    sfx.victory();
    setShowConfetti(true);
    if (mode !== "solo") return;
    const solo = players[0];
    if (!solo) return;
    fetch("/api/blindtest/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: themeId, rounds: tracks.length, points: solo.score }),
    })
      .then((r) => r.json())
      .then((data) => setScoreSaveStatus(data.saved ? "saved" : "guest"))
      .catch(() => setScoreSaveStatus("guest"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function playAgain() {
    clearTimers();
    setPhase("setup");
    setWizardStep(0);
    setTracks([]);
    setPlayers([]);
    setRoundIndex(0);
    setRoundHistory([]);
    setScoreSaveStatus("idle");
    setShowConfetti(false);
    resetRoundState();
  }

  // ── Rendu ──────────────────────────────────────────────────────────────

  if (userLoading) {
    return <div className="h-64" aria-hidden="true" />;
  }

  if (!user) {
    return <SignInGate />;
  }

  if (mode === "online") {
    return <BlindTestRoom user={user} onExit={() => setMode("solo")} initialCode={joinRoomCode ?? undefined} />;
  }

  if (phase === "setup" || phase === "loading") {
    const steps = ["Mode", "Thème", "Réglages"];
    return (
      <div className="max-w-2xl mx-auto">
        {/* Petit disque décoratif — signe visuel "c'est un jeu" avant même de lancer une partie.
            Masqué sur mobile : l'espace vertical y est plus précieux, la page a déjà l'emblème
            de marque ailleurs sur le site. */}
        <div className="hidden sm:flex justify-center mb-4">
          <div className="vinyl-spin w-11 h-11 rounded-full bg-[radial-gradient(circle,_#1a1414_0%,_#1a1414_18%,_#2b2020_19%,_#2b2020_30%,_#1a1414_31%,_#1a1414_42%,_#2b2020_43%,_#2b2020_54%,_#1a1414_55%)] border border-white/10 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-gold flex items-center justify-center">
              <Disc size={8} className="text-white" />
            </div>
          </div>
        </div>

        {/* Fil d'ariane des étapes */}
        <div className="flex items-center justify-center gap-2 mb-3 sm:mb-5">
          {steps.map((label, i) => (
            <button
              key={label}
              onClick={() => setWizardStep(i as 0 | 1 | 2)}
              className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide py-2 px-1.5 -mx-1.5 transition-colors ${
                i === wizardStep ? "text-gold" : "text-ink-faint hover:text-ink-muted"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${i === wizardStep ? "bg-gold" : "bg-ink-faint/40"}`} />
              {label}
              {i < steps.length - 1 && <span className="text-ink-faint/30 ml-1">—</span>}
            </button>
          ))}
        </div>

        <div className="card p-5 sm:p-6 md:p-7 flex flex-col">
          {/* Étape 0 — Mode */}
          {wizardStep === 0 && (
            <div className="flex-1 space-y-2.5">
              {[
                { id: "solo" as Mode, label: "Solo", Icon: User, desc: "Teste tes connaissances à ton rythme." },
                { id: "local" as Mode, label: "Local", Icon: Users, desc: "Entre potes, sur le même écran, avec un buzzer." },
                { id: "online" as Mode, label: "Salon en ligne", Icon: Globe, desc: "Un code à partager, chacun sur son téléphone." },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    sfx.click();
                    setMode(m.id);
                    if (m.id === "online") return;
                    setWizardStep(1);
                  }}
                  className={`group w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 ${
                    mode === m.id
                      ? "border-gold bg-gold/10 shadow-[0_0_20px_rgba(240,0,28,0.22)]"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <div
                    className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                      mode === m.id ? "bg-gold text-white" : "bg-white/5 text-ink-muted group-hover:text-ink"
                    }`}
                  >
                    <m.Icon size={20} />
                  </div>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{m.label}</span>
                    <span className="block text-xs text-ink-faint mt-0.5">{m.desc}</span>
                  </span>
                </button>
              ))}

              {mode === "local" && (
                <div className="pt-2">
                  <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-2.5">Joueurs</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {playerNames.map((name, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={name}
                          onChange={(e) => setPlayerNames((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))}
                          placeholder={`Joueur ${i + 1}`}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gold/50"
                        />
                        {playerNames.length > 2 && (
                          <button
                            onClick={() => setPlayerNames((prev) => prev.filter((_, idx) => idx !== i))}
                            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-ink-faint hover:text-riseNeg hover:bg-riseNeg/10 transition-colors text-lg"
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
            </div>
          )}

          {/* Étape 1 — Thème, en rangées horizontales façon Netflix (une rangée par catégorie) */}
          {wizardStep === 1 && (
            <div className="flex-1 flex flex-col gap-5 -mt-1">
              {THEME_CATEGORIES.map((cat) => (
                <div key={cat}>
                  <p className="text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-2 px-0.5">{cat}</p>
                  <Row>
                    {THEME_OPTIONS.filter((t) => t.category === cat).map((t, i) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          sfx.click();
                          setThemeId(t.id);
                        }}
                        className="w-[92px] sm:w-[104px] shrink-0 snap-start text-left"
                      >
                        <ThemeCover Icon={t.Icon} label={t.label} index={i} active={themeId === t.id} />
                      </button>
                    ))}
                  </Row>
                </div>
              ))}
            </div>
          )}

          {/* Étape 2 — Réglages + barème + lancer */}
          {wizardStep === 2 && (
            <div className="flex-1">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Nombre de manches</p>
              <div className="flex gap-2 mb-6">
                {[10, 15, 20, 30].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      sfx.click();
                      setRoundCount(n);
                    }}
                    className={`rounded-full px-4 py-1.5 text-sm font-mono transition-all duration-200 ${
                      roundCount === n ? "bg-gold text-white shadow-[0_0_16px_rgba(240,0,28,0.35)]" : "glass text-ink-muted hover:text-ink"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <div className="glass rounded-xl p-4 text-xs text-ink-faint leading-relaxed mb-6">
                <span className="text-gold font-mono uppercase tracking-wide">Barème</span> — titre :{" "}
                <span className="text-ink">1 pt</span> · artiste : <span className="text-ink">1 pt</span> · featuring :{" "}
                <span className="text-gold">+2 pts</span>. Un <span className="text-ink">joker</span> par partie et
                par joueur pour réécouter un autre passage.
              </div>

              {setupError && <p className="text-sm text-riseNeg mb-4">{setupError}</p>}

              <Magnetic strength={0.15} className="block w-full">
                <button
                  onClick={startGame}
                  disabled={phase === "loading"}
                  className="cta-glow w-full bg-gold hover:bg-glow disabled:opacity-60 disabled:animate-none text-white rounded-full py-4 font-semibold text-base transition-colors flex items-center justify-center gap-2"
                >
                  {phase === "loading" ? "Chargement..." : "Lancer la partie"}
                  {phase !== "loading" && <Play size={18} />}
                </button>
              </Magnetic>
            </div>
          )}

          {/* Navigation entre étapes (mode "online" a déjà sa propre UI, retournée plus haut) —
              vrais boutons visibles et accessibles, pas de simples liens texte discrets. */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/8">
            <button
              onClick={() => setWizardStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2) : s))}
              disabled={wizardStep === 0}
              aria-label="Étape précédente"
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full glass text-sm font-medium text-ink-muted hover:text-ink hover:border-gold/30 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft size={16} /> Précédent
            </button>
            {wizardStep < 2 && (
              <button
                onClick={() => setWizardStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s))}
                aria-label="Étape suivante"
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full bg-gold hover:bg-glow text-white text-sm font-semibold transition-colors"
              >
                Suivant <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "final") {
    const ranked = [...players].sort((a, b) => b.score - a.score);
    return (
      <div className="max-w-xl mx-auto text-center">
        {showConfetti && <Confetti />}
        <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Terminé</p>
        {mode === "solo" ? (
          <h2 className="font-display text-4xl md:text-5xl font-semibold mb-10">{ranked[0]?.score ?? 0} pts</h2>
        ) : (
          <>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-10">Résultats</h2>
            <div className="flex items-end justify-center gap-3 mb-10">
              {[ranked[1], ranked[0], ranked[2]].map((p, i) =>
                p ? (
                  <div key={p.id} className={`flex flex-col items-center ${i === 1 ? "order-2" : i === 0 ? "order-1" : "order-3"}`}>
                    <Medal size={i === 1 ? 28 : 20} className={i === 1 ? "text-gold" : "text-ink-faint"} />
                    <div
                      className={`glass rounded-t-lg w-20 sm:w-24 flex flex-col items-center justify-end pb-3 mt-2 ${
                        i === 1 ? "h-28 border-gold/40" : i === 0 ? "h-20" : "h-14"
                      }`}
                    >
                      <p className="text-xs font-medium truncate px-1 max-w-full">{p.name}</p>
                      <p className="font-mono text-xs text-gold">{p.score}</p>
                    </div>
                  </div>
                ) : null
              )}
            </div>
            {ranked.length > 3 && (
              <div className="card divide-y divide-white/8 overflow-hidden mb-8 text-left">
                {ranked.slice(3).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-4 py-3 px-5">
                    <span className="font-mono text-sm text-ink-faint w-6">{i + 4}</span>
                    <span className="flex-1 text-sm font-medium">{p.name}</span>
                    <span className="font-mono text-sm text-gold">{p.score}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {mode === "solo" && (
          <p className="text-xs font-mono text-ink-faint mb-8">
            {scoreSaveStatus === "saved" && "Score enregistré dans ton classement."}
            {scoreSaveStatus === "guest" && "Connecte-toi pour sauvegarder ce score."}
          </p>
        )}

        {roundHistory.length > 0 && (
          <div className="mb-8 text-left">
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Récap de la partie</p>
            <div className="card divide-y divide-white/8 overflow-hidden max-h-96 overflow-y-auto">
              {roundHistory.map((r, i) => {
                const foundBy = [...new Set(Object.values(r.solved))];
                return (
                  <div key={r.track.id + i} className="flex items-center gap-3 py-3 px-4">
                    {r.track.coverUrl ? (
                      <img src={r.track.coverUrl} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-white/5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.track.title}</p>
                      <p className="text-xs text-ink-faint truncate">{r.track.artistName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      {foundBy.length === 0 ? (
                        <span className="text-[11px] font-mono text-ink-faint">personne</span>
                      ) : mode === "solo" ? (
                        <Check size={14} className="text-gold" />
                      ) : (
                        foundBy.map((pid) => (
                          <span key={pid} className="text-[11px] font-mono text-gold">
                            {players.find((p) => p.id === pid)?.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Magnetic>
            <button
              onClick={playAgain}
              className="inline-flex items-center gap-2 bg-gold hover:bg-glow text-white rounded-full px-6 py-3 font-medium transition-colors"
            >
              <RotateCcw size={16} />
              Rejouer
            </button>
          </Magnetic>
          {mode === "solo" && (
            <a
              href="/blindtest/classement"
              className="inline-flex items-center gap-2 glass rounded-full px-6 py-3 text-sm font-medium hover:border-gold/40 transition-colors"
            >
              Voir le classement
            </a>
          )}
        </div>
      </div>
    );
  }

  // phase === "playing"
  if (!track) return null;

  const activePlayer = mode === "local" ? players.find((p) => p.id === buzzedBy) : players[0];
  const soloPlayer = players[0];

  return (
    <div className="max-w-2xl mx-auto">
      <audio key={track.id} ref={audioRef} src={track.previewUrl} preload="auto" />

      <div className="flex items-center justify-between mb-6">
        <span className="font-mono text-xs text-ink-faint uppercase tracking-wide">
          Manche {roundIndex + 1} / {tracks.length}
        </span>
        {mode === "local" && (
          <div className="flex gap-3 font-mono text-xs text-ink-muted flex-wrap justify-end">
            {players.map((p) => (
              <span key={p.id}>
                {p.name} · <span className="text-gold">{p.score}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card p-8 text-center relative overflow-hidden min-h-[400px] flex flex-col justify-center transition-[height] duration-300">
        {revealed && <div className="brand-glow" aria-hidden="true" />}

        {roundGain && (
          <span
            key={roundGain.nonce}
            className="float-points absolute left-1/2 top-6 -translate-x-1/2 z-20 font-display text-2xl font-semibold text-gold pointer-events-none"
          >
            +{roundGain.points}
          </span>
        )}

        {!started ? (
          <Magnetic strength={0.2}>
            <button
              onClick={launchExtract}
              className="mx-auto flex items-center gap-3 bg-gold hover:bg-glow text-white rounded-full px-8 py-4 font-medium transition-colors"
            >
              <Play size={20} />
              Lancer l'extrait
            </button>
          </Magnetic>
        ) : !revealed ? (
          <>
            {/* Disque mystère qui tourne pendant l'écoute */}
            <div className="relative w-28 h-28 mx-auto mb-6">
              <div className="vinyl-spin absolute inset-0 rounded-full bg-[radial-gradient(circle,_#1a1414_0%,_#1a1414_18%,_#2b2020_19%,_#2b2020_30%,_#1a1414_31%,_#1a1414_42%,_#2b2020_43%,_#2b2020_54%,_#1a1414_55%)] border border-white/10 shadow-lg">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center">
                    <Disc size={16} className="text-white" />
                  </div>
                </div>
              </div>
            </div>

            <span className={`font-display text-3xl text-gold block mb-4 transition-colors ${timeLeft <= 5 ? "urgent-pulse" : ""}`}>
              {timeLeft}
            </span>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-4 max-w-xs mx-auto">
              <div
                className="h-full bg-gold transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / ROUND_SECONDS) * 100}%` }}
              />
            </div>

            {!buzzedBy && (
              <button
                type="button"
                onClick={revealRound}
                className="mb-6 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-ink-faint hover:text-ink glass rounded-full px-4 py-2 transition-colors"
              >
                <SkipForward size={13} />
                Personne ne trouve — passer
              </button>
            )}

            {mode === "local" ? (
              buzzedBy ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitLocalGuess();
                  }}
                  className="max-w-sm mx-auto space-y-2.5"
                >
                  <p className="text-sm text-ink-muted mb-2">
                    <span className="text-gold font-medium">{activePlayer?.name}</span> a buzzé
                  </p>
                  <input
                    autoFocus
                    value={guess.title}
                    onChange={(e) => setGuess((g) => ({ ...g, title: e.target.value }))}
                    placeholder="Titre (1 pt)"
                    disabled={!!solved.title}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50 disabled:opacity-40"
                  />
                  <input
                    value={guess.artist}
                    onChange={(e) => setGuess((g) => ({ ...g, artist: e.target.value }))}
                    placeholder="Artiste (1 pt)"
                    disabled={!!solved.artist}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50 disabled:opacity-40"
                  />
                  {applicableFields.includes("feat") && (
                    <input
                      value={guess.feat}
                      onChange={(e) => setGuess((g) => ({ ...g, feat: e.target.value }))}
                      placeholder="Featuring (+2 pts)"
                      disabled={!!solved.feat}
                      className="w-full bg-white/5 border border-gold/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/60 disabled:opacity-40"
                    />
                  )}
                  <button type="submit" className="w-full bg-gold hover:bg-glow text-white rounded-lg py-2.5 text-sm font-medium">
                    Valider
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
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
                  <div className="flex flex-wrap justify-center gap-2">
                    {players.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => useJoker(p.id)}
                        disabled={p.jokerUsed}
                        className="inline-flex items-center gap-1.5 text-xs font-mono glass rounded-full px-3 py-1.5 text-ink-faint hover:text-gold disabled:opacity-30 disabled:hover:text-ink-faint transition-colors"
                      >
                        <Headphones size={13} />
                        Joker {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSoloGuess();
                }}
                className={`max-w-sm mx-auto space-y-2.5 ${wrongFlash ? "shake-wrong" : ""}`}
              >
                <FieldRow
                  value={guess.title}
                  onChange={(v) => setGuess((g) => ({ ...g, title: v }))}
                  placeholder="Titre (1 pt)"
                  solved={!!solved.title}
                  wrongFlash={wrongFlash}
                />
                <FieldRow
                  value={guess.artist}
                  onChange={(v) => setGuess((g) => ({ ...g, artist: v }))}
                  placeholder="Artiste (1 pt)"
                  solved={!!solved.artist}
                  wrongFlash={wrongFlash}
                />
                {applicableFields.includes("feat") && (
                  <FieldRow
                    value={guess.feat}
                    onChange={(v) => setGuess((g) => ({ ...g, feat: v }))}
                    placeholder="Featuring (+2 pts)"
                    solved={!!solved.feat}
                    wrongFlash={wrongFlash}
                    gold
                  />
                )}
                {timeLeft <= 8 && !soloPlayer?.timeJokerUsed && (
                  <button
                    type="button"
                    onClick={() => useTimeJoker("solo")}
                    className="solved-pop w-full flex items-center justify-center gap-2 bg-gold/15 border border-gold/40 text-gold rounded-lg py-3 text-sm font-medium hover:bg-gold/25 transition-colors"
                  >
                    <Clock size={16} />
                    Joker temps — encore {TIME_JOKER_SECONDS}s pour répondre
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gold hover:bg-glow text-white rounded-lg py-3 text-sm font-medium min-h-[44px]"
                  >
                    Valider
                  </button>
                  <button
                    type="button"
                    onClick={() => useJoker("solo")}
                    disabled={soloPlayer?.jokerUsed}
                    aria-label="Joker : écouter un autre passage de l'extrait"
                    className="inline-flex items-center gap-1.5 text-xs font-mono glass rounded-lg px-4 min-h-[44px] disabled:opacity-30"
                  >
                    <Headphones size={14} />
                    Joker
                  </button>
                </div>
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
            {track.feats.length > 0 && (
              <p className="text-xs text-ink-faint mt-1">feat. {track.feats.join(", ")}</p>
            )}
            <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
              <ResultPill ok={!!solved.title} label="Titre" points={POINTS.title} />
              <ResultPill ok={!!solved.artist} label="Artiste" points={POINTS.artist} />
              {applicableFields.includes("feat") && <ResultPill ok={!!solved.feat} label="Feat" points={POINTS.feat} />}
            </div>
            {mode === "local" && Object.keys(solved).length > 0 && (
              <p className="mt-4 font-mono text-sm text-gold">
                {[...new Set(Object.values(solved))]
                  .map((id) => players.find((p) => p.id === id)?.name)
                  .filter(Boolean)
                  .join(", ")}{" "}
                marque{Object.values(solved).length > 1 ? "nt" : ""} !
              </p>
            )}
            {Object.keys(solved).length === 0 && <p className="mt-4 font-mono text-sm text-ink-faint">Personne n'a trouvé.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  value,
  onChange,
  placeholder,
  solved,
  wrongFlash,
  gold = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  solved: boolean;
  wrongFlash: boolean;
  gold?: boolean;
}) {
  if (solved) {
    return (
      <div className="solved-pop w-full bg-gold/10 border border-gold/30 rounded-lg px-3 py-2 text-sm text-gold flex items-center gap-2">
        <Check size={14} />
        {placeholder.replace(/\s*\(.+\)/, "")} trouvé
      </div>
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
        wrongFlash ? "border-riseNeg" : gold ? "border-gold/30 focus:border-gold/60" : "border-white/10 focus:border-gold/50"
      }`}
    />
  );
}

function ResultPill({ ok, label, points }: { ok: boolean; label: string; points: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-mono ${
        ok ? "bg-gold/15 text-gold" : "bg-white/5 text-ink-faint"
      }`}
    >
      {ok && <Check size={11} />}
      {label} {ok ? `+${points}` : ""}
    </span>
  );
}

// Verrou de connexion — il faut un compte pour jouer (scores, salons privés).
function SignInGate() {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/blindtest` },
    });
  }

  return (
    <div className="max-w-sm mx-auto card p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto mb-4">
        <LogIn size={20} />
      </div>
      <p className="font-display text-xl font-medium mb-2">Connecte-toi pour jouer</p>
      <p className="text-sm text-ink-muted mb-6">
        Ton compte sert à sauvegarder tes scores et à créer des salons privés entre potes.
      </p>
      <button
        onClick={signIn}
        className="w-full bg-gold hover:bg-glow text-white rounded-full py-3 text-sm font-medium transition-colors"
      >
        Continuer avec Google
      </button>
    </div>
  );
}
