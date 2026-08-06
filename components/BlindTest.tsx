"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import {
  Play, Zap, RotateCcw, Users, User, Disc, Clock,
  Check, LogIn, ChevronLeft, ChevronRight, SkipForward,
  Sliders, Gamepad2, Maximize, Minimize, X, VolumeX, Volume2, Lightbulb, Target,
  ListChecks, Keyboard, SpellCheck, Timer, Hash, PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { checkGuess } from "@/lib/blindtest-match";
import { sfx } from "@/lib/sfx";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import { oauthCallbackUrl } from "@/lib/authRedirect";
import { speedBonus } from "@/lib/scoring";
import { qcmStageOrder, qcmStageOptions, qcmIsCorrect, qcmCorrectLabel, QCM_STAGE_PROMPTS } from "@/lib/qcmStages";
import EmailAuthForm from "@/components/EmailAuthForm";
import Magnetic from "@/components/Magnetic";
import Confetti from "@/components/Confetti";
import ThemePicker from "@/components/ThemePicker";
import { DRMark3D } from "@/components/BlindTestLogo";
import BlindTestRoom from "@/components/BlindTestRoom";
import BrandLoader from "@/components/BrandLoader";
import ShareScoreCard from "@/components/ShareScoreCard";
import ShareGame from "@/components/ShareGame";
import { GameTabBarContent } from "@/components/GameTabBar";
import { THEME_OPTIONS, getDailyTheme } from "@/lib/themes";
import BorderMagicButton from "@/components/ui/BorderMagicButton";

