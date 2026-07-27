"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Play, Zap, RotateCcw, Users, User, Disc, Clock,
  Medal, Headphones, Check, Globe, LogIn, ChevronLeft, ChevronRight, SkipForward,
  Sliders, Gamepad2, Maximize, Minimize, Flame, X,
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
import BrandLoader from "@/components/BrandLoader";
import { THEME_OPTIONS, THEME_CATEGORIES, PHOTO_THEME_IDS, getDailyTheme } from "@/lib/themes";

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

const DEFAULT_ROUND_SECONDS = 25;
const ROUND_TIME_OPTIONS = [15, 20, 25, 35, 45];
const POINTS: Record<FieldKey, number> = { title: 1, artist: 1, feat: 2 };

function buildQuery(themeId: string, count: number) {
  const params = new URLSearchParams();
  params.set("theme", themeId);
  params.set("count", String(count));
  return params;
}

export default function BlindTest() {
  const { user, loading: userLoading } = useUser();
  const [myUsername, setMyUsername] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    createClient()
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setMyUsername(data?.username ?? null));
  }, [user]);
  const searchParams = useSearchParams();
  const joinRoomCode = searchParams.get("room");
  const deepLinkTheme = searchParams.get("theme");

  // Setup — assistant en 3 étapes pour limiter le scroll
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2>(deepLinkTheme ? 1 : 0);
  // Setup
  const [mode, setMode] = useState<Mode>(joinRoomCode ? "online" : "solo");
  const [themeId, setThemeId] = useState<string>(
    deepLinkTheme && THEME_OPTIONS.some((t) => t.id === deepLinkTheme) ? deepLinkTheme : "mix"
  );
  const dailyTheme = useMemo(() => getDailyTheme(), []);
  const [themePhotos, setThemePhotos] = useState<Record<string, string | string[]>>({});

  // Photos d'artistes pour les pochettes de thème — un seul appel groupé au montage.
  useEffect(() => {
    fetch(`/api/blindtest/theme-art?themes=${PHOTO_THEME_IDS.join(",")}`)
      .then((r) => r.json())
      .then((data) => setThemePhotos(data.photos ?? {}))
      .catch(() => {});
  }, []);
  const [roundCount, setRoundCount] = useState(10);
  const [roundSeconds, setRoundSeconds] = useState(DEFAULT_ROUND_SECONDS);
  const [jokersEnabled, setJokersEnabled] = useState(true);
  const [playerNames, setPlayerNames] = useState<string[]>(["Joueur 1", "Joueur 2"]);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Partie
  const [phase, setPhase] = useState<Phase>("setup");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);

  // Round courant
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_ROUND_SECONDS);
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

  // Streak "sans faute" — combo de manches consécutives parfaitement trouvées, en solo
  // uniquement (le concept est ambigu à plusieurs). Un bonus de points tombe tous les 3 crans,
  // avec une petite explosion visuelle — le ressort classique qui donne envie d'enchaîner une
  // manche de plus plutôt que de s'arrêter.
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [streakBurst, setStreakBurst] = useState<number | null>(null);
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;

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
    if (modeRef.current === "solo" && trackRef.current) {
      const fields: FieldKey[] = trackRef.current.feats.length ? ["title", "artist", "feat"] : ["title", "artist"];
      const perfect = fields.every((f) => solvedRef.current[f]);
      setStreak((s) => {
        const next = perfect ? s + 1 : 0;
        setBestStreak((b) => Math.max(b, next));
        if (perfect && next > 0 && next % 3 === 0) {
          sfx.bonus();
          awardPoints("solo", 2);
          setStreakBurst(next);
          setTimeout(() => setStreakBurst((v) => (v === next ? null : v)), 1700);
        }
        return next;
      });
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
    setTimeLeft(roundSeconds);
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
    deadlineRef.current = Date.now() + roundSeconds * 1000;
    intervalRef.current = setInterval(tick, 1000);
  }

  function useJoker(playerId: string) {
    const player = players.find((p) => p.id === playerId);
    const audio = audioRef.current;
    if (!jokersEnabled || !player || player.jokerUsed || !audio || !started || revealed || buzzedBy) return;
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
    if (!jokersEnabled || !player || player.timeJokerUsed || !started || revealed) return;
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
    setStreak(0);
    setStreakBurst(null);
    setRoundIndex(0);
    setRoundHistory([]);
    setScoreSaveStatus("idle");
    setShowConfetti(false);
    resetRoundState();
  }

  const [isFullscreen, setIsFullscreen] = useState(false);
  // Le plein écran natif ne se déclenche pas de la même façon (voire pas du tout, sur iOS
  // Safari) d'un navigateur à l'autre. Ce bouton ne peut donc pas dépendre uniquement de l'API
  // Fullscreen pour donner un résultat visible : il force en plus, toujours, le mode immersif
  // maison (masquage du site autour + verrou de scroll) — qui, lui, marche partout.
  const [manualImmersive, setManualImmersive] = useState(false);
  const immersive = phase === "playing" || manualImmersive;

  useEffect(() => {
    function onChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  async function toggleFullscreen() {
    sfx.click();
    const goingFullscreen = !manualImmersive;
    setManualImmersive(goingFullscreen);
    try {
      if (!goingFullscreen) {
        if (document.fullscreenElement) await document.exitFullscreen();
      } else {
        const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      }
    } catch {
      // iOS Safari en particulier refuse le plein écran natif pour un élément quelconque (seul
      // <video> y a droit). On échoue silencieusement — le mode immersif maison ci-dessus a de
      // toute façon déjà pris effet, le bouton n'est donc jamais un bouton mort à l'usage.
    }
  }

  // Mode immersif — masque header/pied de page/texte éditorial (classe CSS sur <body>, voir
  // globals.css), verrouille le scroll d'arrière-plan (même technique que le tiroir de menu
  // mobile : position fixed + restauration du scrollY à la sortie) ET met en pause le scroll
  // fluide Lenis, qui sinon continue d'intercepter molette/tactile et de calculer son propre
  // défilement par-dessus un <body> figé — verrouiller le body seul ne suffisait pas.
  const scrollYRef = useRef(0);
  useEffect(() => {
    if (immersive) {
      scrollYRef.current = window.scrollY;
      document.body.classList.add("game-immersive", "game-scroll-lock");
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      window.__lenis?.stop();
    } else {
      document.body.classList.remove("game-immersive", "game-scroll-lock");
      const y = scrollYRef.current;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      if (y) window.scrollTo(0, y);
      window.__lenis?.start();
    }
    return () => {
      document.body.classList.remove("game-immersive", "game-scroll-lock");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.__lenis?.start();
    };
  }, [immersive]);

  // ── Rendu ──────────────────────────────────────────────────────────────

  if (userLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <BrandLoader size="md" />
      </div>
    );
  }

  if (!user) {
    return <SignInGate />;
  }

  if (mode === "online") {
    return <BlindTestRoom user={user} onExit={() => setMode("solo")} initialCode={joinRoomCode ?? undefined} />;
  }

  if (phase === "setup" || phase === "loading") {
    return (
      <div className="max-w-2xl mx-auto pb-24">
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

        {/* Barre de filtres façon Spotify — pilules pleines, pas un simple fil d'ariane texte */}
        <div className="flex items-center justify-center gap-2 mb-3 sm:mb-5 px-1">
          <div className="flex-1 min-w-0 flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide">
            {[
              { label: "Mode", Icon: Gamepad2 },
              { label: "Thème", Icon: Disc },
              { label: "Réglages", Icon: Sliders },
            ].map(({ label, Icon }, i) => (
              <button
                key={label}
                onClick={() => setWizardStep(i as 0 | 1 | 2)}
                className={`filter-pill ${i === wizardStep ? "is-active" : ""}`}
              >
                <Icon size={13} strokeWidth={2.3} />
                {label}
                {i < wizardStep && <Check size={12} strokeWidth={3} className="ml-0.5 opacity-70" />}
              </button>
            ))}
          </div>
          <button
            onClick={toggleFullscreen}
            aria-label={manualImmersive ? "Quitter le plein écran" : "Passer en plein écran"}
            title={manualImmersive ? "Quitter le plein écran" : "Plein écran — plus d'immersion"}
            className="tap-press shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full glass text-ink-muted hover:text-gold transition-colors"
          >
            {manualImmersive ? <Minimize size={14} className="shrink-0" /> : <Maximize size={14} className="shrink-0" />}
            <span className="text-[11px] font-mono uppercase tracking-wide">
              {manualImmersive ? "Réduire" : "Plein écran"}
            </span>
          </button>
        </div>

        <div className="card p-5 sm:p-6 md:p-7 flex flex-col">
          {phase === "loading" ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <BrandLoader label="Recherche des titres" size="lg" />
            </div>
          ) : (
            <>
          {/* Étape 0 — Mode */}
          {wizardStep === 0 && (
            <div className="flex-1 space-y-3">
              {[
                {
                  id: "solo" as Mode,
                  label: "Solo",
                  Icon: User,
                  desc: "Teste tes connaissances à ton rythme.",
                  tag: "1 joueur",
                  gradient: "from-[#7a0f0f] to-[#F0001C]",
                },
                {
                  id: "local" as Mode,
                  label: "Local",
                  Icon: Users,
                  desc: "Entre potes, sur le même écran, avec un buzzer.",
                  tag: "2-8 joueurs",
                  gradient: "from-[#5c0f5c] to-[#F0001C]",
                },
                {
                  id: "online" as Mode,
                  label: "Salon en ligne",
                  Icon: Globe,
                  desc: "Un code à partager, chacun sur son téléphone.",
                  tag: "Multi à distance",
                  gradient: "from-[#0f3a5c] to-[#F0001C]",
                },
              ].map((m) => {
                const isActive = mode === m.id;
                return (
                  <div key={m.id}>
                    <button
                      onClick={() => {
                        sfx.click();
                        setMode(m.id);
                        // On ne saute plus automatiquement à l'étape suivante : un tap sur
                        // une carte ne fait que la sélectionner (comme choisir un thème),
                        // c'est "Suivant" qui fait avancer — sinon impossible de voir/remplir
                        // les pseudos avant de quitter l'écran en mode Local. "Salon en ligne"
                        // reste à part : ce n'est pas une étape du wizard mais un tout autre
                        // écran (code à partager), donc il continue de s'ouvrir directement.
                      }}
                      className={`tap-press group relative w-full flex items-center gap-4 rounded-2xl p-4 text-left overflow-hidden border transition-[box-shadow,border-color] duration-200 ${
                        isActive
                          ? "border-gold shadow-[0_0_0_1px_rgba(240,0,28,0.4),0_10px_28px_-8px_rgba(240,0,28,0.55)]"
                          : "border-white/10 hover:border-white/25"
                      }`}
                    >
                      {/* Fond dégradé façon carte de match Tinder — discret au repos, plus présent sélectionné */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${m.gradient} transition-opacity duration-200 ${
                          isActive ? "opacity-25" : "opacity-0 group-hover:opacity-10"
                        }`}
                        aria-hidden="true"
                      />
                      <div
                        className={`icon-tile relative w-14 h-14 shrink-0 bg-gradient-to-br ${m.gradient} text-white transition-transform duration-200`}
                      >
                        <m.Icon size={24} strokeWidth={2} />
                      </div>
                      <span className="relative min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="block text-sm font-semibold">{m.label}</span>
                          <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint bg-white/5 rounded-full px-2 py-0.5">
                            {m.tag}
                          </span>
                        </span>
                        <span className="block text-xs text-ink-faint mt-1">{m.desc}</span>
                      </span>
                      <div
                        className={`relative w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                          isActive ? "bg-gold text-white" : "bg-white/5 text-ink-faint"
                        }`}
                      >
                        {isActive ? <Check size={14} strokeWidth={3} /> : <ChevronRight size={14} />}
                      </div>
                    </button>

                    {/* Éditeur de pseudos — replié directement sous la carte "Local" dès
                        qu'elle est sélectionnée, plutôt que relégué tout en bas de l'écran
                        après les 3 cartes (trop loin, sans lien visuel avec le choix fait). */}
                    {m.id === "local" && isActive && (
                      <div className="mt-2 rounded-xl border border-gold/20 bg-gold/[0.04] p-3.5 animate-[solved-pop_0.35s_cubic-bezier(0.34,1.56,0.64,1)]">
                        <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-2.5">Pseudos</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {playerNames.map((name, i) => (
                            <div key={i} className="flex gap-2">
                              <input
                                value={name}
                                onChange={(e) => setPlayerNames((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))}
                                placeholder={`Joueur ${i + 1}`}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50 min-h-[40px]"
                              />
                              {playerNames.length > 2 && (
                                <button
                                  onClick={() => setPlayerNames((prev) => prev.filter((_, idx) => idx !== i))}
                                  className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-ink-faint hover:text-riseNeg hover:bg-riseNeg/10 transition-colors text-lg"
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
                              className="text-xs font-mono text-gold hover:text-glow transition-colors py-1"
                            >
                              + Ajouter un joueur
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Étape 1 — Thème, en rangées horizontales façon Netflix (une rangée par catégorie) */}
          {wizardStep === 1 && (
            <div className="flex-1 flex flex-col gap-5 -mt-1">
              {/* Défi du jour — même thème imposé pour tout le monde aujourd'hui, change à
                  minuit. Une bonne raison de rouvrir le jeu chaque jour plutôt qu'un Mix
                  toujours identique. */}
              <button
                onClick={() => {
                  sfx.click();
                  setThemeId(dailyTheme.id);
                }}
                className={`tap-press group relative w-full flex items-center gap-4 rounded-2xl p-4 text-left overflow-hidden border transition-[box-shadow,border-color] duration-200 ${
                  themeId === dailyTheme.id
                    ? "border-gold shadow-[0_0_0_1px_rgba(240,0,28,0.4),0_10px_28px_-8px_rgba(240,0,28,0.55)]"
                    : "border-gold/30 hover:border-gold/50"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#3a0a0a] via-[#780101]/70 to-transparent opacity-70" aria-hidden="true" />
                <div className="icon-tile relative w-12 h-12 shrink-0 bg-gradient-to-br from-gold to-glow text-white">
                  <Flame size={20} strokeWidth={2} />
                </div>
                <span className="relative min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Défi du jour</span>
                  </span>
                  <span className="block text-sm font-semibold mt-0.5">{dailyTheme.label}</span>
                  <span className="block text-xs text-ink-faint mt-0.5">{dailyTheme.text}</span>
                </span>
                {themeId === dailyTheme.id && (
                  <div className="relative w-7 h-7 shrink-0 rounded-full bg-gold text-white flex items-center justify-center">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>

              {THEME_CATEGORIES.map((cat) => (
                <div key={cat}>
                  <p className="font-display text-base font-semibold mb-2.5 px-0.5">{cat}</p>
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
                        <ThemeCover Icon={t.Icon} label={t.label} index={i} active={themeId === t.id} photoUrl={themePhotos[t.id]} />
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
              <div className="flex gap-2 mb-6 flex-wrap">
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

              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Temps par manche</p>
              <div className="flex gap-2 mb-6 flex-wrap">
                {ROUND_TIME_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      sfx.click();
                      setRoundSeconds(n);
                    }}
                    className={`rounded-full px-4 py-1.5 text-sm font-mono transition-all duration-200 ${
                      roundSeconds === n ? "bg-gold text-white shadow-[0_0_16px_rgba(240,0,28,0.35)]" : "glass text-ink-muted hover:text-ink"
                    }`}
                  >
                    {n}s
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-4 glass rounded-xl p-4 mb-6">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Headphones size={14} className="text-gold shrink-0" />
                    Jokers
                  </span>
                  <span className="block text-xs text-ink-faint mt-0.5">
                    Réécouter un extrait, ou gagner du temps sur la fin du chrono.
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={jokersEnabled}
                  aria-label="Activer les jokers"
                  onClick={() => {
                    sfx.click();
                    setJokersEnabled((v) => !v);
                  }}
                  className={`tap-press relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
                    jokersEnabled ? "bg-gold" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      jokersEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="glass rounded-xl p-4 text-xs text-ink-faint leading-relaxed mb-6">
                <span className="text-gold font-mono uppercase tracking-wide">Barème</span> — titre :{" "}
                <span className="text-ink">1 pt</span> · artiste : <span className="text-ink">1 pt</span> · featuring :{" "}
                <span className="text-gold">+2 pts</span>.{" "}
                {jokersEnabled
                  ? "Un joker par partie et par joueur pour réécouter un autre passage, plus un joker temps en fin de chrono."
                  : "Jokers désactivés pour cette partie."}
              </div>

              {setupError && <p className="text-sm text-riseNeg mb-4">{setupError}</p>}
            </div>
          )}
          </>
          )}
        </div>

        {/* Barre d'action — fixe en bas du viewport, toujours accessible même sur un écran
            court ou une carte de réglages qui pousse le contenu vers le bas (avant, ces
            boutons finissaient hors champ, à faire défiler pour les atteindre). */}
        <div
          className="fixed bottom-0 inset-x-0 z-30 px-4 pt-4 pointer-events-none"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/90 to-transparent -z-10" aria-hidden="true" />
          <div className="max-w-2xl mx-auto flex items-center gap-3 glass-strong rounded-2xl p-2 pointer-events-auto">
            <button
              onClick={() => setWizardStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2) : s))}
              disabled={wizardStep === 0}
              aria-label="Étape précédente"
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full text-sm font-medium text-ink-muted hover:text-ink hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft size={16} /> Précédent
            </button>
            {wizardStep < 2 ? (
              <button
                onClick={() => setWizardStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s))}
                aria-label="Étape suivante"
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full bg-gold hover:bg-glow text-white text-sm font-semibold transition-colors"
              >
                Suivant <ChevronRight size={16} />
              </button>
            ) : (
              <Magnetic strength={0.15} className="flex-1 block">
                <button
                  onClick={startGame}
                  disabled={phase === "loading"}
                  className="cta-glow w-full bg-gold hover:bg-glow disabled:opacity-60 disabled:animate-none text-white rounded-full min-h-[44px] font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {phase === "loading" ? "Chargement..." : "Lancer la partie"}
                  {phase !== "loading" && <Play size={18} />}
                </button>
              </Magnetic>
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
          <>
            <h2 className="font-display text-4xl md:text-5xl font-semibold mb-3">{ranked[0]?.score ?? 0} pts</h2>
            {bestStreak >= 2 && (
              <p className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-gold bg-gold/10 border border-gold/30 rounded-full px-3 py-1 mb-10">
                <Flame size={12} className="fill-current" />
                Meilleur combo : {bestStreak} manches parfaites d'affilée
              </p>
            )}
            {bestStreak < 2 && <div className="mb-10" />}
          </>
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
            <>
              <a
                href="/blindtest/classement"
                className="inline-flex items-center gap-2 glass rounded-full px-6 py-3 text-sm font-medium hover:border-gold/40 transition-colors"
              >
                Voir le classement
              </a>
              {myUsername && (
                <a
                  href={`/profil/${myUsername}`}
                  className="inline-flex items-center gap-2 glass rounded-full px-6 py-3 text-sm font-medium hover:border-gold/40 transition-colors"
                >
                  Mon profil
                </a>
              )}
              <a
                href="/amis"
                className="inline-flex items-center gap-2 glass rounded-full px-6 py-3 text-sm font-medium hover:border-gold/40 transition-colors"
              >
                Défier un ami
              </a>
            </>
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
    <div className="max-w-2xl mx-auto pb-24">
      <audio key={track.id} ref={audioRef} src={track.previewUrl} preload="auto" />

      <div className="flex items-center justify-between mb-6 gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={playAgain}
            aria-label="Quitter la partie"
            title="Quitter la partie"
            className="tap-press w-8 h-8 flex items-center justify-center rounded-full glass text-ink-faint hover:text-riseNeg transition-colors"
          >
            <X size={15} />
          </button>
          <span className="font-mono text-xs text-ink-faint uppercase tracking-wide">
            Manche {roundIndex + 1} / {tracks.length}
          </span>
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-center flex-wrap gap-2">
          {mode === "solo" && streak >= 2 && (
            <span className="solved-pop inline-flex items-center gap-1 font-mono text-xs font-semibold text-gold bg-gold/10 border border-gold/30 rounded-full px-2.5 py-1">
              <Flame size={12} className="fill-current" />
              {streak}
            </span>
          )}
          {mode === "local" && (
            <div className="flex gap-3 font-mono text-xs text-ink-muted flex-wrap justify-center">
              {players.map((p) => (
                <span key={p.id}>
                  {p.name} · <span className="text-gold">{p.score}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={toggleFullscreen}
          aria-label={manualImmersive ? "Quitter le plein écran" : "Passer en plein écran"}
          title={manualImmersive ? "Quitter le plein écran" : "Plein écran — plus d'immersion"}
          className="tap-press shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full glass text-ink-muted hover:text-gold transition-colors"
        >
          {manualImmersive ? <Minimize size={13} className="shrink-0" /> : <Maximize size={13} className="shrink-0" />}
          <span className="text-[11px] font-mono uppercase tracking-wide">
            {manualImmersive ? "Réduire" : "Plein écran"}
          </span>
        </button>
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

        {streakBurst && (
          <div
            key={streakBurst}
            className="solved-pop absolute inset-x-0 top-6 z-20 flex items-center justify-center gap-2 pointer-events-none"
          >
            <span className="inline-flex items-center gap-1.5 bg-gold text-white font-display font-semibold text-sm rounded-full px-4 py-1.5 shadow-[0_4px_20px_rgba(240,0,28,0.5)]">
              <Flame size={15} className="fill-current" />
              Combo x{streakBurst} — +2 bonus
            </span>
          </div>
        )}

        {!started ? (
          <div className="flex flex-col items-center">
            <div className="vinyl-spin w-16 h-16 rounded-full bg-[radial-gradient(circle,_#1a1414_0%,_#1a1414_18%,_#2b2020_19%,_#2b2020_30%,_#1a1414_31%,_#1a1414_42%,_#2b2020_43%,_#2b2020_54%,_#1a1414_55%)] border border-white/10 shadow-lg flex items-center justify-center mb-5">
              <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                <Disc size={11} className="text-white" />
              </div>
            </div>
            <p className="font-mono text-xs text-gold uppercase tracking-[0.2em] mb-1">
              Manche {roundIndex + 1}
            </p>
            <p className="text-sm text-ink-faint mb-7">Prêt à reconnaître ce son ?</p>
            <Magnetic strength={0.25}>
              <button
                onClick={launchExtract}
                className="cta-glow tap-press mx-auto flex items-center gap-3 bg-gold hover:bg-glow text-white rounded-full px-10 py-5 font-semibold text-lg transition-colors"
              >
                <Play size={22} fill="currentColor" />
                Lancer l'extrait
              </button>
            </Magnetic>
          </div>
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
                style={{ width: `${(timeLeft / roundSeconds) * 100}%` }}
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
                  id="local-guess-form"
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
                  {jokersEnabled && (
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
                  )}
                </div>
              )
            ) : (
              <form
                id="solo-guess-form"
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

      {/* Barre de jeu — fixe en bas, Valider + Joker toujours à portée de pouce, jamais
          enterrés en bas d'un formulaire qu'il faudrait faire défiler pour atteindre. */}
      {started && !revealed && (mode === "solo" || (mode === "local" && buzzedBy)) && (
        <div
          className="fixed bottom-0 inset-x-0 z-30 px-4 pt-4 pointer-events-none"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/90 to-transparent -z-10" aria-hidden="true" />
          <div className="max-w-2xl mx-auto pointer-events-auto space-y-2">
            {jokersEnabled && timeLeft <= 8 && timeLeft > 0 && (
              (mode === "solo" && !soloPlayer?.timeJokerUsed) ||
              (mode === "local" && buzzedBy && !activePlayer?.timeJokerUsed)
            ) && (
              <button
                type="button"
                onClick={() => useTimeJoker(mode === "solo" ? "solo" : buzzedBy!)}
                className="urgent-pulse-soft tap-press w-full flex items-center justify-center gap-2 bg-gold text-white rounded-2xl py-3 text-sm font-semibold shadow-[0_4px_20px_rgba(240,0,28,0.45)] transition-colors"
              >
                <Clock size={16} />
                Joker temps — +{TIME_JOKER_SECONDS}s pour répondre
              </button>
            )}
            <div className="flex items-center gap-3 glass-strong rounded-2xl p-2">
              {mode === "solo" && (
                <>
                  {jokersEnabled && (
                    <button
                      type="button"
                      onClick={() => useJoker("solo")}
                      disabled={soloPlayer?.jokerUsed}
                      aria-label="Joker : écouter un autre passage de l'extrait"
                      className="tap-press shrink-0 flex items-center gap-1.5 text-xs font-mono rounded-full px-4 min-h-[48px] text-ink-muted hover:text-gold hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <Headphones size={15} />
                      Joker
                    </button>
                  )}
                  <button
                    type="submit"
                    form="solo-guess-form"
                    className="tap-press cta-glow flex-1 bg-gold hover:bg-glow text-white rounded-full min-h-[48px] font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={17} strokeWidth={3} />
                    Valider
                  </button>
                </>
              )}
              {mode === "local" && buzzedBy && (
                <button
                  type="submit"
                  form="local-guess-form"
                  className="tap-press cta-glow flex-1 bg-gold hover:bg-glow text-white rounded-full min-h-[48px] font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={17} strokeWidth={3} />
                  Valider — {activePlayer?.name}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