// Icône "salon" harmonisée avec la page d'accueil (Untitled UI) — remplace Globe (lucide)
// qui donnait un symbole différent ("planète") de celui utilisé ailleurs pour le même
// concept. Voir le même correctif dans app/page.tsx.
// Icône dédiée "salon en ligne" (réseau/distance) — Local (même écran) et Salon en ligne
// (à distance) utilisaient jusqu'ici tous les deux une icône "personnes" quasi identique
// (Users / Users01), impossible à distinguer d'un coup d'œil sur le même écran. Ici, un
// petit adaptateur pour donner à l'icône Iconify le même gabarit de props que les icônes
// Lucide (size/strokeWidth) utilisées partout ailleurs dans ce tableau de modes — même
// icône que la tuile "Salon privé" du hub /jouer, pour rester cohérent entre les pages.
function RemoteSalonIconBase({ size = 24, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return <Icon icon="game-icons:wifi-router" width={size} height={size} className={className} />;
}
const RemoteSalonIcon = RemoteSalonIconBase as unknown as LucideIcon;

type Track = {
  id: string;
  title: string;
  artistName: string;
  previewUrl: string;
  coverUrl: string | null;
  feats: string[];
};
type Mode = "solo" | "local" | "online" | "party";
type Phase = "setup" | "loading" | "playing" | "final";
type Player = { id: string; name: string; score: number; jokersLeft: number; timeJokerUsed: boolean };
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
  const deepLinkMode = searchParams.get("mode");

  const [wizardStep, setWizardStep] = useState<0 | 1 | 2>(deepLinkTheme ? 1 : 0);
  const [mode, setMode] = useState<Mode | null>(
    joinRoomCode ? "online" : deepLinkMode === "online" || deepLinkMode === "local" || deepLinkMode === "solo" || deepLinkMode === "party" ? deepLinkMode : null
  );
  const [themeId, setThemeId] = useState<string>(
    deepLinkTheme && THEME_OPTIONS.some((t) => t.id === deepLinkTheme) ? deepLinkTheme : "mix"
  );
  const dailyTheme = useMemo(() => getDailyTheme(), []);
  const [roundCount, setRoundCount] = useState(10);
  const [roundSeconds, setRoundSeconds] = useState(DEFAULT_ROUND_SECONDS);
  const [jokerCount, setJokerCount] = useState(1);
  const jokersEnabled = jokerCount > 0;
  const [answerMode, setAnswerMode] = useState<"text" | "qcm" | null>(null);
  const [strictMode, setStrictMode] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [trackVolume, setTrackVolume] = useState(1);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  // Lancement auto du son — désactivé par défaut (comportement historique inchangé).
  // Une fois activé, l'extrait démarre tout seul à chaque manche à partir de la 2e — la
  // toute première manche de la partie demande encore un clic (contrainte navigateur :
  // aucun <audio>.play() programmatique n'est autorisé avant une interaction utilisateur).
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const audioUnlockedRef = useRef(false);
  const [playerNames, setPlayerNames] = useState<string[]>(["Joueur 1", "Joueur 2"]);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("setup");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);

  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_ROUND_SECONDS);
  const [buzzedBy, setBuzzedBy] = useState<string | null>(null);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState<Partial<Record<FieldKey, string>>>({});
  const [guess, setGuess] = useState<{ title: string; artist: string; feat: string }>({ title: "", artist: "", feat: "" });
  const [revealed, setRevealed] = useState(false);
  const [roundGain, setRoundGain] = useState<{ playerId: string; points: number; nonce: number } | null>(null);
  const gainCounter = useRef(0);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [qcmLockedFor, setQcmLockedFor] = useState<string | null>(null);
  const extractStartedAtRef = useRef<number | null>(null);
  const [bonusFlash, setBonusFlash] = useState<number | null>(null);
  const [qcmWrongId, setQcmWrongId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineRef = useRef<number | null>(null);

  const track = tracks[roundIndex];
  const isSingleArtistTheme = themeId.startsWith("artist-");
  const baseFields: FieldKey[] = isSingleArtistTheme ? ["title"] : ["title", "artist"];
  const applicableFields: FieldKey[] = track?.feats?.length ? [...baseFields, "feat"] : baseFields;

  const [roundHistory, setRoundHistory] = useState<{ track: Track; solved: Partial<Record<FieldKey, string>> }[]>([]);
  const trackRef = useRef<Track | undefined>(undefined);
  const singleArtistRef = useRef(false);
  singleArtistRef.current = themeId.startsWith("artist-");
  trackRef.current = track;
  const solvedRef = useRef<Partial<Record<FieldKey, string>>>({});
  solvedRef.current = solved;

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

  const blurAndRealign = useCallback(() => {
    const ae = document.activeElement as HTMLElement | null;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) {
      ae.blur();
    }
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    });
    setTimeout(() => {
      window.scrollTo(0, 0);
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    }, 350);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const revealRound = useCallback(() => {
    blurAndRealign();
    setRevealed(true);
    sfx.reveal();
    clearTimers();
    audioRef.current?.pause();
    if (trackRef.current) {
      setRoundHistory((prev) => [...prev, { track: trackRef.current!, solved: solvedRef.current }]);
    }
    if (modeRef.current === "solo" && trackRef.current) {
      const base: FieldKey[] = singleArtistRef.current ? ["title"] : ["title", "artist"];
      const fields: FieldKey[] = trackRef.current.feats.length ? [...base, "feat"] : base;
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
    // Durée d'affichage du résultat avant la manche suivante — 3.8s (au lieu de 3.2s),
    // pour laisser le temps de lire le titre/artiste révélés sans que ça paraisse "flash".
    advanceTimeoutRef.current = setTimeout(() => {
      setRoundIndex((i) => {
        const next = i + 1;
        if (next >= tracks.length) setPhase("final");
        return next;
      });
    }, 3800);
  }, [blurAndRealign, clearTimers, tracks.length]);

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
    blurAndRealign();
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
    setAudioError(false);
    setQcmLockedFor(null);
    setQcmWrongId(null);
    clearTimers();
  }

  useEffect(() => {
    if (phase === "playing") {
      resetRoundState();
      // Lancement auto — uniquement si l'audio a déjà été déverrouillé une première fois
      // dans cette session (premier clic manuel sur "Lancer l'extrait"). Petit délai pour
      // laisser le <audio> (remonté via key={track.id}) être prêt après resetRoundState().
      if (autoPlayEnabled && audioUnlockedRef.current) {
        const t = setTimeout(() => launchExtract(), 150);
        return () => clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, phase]);

  async function maintenanceMessage(): Promise<string | null> {
    try {
      const { data } = await createClient().from("site_settings").select("value").eq("key", "maintenance").maybeSingle();
      const v = data?.value as { enabled?: boolean; message?: string } | undefined;
      return v?.enabled ? (v.message?.trim() || "Le blind test revient dans quelques minutes.") : null;
    } catch {
      return null;
    }
  }

  async function startGame() {
    setSetupError(null);
    const maint = await maintenanceMessage();
    if (maint) {
      setSetupError(`🔧 ${maint}`);
      return;
    }
    if (!mode) {
      setSetupError("Choisis un mode — Solo, Local ou Salon en ligne.");
      setWizardStep(0);
      return;
    }
    if (!answerMode) {
      setSetupError("Choisis un mode de réponse — Facile (QCM) ou Difficile (écrire) — pour lancer la partie.");
      return;
    }
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
      setPreviewOverride({});
      autoRecoveredRef.current.clear();
      setRoundHistory([]);
      setPlayers(
        mode === "solo"
          ? [{ id: "solo", name: "Toi", score: 0, jokersLeft: jokerCount, timeJokerUsed: false }]
          : playerNames.filter((n) => n.trim()).map((n, i) => ({ id: `p${i}`, name: n.trim(), score: 0, jokersLeft: jokerCount, timeJokerUsed: false }))
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
    audioUnlockedRef.current = true;
    extractStartedAtRef.current = Date.now();
    setAudioError(false);
    audioRef.current?.play().catch(() => void recoverAudio(true));
    deadlineRef.current = Date.now() + roundSeconds * 1000;
    intervalRef.current = setInterval(tick, 1000);
  }

  const [previewOverride, setPreviewOverride] = useState<Record<string, string>>({});
  const autoRecoveredRef = useRef<Set<string>>(new Set());

  const recoverAudio = useCallback(async (auto: boolean) => {
    const t = trackRef.current;
    if (!t) {
      setAudioError(true);
      return;
    }
    if (auto) {
      if (autoRecoveredRef.current.has(t.id)) {
        setAudioError(true);
        return;
      }
      autoRecoveredRef.current.add(t.id);
    }
    try {
      const res = await fetch(`/api/blindtest/preview?id=${encodeURIComponent(t.id)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("preview refresh failed");
      const data = (await res.json()) as { previewUrl?: string };
      if (data.previewUrl) {
        setPreviewOverride((prev) => ({ ...prev, [t.id]: data.previewUrl! }));
      }
    } catch {
      // On tente quand même une relecture de la source actuelle (panne réseau transitoire).
    }
    setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.load();
      audio
        .play()
        .then(() => setAudioError(false))
        .catch(() => setAudioError(true));
    }, 60);
  }, []);

  function retryAudio() {
    sfx.click();
    setAudioError(false);
    void recoverAudio(false);
  }

  function useJoker(playerId: string) {
    const player = players.find((p) => p.id === playerId);
    const audio = audioRef.current;
    if (!jokersEnabled || !player || player.jokersLeft <= 0 || !audio || !started || revealed || buzzedBy) return;
    sfx.joker();
    const dur = audio.duration;
    const jump = Number.isFinite(dur) ? Math.min(dur - 3, audio.currentTime + 9) : audio.currentTime + 9;
    audio.currentTime = Math.max(0, jump);
    audio.play().catch(() => {});
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, jokersLeft: p.jokersLeft - 1 } : p)));
  }

  const TIME_JOKER_SECONDS = 15;

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

  // Vérifie les champs saisis contre le morceau courant.
  //
  // Correctif : l'artiste principal et les featurings sont désormais acceptés dans N'IMPORTE
  // LEQUEL des deux champs "Artiste" / "Featuring" — avant, taper le nom d'un featuring dans
  // le champ "Artiste" (ou l'inverse) était compté faux, alors que la personne avait
  // reconnu une voix sur le morceau, ce qui est exactement le but du jeu. Le champ
  // effectivement crédité (et donc les points, 1 ou 2) suit qui est réellement trouvé,
  // pas la case où c'est tapé.
  function checkFields(playerId: string, values: { title: string; artist: string; feat: string }) {
    if (!track) return 0;
    let gained = 0;
    const newlySolved: Partial<Record<FieldKey, string>> = {};

    if (!solved.title && values.title.trim() && isTitleMatch(values.title, track.title)) {
      newlySolved.title = playerId;
      gained += POINTS.title;
      sfx.correct();
    }

    const canArtist = applicableFields.includes("artist") && !solved.artist;
    const canFeat = applicableFields.includes("feat") && !solved.feat;

    if (canArtist && values.artist.trim()) {
      if (isArtistMatch(values.artist, track.artistName)) {
        newlySolved.artist = playerId;
        gained += POINTS.artist;
        sfx.correct();
      } else if (canFeat && !newlySolved.feat && track.feats.some((f) => isArtistMatch(values.artist, f))) {
        // Un featuring tapé dans la case "Artiste" — on le crédite quand même, sur le bon champ.
        newlySolved.feat = playerId;
        gained += POINTS.feat;
        sfx.bonus();
      }
    }

    if (canFeat && !newlySolved.feat && values.feat.trim()) {
      if (track.feats.some((f) => isArtistMatch(values.feat, f))) {
        newlySolved.feat = playerId;
        gained += POINTS.feat;
        sfx.bonus();
      } else if (canArtist && !newlySolved.artist && isArtistMatch(values.feat, track.artistName)) {
        // Et inversement : l'artiste principal tapé dans la case "Featuring".
        newlySolved.artist = playerId;
        gained += POINTS.artist;
        sfx.correct();
      }
    }

    if (gained > 0) {
      const startedAt = extractStartedAtRef.current;
      if (startedAt) {
        const elapsed = (Date.now() - startedAt) / 1000;
        const bonus = speedBonus(elapsed) * Object.keys(newlySolved).length;
        if (bonus > 0) {
          gained += bonus;
          setBonusFlash(bonus);
          setTimeout(() => setBonusFlash(null), 1400);
        }
      }
      setSolved((prev) => ({ ...prev, ...newlySolved }));
      awardPoints(playerId, gained);
    }
    return gained;
  }

  const qcmStages = useMemo(
    () => (track && answerMode === "qcm" ? qcmStageOrder(applicableFields) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [track?.id, answerMode, applicableFields.join(",")]
  );
  const currentQcmField = qcmStages.find((f) => !solved[f]) ?? null;
  const qcmOptions = useMemo(() => {
    if (!track || answerMode !== "qcm" || !currentQcmField) return [];
    return qcmStageOptions(currentQcmField, track, tracks.filter((t) => t.id !== track.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, answerMode, currentQcmField]);

  function submitQcmChoice(playerId: string, chosenLabel: string) {
    if (!track || qcmLockedFor || !currentQcmField) return;
    if (qcmIsCorrect(currentQcmField, track, chosenLabel)) {
      const values = { title: "", artist: "", feat: "" };
      values[currentQcmField] = qcmCorrectLabel(currentQcmField, track);
      checkFields(playerId, values);
      return;
    }
    sfx.wrong();
    setQcmWrongId(chosenLabel);
    setTimeout(() => setQcmWrongId(null), 450);
    setQcmLockedFor(playerId);
    if (mode === "solo") {
      revealRound();
      return;
    }
    const nextLocked = new Set(locked);
    nextLocked.add(playerId);
    setLocked(nextLocked);
    setBuzzedBy(null);
    if (nextLocked.size >= players.length) {
      revealRound();
      return;
    }
    deadlineRef.current = Date.now() + timeLeft * 1000;
    intervalRef.current = setInterval(tick, 1000);
  }

  function retrySingleTrack(track: Track) {
    sfx.click();
    setMode("solo");
    setAnswerMode((prev) => prev ?? "text");
    setTracks([track]);
    setPreviewOverride({});
    autoRecoveredRef.current.clear();
    setRoundHistory([]);
    setPlayers([{ id: "solo", name: "Toi", score: 0, jokersLeft: jokerCount, timeJokerUsed: false }]);
    setRoundIndex(0);
    setPhase("playing");
  }

  function isTitleMatch(guessVal: string, title: string) {
    return checkGuess(guessVal, "", title, strictMode);
  }
  function isArtistMatch(guessVal: string, name: string) {
    return checkGuess(guessVal, name, "", strictMode);
  }

  function handleBuzz(playerId: string) {
    if (!started || revealed || buzzedBy || locked.has(playerId)) return;
    sfx.buzz();
    setBuzzedBy(playerId);
    if (intervalRef.current) clearInterval(intervalRef.current);
    deadlineRef.current = null;
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
    setBuzzedBy(null);
    setGuess({ title: "", artist: "", feat: "" });
    deadlineRef.current = Date.now() + timeLeft * 1000;
    intervalRef.current = setInterval(tick, 1000);
  }

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

  const [scoreSaveStatus, setScoreSaveStatus] = useState<"idle" | "saved" | "guest">("idle");
  const [topPercent, setTopPercent] = useState<number | null>(null);
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
      .then((data) => {
        setScoreSaveStatus(data.saved ? "saved" : "guest");
        setTopPercent(typeof data.topPercent === "number" ? data.topPercent : null);
      })
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
    setTopPercent(null);
    setShowConfetti(false);
    resetRoundState();
  }

  const [isFullscreen, setIsFullscreen] = useState(false);
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
      // iOS Safari refuse le plein écran natif — échec silencieux, le mode immersif maison a
      // déjà pris effet.
    }
  }

  useEffect(() => {
    document.body.classList.toggle("game-immersive", immersive);
    return () => {
      document.body.classList.remove("game-immersive");
    };
  }, [immersive]);

  const scrollYRef = useRef(0);
  useEffect(() => {
    const locked = phase === "playing";

    const resetGhostScroll = () => {
      const ae = document.activeElement as HTMLElement | null;
      const typing = !!ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
      if (!typing) {
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
        });
      }
    };
    const onFocusOut = () => {
      setTimeout(resetGhostScroll, 60);
    };

    if (locked) {
      scrollYRef.current = window.scrollY;
      document.body.classList.add("game-scroll-lock");
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      window.__lenis?.stop();
      window.addEventListener("focusout", onFocusOut);
      window.visualViewport?.addEventListener("resize", resetGhostScroll);
    } else {
      document.body.classList.remove("game-scroll-lock");
      const y = scrollYRef.current;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      if (y) window.scrollTo(0, y);
      window.__lenis?.start();
      window.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", resetGhostScroll);
    }
    return () => {
      window.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", resetGhostScroll);
      document.body.classList.remove("game-scroll-lock");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.__lenis?.start();
    };
  }, [phase]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = trackVolume;
  }, [trackVolume, track?.id]);

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

  if (mode === "online" || mode === "party") {
    return (
      <BlindTestRoom
        user={user}
        onExit={() => setMode(null)}
        initialCode={joinRoomCode ?? undefined}
        party={mode === "party"}
      />
    );
  }

  if (phase === "setup" || phase === "loading") {
    return (
      <div className="max-w-2xl mx-auto pt-6 sm:pt-8 pb-28 blindtest-shell">
        <div className="flex items-center justify-center gap-2 mb-3 sm:mb-5 px-1 flex-wrap">
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

        <div className="px-0.5 sm:px-1 flex flex-col">
          {phase === "loading" ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <BrandLoader label="Recherche des titres" size="lg" />
            </div>
          ) : (
            <>
          {wizardStep === 0 && (
            <div
              className={`flex-1 space-y-3 rounded-2xl transition-shadow ${
                setupError && !mode ? "ring-2 ring-riseNeg/60 shake-wrong" : ""
              }`}
            >
              {!mode && (
                <div className="px-0.5 pb-1">
                  <h2 className="font-display text-2xl font-semibold leading-tight flex items-center gap-2.5">
                    Choisis ton mode de jeu
                    <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-60" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold" />
                    </span>
                  </h2>
                  <p className="text-sm text-ink-faint mt-1.5 leading-snug">
                    Solo, entre potes ou en soirée — tape une carte pour commencer.
                  </p>
                </div>
              )}
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
                  tag: "2 à 8 joueurs",
                  gradient: "from-[#8a1216] to-[#FF3B4E]",
                },
                {
                  id: "online" as Mode,
                  label: "Salon en ligne",
                  Icon: RemoteSalonIcon,
                  desc: "Un code à partager, chacun sur son téléphone.",
                  tag: "Multi à distance",
                  gradient: "from-[#3a0505] to-[#7a0f0f]",
                },
                {
                  id: "party" as Mode,
                  label: "Soirée",
                  Icon: PartyPopper,
                  desc: "Écran partagé sur la TV, gages pour le dernier, chacun joue sur son tel.",
                  tag: "2 à 8 joueurs + TV",
                  gradient: "from-[#F0001C] to-[#FF6B3B]",
                  badge: "Nouveau",
                },
              ].map((m: { id: Mode; label: string; Icon: typeof User; desc: string; tag: string; gradient: string; badge?: string }) => {
                const isActive = mode === m.id;
                return (
                  <div key={m.id}>
                    <button
                      onClick={() => {
                        sfx.click();
                        setMode(m.id);
                        setSetupError(null);
                      }}
                      className={`tap-press group relative w-full flex items-center gap-4 rounded-2xl p-4 text-left overflow-hidden border transition-[box-shadow,border-color] duration-200 ${
                        isActive
                          ? "border-gold shadow-[0_0_0_1px_rgba(240,0,28,0.4),0_10px_28px_-8px_rgba(240,0,28,0.55)]"
                          : "border-white/10 hover:border-white/25"
                      }`}
                    >
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
                        <span className="text-base font-semibold flex items-center gap-2">
                          {m.label}
                          {m.badge && (
                            <span className="inline-flex items-center rounded-full bg-gold text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide animate-pulse">
                              {m.badge}
                            </span>
                          )}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 mt-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                            isActive ? "bg-gold text-white" : "bg-gold/15 text-gold"
                          }`}
                        >
                          <m.Icon size={11} strokeWidth={2.5} />
                          {m.tag}
                        </span>
                        <span className="block text-xs text-ink-faint mt-1.5 leading-snug">{m.desc}</span>
                      </span>
                      <div
                        className={`relative w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                          isActive ? "bg-gold text-white" : "bg-white/5 text-ink-faint"
                        }`}
                      >
                        {isActive ? <Check size={14} strokeWidth={3} /> : <ChevronRight size={14} />}
                      </div>
                    </button>

                    {m.id === "local" && isActive && (
                      <div className="mt-2 rounded-xl border border-gold/20 bg-gold/[0.04] p-3.5 animate-[solved-pop_0.35s_cubic-bezier(0.34,1.56,0.64,1)]">
                        <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-2.5">Pseudos</p>
                        <div data-lenis-prevent className="space-y-2 max-h-40 overflow-y-auto pr-1">
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

          {wizardStep === 1 && (
            <ThemePicker
              themeId={themeId}
              onSelect={(id) => {
                sfx.click();
                setThemeId(id);
              }}
              dailyTheme={dailyTheme}
            />
          )}

          {wizardStep === 2 && (
            <div className="flex-1 space-y-7">
              <div>
                <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3 flex items-center gap-2">
                  <Sliders size={13} />
                  Mode de réponse
                  {!answerMode && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-gold/15 text-gold px-2.5 py-0.5 text-[10px] font-bold normal-case tracking-normal">
                      À choisir
                    </span>
                  )}
                </p>
                <div
                  className={`grid grid-cols-2 gap-2.5 rounded-2xl transition-shadow ${
                    setupError && !answerMode ? "ring-2 ring-riseNeg/60 shake-wrong" : ""
                  }`}
                >
                  {([
                    {
                      id: "qcm" as const,
                      Icon: ListChecks,
                      title: "Facile",
                      sub: "3 titres au choix",
                    },
                    {
                      id: "text" as const,
                      Icon: Keyboard,
                      title: "Difficile",
                      sub: "Écrire la réponse",
                    },
                  ]).map((o) => {
                    const active = answerMode === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => {
                          sfx.click();
                          setAnswerMode(o.id);
                          setSetupError(null);
                        }}
                        aria-pressed={active}
                        className={`relative text-left rounded-2xl p-4 border transition-all duration-200 ${
                          active
                            ? "border-gold/50 bg-gold/10 shadow-[0_0_20px_rgba(240,0,28,0.18)]"
                            : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        {active && (
                          <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                            <Check size={11} className="text-white" />
                          </span>
                        )}
                        <o.Icon size={20} className={active ? "text-gold" : "text-ink-faint"} />
                        <p className="font-display text-base font-semibold mt-2.5">{o.title}</p>
                        <p className="text-xs text-ink-faint mt-0.5">{o.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3 flex items-center gap-2">
                  <Disc size={13} />
                  Partie
                </p>
                <p className="text-xs text-ink-faint mb-2">Nombre de manches</p>
                <div className="flex gap-2 mb-4 flex-wrap">
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
                <p className="text-xs text-ink-faint mb-2">Temps par manche</p>
                <div className="flex gap-2 flex-wrap">
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
              </div>

              <div>
                <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3 flex items-center gap-2">
                  <Target size={13} />
                  Difficulté
                </p>
                <div className="flex items-center justify-between gap-4 glass rounded-xl p-4 mb-2.5">
                  <span className="min-w-0 flex items-start gap-2.5">
                    <Icon icon="game-icons:headphones" width={15} className="text-gold shrink-0 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">Jokers d'écoute</span>
                      <span className="block text-xs text-ink-faint mt-0.5 leading-snug">
                        Réécouter un autre passage de l'extrait, par joueur et par partie.
                      </span>
                    </span>
                  </span>
                  <div className="flex gap-1 shrink-0" role="group" aria-label="Nombre de jokers d'écoute">
                    {[
                      { n: 0, label: "Aucun" },
                      { n: 1, label: "1" },
                      { n: 2, label: "2" },
                    ].map(({ n, label }) => (
                      <button
                        key={n}
                        onClick={() => {
                          sfx.click();
                          setJokerCount(n);
                        }}
                        aria-pressed={jokerCount === n}
                        className={`px-3 h-8 rounded-full text-xs font-mono transition-colors ${
                          jokerCount === n ? "bg-gold text-white" : "bg-white/5 text-ink-muted hover:text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {answerMode === "text" && (
                  <SettingToggle
                    Icon={SpellCheck}
                    label="Orthographe stricte"
                    description="Aucune tolérance aux fautes de frappe. Désactivé, une réponse proche suffit."
                    checked={strictMode}
                    onChange={setStrictMode}
                  />
                )}
                <div className="mt-2.5">
                  <SettingToggle
                    Icon={Lightbulb}
                    label="Indice en fin de chrono"
                    description="La première lettre du titre s'affiche dans les dernières secondes."
                    checked={hintsEnabled}
                    onChange={setHintsEnabled}
                  />
                </div>
              </div>

              <div>
                <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3 flex items-center gap-2">
                  <Volume2 size={13} />
                  Confort
                </p>
                <div className="glass rounded-xl p-4 mb-2.5">
                  <div className="flex items-center gap-2.5 mb-3">
                    {trackVolume === 0 ? (
                      <VolumeX size={15} className="text-gold shrink-0" />
                    ) : (
                      <Volume2 size={15} className="text-gold shrink-0" />
                    )}
                    <span className="text-sm font-medium flex-1">Volume des extraits</span>
                    <span className="font-mono text-xs text-ink-faint w-9 text-right">{Math.round(trackVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={trackVolume * 100}
                    onChange={(e) => setTrackVolume(Number(e.target.value) / 100)}
                    className="brand-slider"
                    style={{ "--fill": `${trackVolume * 100}%` } as CSSProperties}
                    aria-label="Volume des extraits"
                  />
                </div>
                <SettingToggle
                  Icon={sfxEnabled ? Volume2 : VolumeX}
                  label="Effets sonores"
                  description="Clics, buzzer, révélations — les bruitages de l'interface."
                  checked={sfxEnabled}
                  onChange={(v) => {
                    setSfxEnabled(v);
                    sfx.setMuted(!v);
                  }}
                />
                <div className="mt-2.5">
                  <SettingToggle
                    Icon={Play}
                    label="Lancement automatique du son"
                    description="L'extrait démarre tout seul à chaque manche, sans clic (à partir de la 2e — la première demande toujours un clic, contrainte du navigateur)."
                    checked={autoPlayEnabled}
                    onChange={setAutoPlayEnabled}
                  />
                </div>
              </div>

              <div className="glass rounded-xl p-4">
                <p className="font-mono text-[10px] text-gold uppercase tracking-[0.16em] mb-3">Barème & récap</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { label: "Titre", pts: "1 pt" },
                    ...(answerMode !== "qcm" ? [{ label: "Artiste", pts: "1 pt" }] : []),
                    { label: "Featuring", pts: "+2 pts", gold: true },
                  ].map((b) => (
                    <span
                      key={b.label}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono ${
                        b.gold ? "bg-gold/15 text-gold" : "bg-white/5 text-ink-muted"
                      }`}
                    >
                      {b.label} <span className="opacity-70">·</span> {b.pts}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-faint">
                  <span className="inline-flex items-center gap-1.5">
                    <Hash size={12} className="text-gold" /> {roundCount} manches
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Timer size={12} className="text-gold" /> {roundSeconds}s / manche
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon="game-icons:headphones" width={12} className="text-gold" />
                    {jokersEnabled ? `${jokerCount} joker${jokerCount > 1 ? "s" : ""} d'écoute` : "Sans joker d'écoute"}
                  </span>
                </div>
              </div>

              {setupError && <p className="text-sm text-riseNeg">{setupError}</p>}
            </div>
          )}
          </>
          )}
        </div>

        <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/95 to-transparent -z-10" aria-hidden="true" />
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div className="px-4 pt-4">
              <div className="flex items-center gap-3 glass-strong rounded-2xl p-2">
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
                    onClick={() => {
                      if (wizardStep === 0 && !mode) {
                        setSetupError("Choisis un mode — Solo, Local ou Salon en ligne — pour continuer.");
                        return;
                      }
                      setSetupError(null);
                      setWizardStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s));
                    }}
                    aria-label="Étape suivante"
                    className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full text-sm font-semibold transition-colors ${
                      wizardStep === 0 && !mode
                        ? "bg-white/10 text-ink-muted"
                        : "bg-gold hover:bg-glow text-white"
                    }`}
                  >
                    {wizardStep === 0 && !mode ? "Choisis un mode" : "Suivant"} <ChevronRight size={16} />
                  </button>
                ) : (
                  <Magnetic strength={0.15} className="flex-1 block">
                    <BorderMagicButton
                      onClick={startGame}
                      disabled={phase === "loading"}
                      fullWidth
                      size="md"
                    >
                      {phase === "loading" ? "Chargement..." : "Lancer la partie"}
                      {phase !== "loading" && <Icon icon="game-icons:play-button" width={18} />}
                    </BorderMagicButton>
                  </Magnetic>
                )}
              </div>
            </div>

            <div className="pt-2.5">
              <GameTabBarContent />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "final") {
    const ranked = [...players].sort((a, b) => b.score - a.score);
    return (
      <>
      <div className="max-w-xl mx-auto text-center pb-44">
        {showConfetti && <Confetti />}
        <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Partie terminée</p>
        {mode === "solo" ? (
          <>
            <h2 className="mb-3">
              <span
                className="font-display font-extrabold text-6xl md:text-7xl tracking-tight text-ink"
                style={{ textShadow: "0 0 40px rgba(240,0,28,0.45)" }}
              >
                {ranked[0]?.score ?? 0}
              </span>
              <span className="font-display font-bold text-2xl md:text-3xl text-ink-muted ml-2">pts</span>
            </h2>
            {bestStreak >= 2 && (
              <p className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-gold bg-gold/10 border border-gold/30 rounded-full px-3 py-1 mb-10">
                <Icon icon="game-icons:flame" width={12} className="text-gold" />
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
                    <Icon
                      icon={i === 1 ? "game-icons:trophy" : "game-icons:podium-winner"}
                      width={i === 1 ? 28 : 20}
                      className={i === 1 ? "text-gold" : "text-ink-faint"}
                    />
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
            <div className="mb-8">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Rejouez avec d'autres potes</p>
              <div className="flex justify-center">
                <ShareGame text="On vient de jouer au blind test rap français de DailyRapFrance, viens tester ton niveau la prochaine fois 🔥" />
              </div>
            </div>
          </>
        )}

        {mode === "solo" && (
          <div className="mb-8">
            {scoreSaveStatus === "saved" && (
              <>
                <p className="text-xs font-mono text-ink-faint mb-2.5">Score enregistré dans ton classement.</p>
                {topPercent !== null && (
                  <p className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-gold bg-gold/10 border border-gold/30 rounded-full px-3 py-1.5">
                    🏆 Top {topPercent}% sur ce thème
                  </p>
                )}
              </>
            )}
            {scoreSaveStatus === "guest" && (
              <p className="text-xs font-mono text-ink-faint">Connecte-toi pour sauvegarder ce score.</p>
            )}
          </div>
        )}

        {roundHistory.length > 0 && (
          <div className="mb-8 text-left">
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Récap de la partie</p>
            <div data-lenis-prevent className="card divide-y divide-white/8 overflow-x-hidden overflow-y-auto overscroll-contain max-h-96">
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
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {foundBy.length === 0 ? (
                        <>
                          <span className="text-[11px] font-mono text-ink-faint">personne</span>
                          <button
                            onClick={() => retrySingleTrack(r.track)}
                            className="press inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-gold hover:text-glow"
                          >
                            <RotateCcw size={10} /> Réessayer
                          </button>
                        </>
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

        {mode === "solo" && (
          <div className="mb-8">
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Partage ton score</p>
            <ShareScoreCard
              points={ranked[0]?.score ?? 0}
              themeLabel={THEME_OPTIONS.find((t) => t.id === themeId)?.label ?? themeId}
              rounds={tracks.length}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Magnetic>
            <BorderMagicButton onClick={playAgain} size="md">
              <RotateCcw size={16} />
              Rejouer
            </BorderMagicButton>
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

      <div
        className="fixed bottom-0 inset-x-0 z-30 px-4 pt-4 pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/90 to-transparent -z-10" aria-hidden="true" />
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <GameTabBarContent />
        </div>
      </div>
      </>
    );
  }

  if (!track) return null;

  const activePlayer = mode === "local" ? players.find((p) => p.id === buzzedBy) : players[0];
  const soloPlayer = players[0];

  return (
    <div
      className="max-w-2xl mx-auto pb-40 blindtest-shell overflow-y-auto overscroll-contain"
      style={{ maxHeight: "100dvh" }}
    >
      <audio
        key={track.id}
        ref={audioRef}
        src={previewOverride[track.id] ?? track.previewUrl}
        preload="auto"
        onError={() => (started ? void recoverAudio(true) : undefined)}
      />

      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
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
              <Icon icon="game-icons:flame" width={12} className="text-gold" />
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
          className="tap-press shrink-0 w-8 h-8 flex items-center justify-center rounded-full glass text-ink-muted hover:text-gold transition-colors"
        >
          {manualImmersive ? <Minimize size={14} /> : <Maximize size={14} />}
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
              <Icon icon="game-icons:flame" width={15} />
              Combo x{streakBurst} — +2 bonus
            </span>
          </div>
        )}

        {!started ? (
          <div className="flex flex-col items-center">
            <span className="block w-16 h-16 mb-5">
              <DRMark3D size="100%" />
            </span>
            <p className="font-mono text-xs text-gold uppercase tracking-[0.2em] mb-1">
              Manche {roundIndex + 1}
            </p>
            <p className="text-sm text-ink-faint mb-7">Prêt à reconnaître ce son ?</p>
            <Magnetic strength={0.25}>
              <BorderMagicButton onClick={launchExtract} size="lg">
                <Icon icon="game-icons:play-button" width={22} />
                Lancer l'extrait
              </BorderMagicButton>
            </Magnetic>
          </div>
        ) : !revealed ? (
          <>
            <span className="block w-28 h-28 mx-auto mb-6">
              <DRMark3D size="100%" />
            </span>

            {audioError && (
              <div className="solved-pop max-w-xs mx-auto mb-4 flex items-center gap-2.5 bg-riseNeg/10 border border-riseNeg/30 rounded-xl px-3.5 py-2.5 text-left">
                <VolumeX size={16} className="text-riseNeg shrink-0" />
                <p className="text-xs text-ink-muted flex-1">Le son n'a pas pu se charger.</p>
                <button
                  type="button"
                  onClick={retryAudio}
                  className="tap-press shrink-0 inline-flex items-center gap-1 text-xs font-medium text-riseNeg hover:text-white hover:bg-riseNeg/20 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <RotateCcw size={12} />
                  Réessayer
                </button>
              </div>
            )}

            {bonusFlash !== null && (
              <span className="solved-pop inline-flex items-center gap-1 rounded-full bg-gold/15 text-gold px-3 py-1 text-xs font-bold mb-2">
                ⚡ +{bonusFlash} rapidité
              </span>
            )}
            <span className={`font-display text-3xl text-gold block mb-4 transition-colors ${timeLeft <= 5 ? "urgent-pulse" : ""}`}>
              {timeLeft}
            </span>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-4 max-w-xs mx-auto">
              <div
                className="h-full bg-gold transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / roundSeconds) * 100}%` }}
              />
            </div>

            {hintsEnabled && timeLeft <= 6 && timeLeft > 0 && !solved.title && (
              <p className="solved-pop inline-flex items-center gap-1.5 font-mono text-xs text-gold bg-gold/10 border border-gold/25 rounded-full px-3 py-1.5 mb-4">
                <Lightbulb size={12} />
                Le titre commence par « {track.title.charAt(0).toUpperCase()} »
              </p>
            )}

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
              buzzedBy && answerMode === "qcm" ? (
                <div className="max-w-sm mx-auto">
                  <p className="text-sm text-ink-muted mb-2.5">
                    <span className="text-gold font-medium">{activePlayer?.name}</span> a buzzé
                  </p>
                  <QcmChoices
                    options={qcmOptions}
                    onPick={(label) => submitQcmChoice(buzzedBy, label)}
                    disabled={!!qcmLockedFor}
                    wrongId={qcmWrongId}
                    prompt={currentQcmField ? QCM_STAGE_PROMPTS[currentQcmField] : ""}
                    stageIndex={currentQcmField ? qcmStages.indexOf(currentQcmField) : 0}
                    stageCount={qcmStages.length}
                  />
                </div>
              ) : buzzedBy ? (
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
                  {applicableFields.includes("artist") && (
                    <input
                      value={guess.artist}
                      onChange={(e) => setGuess((g) => ({ ...g, artist: e.target.value }))}
                      placeholder="Artiste (1 pt)"
                      disabled={!!solved.artist}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/50 disabled:opacity-40"
                    />
                  )}
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
                          disabled={p.jokersLeft <= 0}
                          className="inline-flex items-center gap-1.5 text-xs font-mono glass rounded-full px-3 py-1.5 text-ink-faint hover:text-gold disabled:opacity-30 disabled:hover:text-ink-faint transition-colors"
                        >
                          <Icon icon="game-icons:headphones" width={13} />
                          Joker {p.name} {jokerCount > 1 && `(${p.jokersLeft})`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : answerMode === "qcm" ? (
              <QcmChoices
                options={qcmOptions}
                onPick={(label) => submitQcmChoice("solo", label)}
                disabled={!!qcmLockedFor}
                wrongId={qcmWrongId}
                prompt={currentQcmField ? QCM_STAGE_PROMPTS[currentQcmField] : ""}
                stageIndex={currentQcmField ? qcmStages.indexOf(currentQcmField) : 0}
                stageCount={qcmStages.length}
              />
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
                {applicableFields.includes("artist") && (
                  <FieldRow
                    value={guess.artist}
                    onChange={(v) => setGuess((g) => ({ ...g, artist: v }))}
                    placeholder="Artiste (1 pt)"
                    solved={!!solved.artist}
                    wrongFlash={wrongFlash}
                  />
                )}
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
                {(() => {
                  const names = [...new Set(Object.values(solved))]
                    .map((id) => players.find((p) => p.id === id)?.name)
                    .filter(Boolean) as string[];
                  const list =
                    names.length > 1 ? `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}` : names[0];
                  return `Bien joué ${list} — bonne réponse !`;
                })()}
              </p>
            )}
            {Object.keys(solved).length === 0 && <p className="mt-4 font-mono text-sm text-ink-faint">Personne ne l'a reconnu — il était dur celui-là.</p>}
          </div>
        )}
      </div>

      <div
        className="fixed bottom-0 inset-x-0 z-30 px-4 pt-4 pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/90 to-transparent -z-10" aria-hidden="true" />
        <div className="max-w-2xl mx-auto pointer-events-auto space-y-2.5">
          {started && !revealed && (mode === "solo" || (mode === "local" && buzzedBy)) && (
            <>
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
                        disabled={(soloPlayer?.jokersLeft ?? 0) <= 0}
                        aria-label="Joker : écouter un autre passage de l'extrait"
                        className="tap-press shrink-0 flex items-center gap-1.5 text-xs font-mono rounded-full px-4 min-h-[48px] text-ink-muted hover:text-gold hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <Icon icon="game-icons:headphones" width={15} />
                        Joker {jokerCount > 1 && `(${soloPlayer?.jokersLeft ?? 0})`}
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
            </>
          )}
          <GameTabBarContent />
        </div>
      </div>
    </div>
  );
}

function SettingToggle({
  Icon,
  label,
  description,
  checked,
  onChange,
}: {
  Icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 glass rounded-xl p-4">
      <span className="min-w-0 flex items-start gap-2.5">
        <Icon size={15} className="text-gold shrink-0 mt-0.5" />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-ink-faint mt-0.5 leading-snug">{description}</span>
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => {
          sfx.click();
          onChange(!checked);
        }}
        className={`tap-press relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
          checked ? "bg-gold" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function QcmChoices({
  options,
  onPick,
  disabled,
  wrongId,
  prompt,
  stageIndex,
  stageCount,
}: {
  options: string[];
  onPick: (label: string) => void;
  disabled: boolean;
  wrongId: string | null;
  prompt: string;
  stageIndex: number;
  stageCount: number;
}) {
  return (
    <div className="max-w-sm mx-auto">
      <div className="flex items-center justify-center gap-2.5 mb-3">
        <p className="text-sm font-semibold">{prompt}</p>
        {stageCount > 1 && (
          <span className="flex items-center gap-1" aria-label={`Étape ${stageIndex + 1} sur ${stageCount}`}>
            {Array.from({ length: stageCount }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i < stageIndex ? "w-1.5 bg-gold" : i === stageIndex ? "w-4 bg-gold" : "w-1.5 bg-white/15"
                }`}
              />
            ))}
          </span>
        )}
      </div>
      <div className="space-y-2.5" key={prompt}>
        {options.map((label) => (
          <button
            key={label}
            onClick={() => onPick(label)}
            disabled={disabled}
            className={`solved-pop w-full text-left rounded-lg px-4 py-3 text-sm font-medium border transition-colors disabled:opacity-50 ${
              wrongId === label
                ? "border-riseNeg bg-riseNeg/10 shake-wrong"
                : "border-white/10 bg-white/5 hover:border-gold/40 hover:bg-white/[0.07]"
            }`}
          >
            {label}
          </button>
        ))}
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
      options: { redirectTo: oauthCallbackUrl() },
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

      <div className="flex items-center gap-3 my-5" aria-hidden="true">
        <span className="flex-1 h-px bg-white/10" />
        <span className="text-[11px] font-mono uppercase tracking-wide text-ink-faint">ou avec un e-mail</span>
        <span className="flex-1 h-px bg-white/10" />
      </div>

      <EmailAuthForm />
    </div>
  );
}
