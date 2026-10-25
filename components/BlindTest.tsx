"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import {
  Zap, RotateCcw, Users, User, Disc, Clock,
  Check, LogIn, ChevronLeft, ChevronRight, SkipForward,
  Sliders, Gamepad2, Maximize, Minimize, X, VolumeX, Volume2, Lightbulb, Target,
  ListChecks, Keyboard, SpellCheck, Timer, Hash, PartyPopper, Swords,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { checkGuess } from "@/lib/blindtest-match";
import { sfx } from "@/lib/sfx";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import { oauthCallbackUrl } from "@/lib/authRedirect";
import { speedBonus } from "@/lib/scoring";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
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
import ResultShare from "@/components/ResultShare";
import SavedPresets from "@/components/SavedPresets";
import DailyCard from "@/components/DailyCard";
import BrandMark from "@/components/BrandMark";
import { parseConfig, touchPreset, VARIANTS, SPRINT_SECONDS, SPRINT_ROUNDS, SURVIVAL_POOL, type GameConfig, type Preset, type Variant } from "@/lib/presets";
import { markPlayedToday, bumpGamesPlayed, dailyNumber, getStreak, recordDailyScore } from "@/lib/dailyStreak";
import type { RoundOutcome } from "@/lib/share";

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

const MODE_TILES: { id: Mode; label: string; Icon: LucideIcon; desc: string; tag: string }[] = [
  { id: "solo", label: "Solo", Icon: User, desc: "À ton rythme, score sauvegardé.", tag: "1 joueur" },
  { id: "local", label: "Entre potes", Icon: Users, desc: "Un écran, un buzzer, les pseudos.", tag: "2 à 8 joueurs" },
  { id: "online", label: "Salon en ligne", Icon: RemoteSalonIcon, desc: "Un code, chacun sur son téléphone.", tag: "À distance" },
  { id: "party", label: "Soirée TV", Icon: PartyPopper, desc: "Écran partagé, téléphones en manette, un gage pour le dernier.", tag: "2 à 8 + TV" },
];

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
  const dailyTheme = useMemo(() => getDailyTheme(), []);
  // Lien profond — transporte une configuration complète (preset, défi d'un pote, raccourci
  // d'app) : /jouer?mode=local&theme=93&rounds=15&secs=25&players=A|B&autostart=1
  const deepLink = useMemo(() => {
    const cfg = parseConfig(searchParams, (id) => THEME_OPTIONS.some((t) => t.id === id));
    const isDaily = searchParams.get("daily") === "1";
    return {
      ...cfg,
      theme: isDaily && !cfg.theme ? dailyTheme.id : cfg.theme,
      isDaily,
      autostart: searchParams.get("autostart") === "1",
      from: searchParams.get("from"),
      scoreToBeat: Number(searchParams.get("score")) || null,
      presetId: searchParams.get("preset"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const deepLinkTheme = deepLink.theme ?? null;
  const deepLinkMode = deepLink.mode ?? null;

  // Lien profond : mode + thème → direct aux réglages ; mode solo seul → direct au thème.
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2>(
    deepLinkTheme && deepLinkMode ? 2 : deepLinkTheme || deepLinkMode === "solo" ? 1 : 0
  );
  const [mode, setMode] = useState<Mode | null>(joinRoomCode ? "online" : deepLinkMode);
  const [themeId, setThemeId] = useState<string>(deepLinkTheme ?? "mix");
  const [variant, setVariant] = useState<Variant>(deepLink.variant ?? "classic");
  const variantRef = useRef<Variant>(variant);
  variantRef.current = variant;
  const [roundCount, setRoundCount] = useState(deepLink.rounds ?? 10);
  const [roundSeconds, setRoundSeconds] = useState(deepLink.seconds ?? DEFAULT_ROUND_SECONDS);
  const [jokerCount, setJokerCount] = useState(deepLink.jokers ?? 1);
  const jokersEnabledBase = jokerCount > 0;
  // "Facile" (QCM) présélectionné : l'écran Réglages n'a plus d'état bloquant caché —
  // un joueur pressé peut taper "Lancer la partie" sans jamais avoir vu ce choix.
  const [answerMode, setAnswerMode] = useState<"text" | "qcm" | null>(deepLink.answerMode ?? "qcm");
  // Le défi du jour est "officiel" seulement en solo, sur le thème du jour, avec les réglages
  // par défaut — sinon c'est une partie normale sur ce thème.
  const isDailyRun = mode === "solo" && themeId === dailyTheme.id && variant === "classic";
  const [strictMode, setStrictMode] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [trackVolume, setTrackVolume] = useState(1);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  // Lancement auto du son — comportement de base, plus un réglage. L'extrait démarre
  // tout seul à chaque manche à partir de la 2e — la toute première manche demande
  // encore un clic (contrainte navigateur : aucun <audio>.play() programmatique
  // n'est autorisé avant une interaction utilisateur).
  const autoPlayEnabled = true;
  const audioUnlockedRef = useRef(false);
  const [playerNames, setPlayerNames] = useState<string[]>(
    deepLink.players && deepLink.players.length >= 2 ? deepLink.players : ["Joueur 1", "Joueur 2"]
  );
  // Réglages effectifs : le Sprint impose ses règles (8 s, 20 extraits, sans joker), la
  // Survie tire un pool large et s'arrête au premier raté.
  const effectiveSeconds = variant === "sprint" ? SPRINT_SECONDS : roundSeconds;
  const effectiveRounds = variant === "sprint" ? SPRINT_ROUNDS : variant === "survival" ? SURVIVAL_POOL : roundCount;
  const effectiveJokers = variant === "sprint" ? 0 : jokerCount;
  const jokersEnabled = jokersEnabledBase && effectiveJokers > 0;
  const currentConfig: GameConfig = {
    mode: mode ?? "solo",
    theme: themeId,
    rounds: roundCount,
    seconds: roundSeconds,
    answerMode: answerMode ?? "qcm",
    jokers: jokerCount,
    players: mode === "local" ? playerNames.filter((n) => n.trim()) : [],
    variant,
  };
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
  // Confirmation avant les actions sensibles : quitter en pleine partie efface la progression.
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  // Mode invité : affichage volontaire de l'écran de connexion depuis le setup.
  const [showAuth, setShowAuth] = useState(false);
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

  const [roundHistory, setRoundHistory] = useState<{ track: Track; solved: Partial<Record<FieldKey, string>>; fast: boolean }[]>([]);
  // Réponse éclair (tous les champs trouvés en moins de 5 s) — sert au ⚡ de la grille partagée.
  const fastRef = useRef(false);
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
      setRoundHistory((prev) => [...prev, { track: trackRef.current!, solved: solvedRef.current, fast: fastRef.current }]);
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
    const nothingFound = Object.keys(solvedRef.current).length === 0;
    const survivalOver = variantRef.current === "survival" && nothingFound;
    advanceTimeoutRef.current = setTimeout(() => {
      if (survivalOver) {
        setPhase("final");
        return;
      }
      setRoundIndex((i) => {
        const next = i + 1;
        if (next >= tracks.length) setPhase("final");
        return next;
      });
    }, variantRef.current === "sprint" ? 1800 : 3800);
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
    setTimeLeft(effectiveSeconds);
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
    fastRef.current = false;
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
    // Thème surprise : tiré au sort au lancement, puis affiché comme n'importe quel thème.
    let playTheme = themeId;
    if (themeId === "random") {
      const pool = THEME_OPTIONS.filter((t) => t.id !== "mix" && t.id !== "random");
      playTheme = pool[Math.floor(Math.random() * pool.length)].id;
      setThemeId(playTheme);
    }
    try {
      const res = await fetch(`/api/blindtest/pool?${buildQuery(playTheme, effectiveRounds)}`);
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
          ? [{ id: "solo", name: "Toi", score: 0, jokersLeft: effectiveJokers, timeJokerUsed: false }]
          : playerNames.filter((n) => n.trim()).map((n, i) => ({ id: `p${i}`, name: n.trim(), score: 0, jokersLeft: effectiveJokers, timeJokerUsed: false }))
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
    deadlineRef.current = Date.now() + effectiveSeconds * 1000;
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
        if (elapsed <= 5) fastRef.current = true;
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
      // En local : le champ trouvé est crédité au joueur, puis le buzz est rendu —
      // TOUT LE MONDE peut buzzer pour les champs restants et marquer des points.
      if (mode === "local") {
        setBuzzedBy(null);
        deadlineRef.current = Date.now() + timeLeft * 1000;
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(tick, 1000);
      }
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
    // Le verrou QCM ne doit bloquer QUE le joueur qui vient de se tromper (déjà géré
    // par `locked`) — pas geler les boutons pour toute la manche. Sans ce reset, les
    // autres joueurs buzzaient mais ne pouvaient plus répondre ni marquer.
    setQcmLockedFor(null);
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
  // Bilan manche par manche (champs trouvés / à trouver) — alimente la progression, la grille
  // emoji partagée et le récap.
  const roundOutcomes: RoundOutcome[] = useMemo(
    () =>
      roundHistory.map((r) => ({
        found: Object.keys(r.solved).length,
        total: (isSingleArtistTheme ? 1 : 2) + (r.track.feats.length ? 1 : 0),
        fast: r.fast,
      })),
    [roundHistory, isSingleArtistTheme]
  );
  const [dailyStreak, setDailyStreak] = useState(0);
  const [streakFrozen, setStreakFrozen] = useState(false);
  const [dailyRecord, setDailyRecord] = useState(false);
  useEffect(() => {
    if (phase !== "final") return;
    sfx.victory();
    // Confettis réservés aux vrais moments (partie parfaite ou record du jour) — pas à chaque fin.
    const soloPlayer = players[0];
    const perfectRun = mode === "solo" && roundOutcomes.length > 0 && roundOutcomes.every((r) => r.found >= r.total);
    bumpGamesPlayed();
    if (deepLink.presetId) touchPreset(deepLink.presetId);
    if (isDailyRun) {
      const st = markPlayedToday();
      setDailyStreak(st.count);
      setStreakFrozen(st.frozen);
      const rec = recordDailyScore(soloPlayer?.score ?? 0);
      setDailyRecord(rec.isRecord);
      setShowConfetti(perfectRun || rec.isRecord || (st.isNew && [7, 30, 100].includes(st.count)));
    } else {
      setDailyStreak(getStreak());
      setShowConfetti(perfectRun || mode !== "solo");
    }
    window.dispatchEvent(new Event("drf-game-finished"));
    if (mode !== "solo") return;
    const solo = players[0];
    if (!solo) return;
    fetch("/api/blindtest/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: variant === "classic" ? themeId : `${variant}:${themeId}`, rounds: roundHistory.length || tracks.length, points: solo.score }),
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

  useEffect(() => {
    const locked = phase === "playing";
    if (!locked) return; // rien à verrouiller, rien à nettoyer

    // Le "ghost scroll" (page décalée par le clavier iOS) ne concerne que le WINDOW,
    // jamais la zone de jeu interne — et uniquement à la fermeture du clavier. L'ancien
    // listener sur visualViewport.resize remettait tout en haut à CHAQUE variation du
    // viewport (barre d'URL qui se replie, rotation...) : sur les petits téléphones, un
    // scroll légitime dans le jeu était annulé dans la foulée. On ne garde que le cas
    // clavier (focusout), et on ne touche qu'au scroll du document, pas à la zone de jeu.
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

    // Clavier ouvert (mode saisie) : le viewport visible rétrécit — on recentre le champ
    // dans la zone scrollable du jeu pour qu'il ne finisse pas caché sous le clavier.
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA") && t.closest(".blindtest-shell")) {
        setTimeout(() => t.scrollIntoView({ block: "center", behavior: "smooth" }), 180);
      }
    };

    document.body.classList.add("game-scroll-lock");
    lockScroll();
    window.__lenis?.stop();
    window.addEventListener("focusout", onFocusOut);
    window.addEventListener("focusin", onFocusIn);

    // Un seul chemin de nettoyage — appelé automatiquement par React à la fois quand
    // `phase` change ET au démontage, donc un unlockScroll() pour un lockScroll(),
    // jamais plus (l'ancienne version avait un risque de double-décompte : la branche
    // "else" ET le cleanup pouvaient tous deux se déclencher pour le même verrou).
    return () => {
      window.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("focusin", onFocusIn);
      document.body.classList.remove("game-scroll-lock");
      unlockScroll();
      window.__lenis?.start();
    };
  }, [phase]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = trackVolume;
  }, [trackVolume, track?.id]);

  // Lancement direct depuis un lien profond (défi du jour, preset solo, raccourci d'app) :
  // zéro écran intermédiaire, la partie se charge tout de suite. Le premier extrait attend
  // quand même un tap (contrainte navigateur sur l'audio).
  const autostartedRef = useRef(false);
  useEffect(() => {
    if (userLoading || autostartedRef.current) return;
    if (deepLink.autostart && mode === "solo" && phase === "setup") {
      autostartedRef.current = true;
      void startGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading]);

  function applyPreset(p: Preset) {
    sfx.click();
    setThemeId(p.theme);
    setRoundCount(p.rounds);
    setRoundSeconds(p.seconds);
    setAnswerMode(p.answerMode);
    setJokerCount(p.jokers);
    setVariant(p.variant ?? "classic");
    if (p.mode === "local" && p.players.length >= 2) setPlayerNames(p.players);
    setMode(p.mode);
    setSetupError(null);
    if (p.mode === "solo" || p.mode === "local") setWizardStep(2);
  }

  if (userLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <BrandLoader size="md" />
      </div>
    );
  }

  // Mode invité : solo et local se jouent SANS compte (le compte ne sert qu'à
  // sauvegarder les scores et créer des salons). Le mur de connexion ne se dresse
  // qu'au moment où il est réellement nécessaire : salon en ligne / soirée.
  if (mode === "online" || mode === "party") {
    if (!user) {
      return (
        <SignInGate
          title={mode === "party" ? "Un compte pour lancer la soirée" : "Un compte pour le salon en ligne"}
          description="Les salons privés demandent un compte — c'est lui qui relie les joueurs entre eux. Solo et Local restent jouables sans."
          onBack={() => setMode(null)}
        />
      );
    }
    return (
      <BlindTestRoom
        user={user}
        onExit={() => setMode(null)}
        initialCode={joinRoomCode ?? undefined}
        party={mode === "party"}
      />
    );
  }

  if (showAuth && !user) {
    return (
      <div className="pt-8 blindtest-shell">
        <SignInGate onBack={() => setShowAuth(false)} />
      </div>
    );
  }

  if (phase === "setup" || phase === "loading") {
    return (
      <div
        className="max-w-2xl mx-auto pt-6 sm:pt-8 blindtest-shell"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + ${wizardStep > 0 || mode === "local" ? 236 : 150}px)` }}
      >
        {!user && (
          <div className="flex justify-center mb-3">
            <button
              onClick={() => setShowAuth(true)}
              className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-ink glass rounded-full px-3.5 py-1.5 transition-colors"
            >
              <LogIn size={11} className="text-gold" />
              Mode invité · <span className="text-gold font-semibold">se connecter</span>
            </button>
          </div>
        )}
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
              className={`flex-1 space-y-5 rounded-2xl transition-shadow ${
                setupError && !mode ? "ring-2 ring-riseNeg/60 shake-wrong" : ""
              }`}
            >
              {deepLink.from && (
                <div className="challenge-banner">
                  <Swords size={18} className="text-gold shrink-0" />
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{deepLink.from}</span> te défie
                    {deepLink.scoreToBeat ? (
                      <>
                        {" "}— <span className="text-gold font-semibold">{deepLink.scoreToBeat} pts</span> à battre
                      </>
                    ) : null}
                    . Même thème, mêmes réglages.
                  </p>
                </div>
              )}

              {!mode && (
                <>
                  <DailyCard variant="compact" />
                  <div className="px-0.5 pt-1">
                    <h2 className="font-display text-2xl font-bold tracking-tight">Ou choisis ta façon de jouer</h2>
                    <p className="text-sm text-ink-faint mt-1">Seul, entre potes sur un écran, à distance, ou en soirée sur la TV.</p>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                {MODE_TILES.map((m) => {
                  const isActive = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={isActive}
                      data-active={isActive}
                      onClick={() => {
                        sfx.click();
                        setMode(m.id);
                        setSetupError(null);
                        // Auto-avance : choisir Solo répond à la seule question de l'étape,
                        // on passe direct au thème. Local reste sur place : il faut les pseudos.
                        // Online/Soirée quittent le wizard d'eux-mêmes (rendu Room / connexion).
                        if (m.id === "solo") setTimeout(() => setWizardStep(1), 220);
                      }}
                      className="mode-tile min-h-[150px] sm:min-h-[164px]"
                    >
                      <span className="mode-wash" aria-hidden="true" />
                      <span className="mode-icon">
                        <m.Icon size={18} strokeWidth={2} />
                      </span>
                      {isActive && (
                        <span className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-gold grid place-items-center text-white">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                      <span className="relative text-[11px] font-semibold text-gold">{m.tag}</span>
                      <span className="relative font-display text-lg font-bold leading-tight">{m.label}</span>
                      <span className="relative text-xs text-ink-muted leading-snug">{m.desc}</span>
                    </button>
                  );
                })}
              </div>

              {mode === "local" && (
                <div className="card p-4 animate-[solved-pop_0.35s_cubic-bezier(0.34,1.56,0.64,1)]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">Qui joue ?</p>
                    <span className="text-xs text-ink-faint">{playerNames.filter((n) => n.trim()).length} / 8</span>
                  </div>
                  <div data-lenis-prevent className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {playerNames.map((name, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="w-10 h-11 shrink-0 grid place-items-center rounded-xl bg-white/5 text-xs font-mono text-ink-faint">{i + 1}</span>
                        <input
                          value={name}
                          onChange={(e) => setPlayerNames((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))}
                          placeholder={`Joueur ${i + 1}`}
                          maxLength={24}
                          aria-label={`Pseudo du joueur ${i + 1}`}
                          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gold/50 min-h-[44px]"
                        />
                        {playerNames.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setPlayerNames((prev) => prev.filter((_, idx) => idx !== i))}
                            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-ink-faint hover:text-riseNeg hover:bg-riseNeg/10 transition-colors"
                            aria-label="Retirer ce joueur"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {playerNames.length < 8 && (
                    <button
                      type="button"
                      onClick={() => setPlayerNames((prev) => [...prev, `Joueur ${prev.length + 1}`])}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:text-glow transition-colors min-h-[44px]"
                    >
                      + Ajouter un joueur
                    </button>
                  )}
                </div>
              )}

              {!mode && <SavedPresets title="Tes soirées enregistrées" onPlay={applyPreset} />}
            </div>
          )}

          {wizardStep === 1 && (
            <ThemePicker
              themeId={themeId}
              onSelect={(id) => {
                sfx.click();
                setThemeId(id);
                // Auto-avance : un thème choisi = l'étape est finie, direction Réglages.
                setTimeout(() => setWizardStep(2), 220);
              }}
              dailyTheme={dailyTheme}
            />
          )}

          {wizardStep === 2 && (
            <div className="flex-1 space-y-7">
              <div className="card p-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-glow to-gold text-white grid place-items-center shrink-0">
                  <BrandMark size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {MODE_TILES.find((m) => m.id === mode)?.label ?? "Solo"} · {themeId === "random" ? "Thème surprise" : THEME_OPTIONS.find((t) => t.id === themeId)?.label ?? themeId}
                  </p>
                  <p className="text-xs text-ink-faint truncate">
                    {variant !== "classic" ? `${VARIANTS.find((v) => v.id === variant)?.label} · ` : ""}
                    {mode === "local" ? playerNames.filter((n) => n.trim()).join(", ") : `${effectiveRounds} manches · ${effectiveSeconds}s par extrait`}
                  </p>
                </div>
                <button type="button" onClick={() => setWizardStep(1)} className="text-xs font-medium text-gold hover:text-glow min-h-[44px] px-2">
                  Changer
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Gamepad2 size={13} />
                  Règles
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {VARIANTS.map((v) => {
                    const active = variant === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          sfx.click();
                          setVariant(v.id);
                        }}
                        aria-pressed={active}
                        className={`text-left rounded-2xl p-3.5 border transition-all duration-200 min-h-[92px] ${
                          active
                            ? "border-gold/50 bg-gold/10 shadow-[0_0_20px_rgba(240,0,28,0.18)]"
                            : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        <p className="font-display text-sm font-semibold">{v.label}</p>
                        <p className="text-[11px] text-ink-faint mt-1 leading-snug">{v.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
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
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Disc size={13} />
                  Partie
                </p>
                {variant !== "classic" && (
                  <p className="text-xs text-ink-faint mb-3">
                    {variant === "sprint"
                      ? `Sprint : ${SPRINT_ROUNDS} extraits de ${SPRINT_SECONDS} s, sans joker.`
                      : `Survie : jusqu'à ${SURVIVAL_POOL} extraits, la partie s'arrête au premier son entièrement raté.`}
                  </p>
                )}
                <p className="text-xs text-ink-faint mb-2">{variant === "classic" ? "Nombre de manches" : "Chrono par manche"}</p>
                <div className={`flex gap-2 mb-4 flex-wrap ${variant === "classic" ? "" : "hidden"}`}>
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
                <p className={`text-xs text-ink-faint mb-2 ${variant === "classic" ? "" : "hidden"}`}>Temps par manche</p>
                <div className={`flex gap-2 flex-wrap ${variant === "sprint" ? "hidden" : ""}`}>
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
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
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
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
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
              </div>

              <div className="glass rounded-xl p-4">
                <p className="text-sm font-semibold mb-3">Barème</p>
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
            {/* La barre Précédent/Suivant n'apparaît que quand elle sert : jamais à
                l'étape Mode (l'auto-avance fait le travail), sauf en Local où il faut
                valider les pseudos. Une barre de moins = un écran qui respire. */}
            {(wizardStep > 0 || mode === "local") && (
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
            )}

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
    const themeLabel = THEME_OPTIONS.find((t) => t.id === themeId)?.label ?? themeId;
    const solo = mode === "solo";
    const topScore = ranked[0]?.score ?? 0;
    const perfect = roundOutcomes.filter((r) => r.total > 0 && r.found >= r.total).length;
    const beat = solo ? deepLink.scoreToBeat : null;
    const chips: { label: string; strong?: boolean }[] = [];
    if (isDailyRun && dailyStreak > 0) chips.push({ label: `🔥 Série : ${dailyStreak} jour${dailyStreak > 1 ? "s" : ""}`, strong: true });
    if (streakFrozen) chips.push({ label: "🧊 Série sauvée — un jour manqué pardonné" });
    if (dailyRecord) chips.push({ label: "🏆 Record du jour sur cet appareil", strong: true });
    if (solo && topPercent !== null) chips.push({ label: `Top ${topPercent}% sur ce thème` });
    if (solo && bestStreak >= 2) chips.push({ label: `Combo max : ${bestStreak} manches parfaites` });

    return (
      <>
        <div className="max-w-xl mx-auto blindtest-shell" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 120px)" }}>
          {showConfetti && <Confetti />}

          <div className="text-center mb-6">
            <p className="text-xs font-semibold text-gold mb-3">
              {isDailyRun
                ? `Défi du jour #${dailyNumber()} — ${themeLabel}`
                : variant === "survival"
                  ? `Survie — ${themeLabel}`
                  : variant === "sprint"
                    ? `Sprint — ${themeLabel}`
                    : `${themeLabel} — partie terminée`}
            </p>
            {solo ? (
              <>
                <p className="score-num text-[5.5rem] md:text-[7rem] text-ink" style={{ textShadow: "0 0 48px rgba(240,0,28,0.5)" }}>
                  {topScore}
                  <span className="font-display font-bold text-2xl text-ink-muted ml-2 align-middle">pts</span>
                </p>
                <p className="text-sm text-ink-muted mt-1">
                  {variant === "survival"
                    ? `${roundOutcomes.filter((r) => r.found > 0).length} sons tenus avant la chute`
                    : `${perfect} / ${roundOutcomes.length} extraits reconnus en entier`}
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-1">
                  {ranked[0]?.name} gagne
                </p>
                <p className="text-sm text-ink-muted">{topScore} pts — {ranked.length} joueurs, {roundOutcomes.length} extraits</p>
              </>
            )}
            {chips.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {chips.map((c) => (
                  <span
                    key={c.label}
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${
                      c.strong ? "bg-gold/15 text-gold border border-gold/30" : "bg-white/6 text-ink-muted"
                    }`}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* La partie, manche par manche — même code couleur que la grille partagée */}
          <div className="seg-progress mb-6" aria-label="Bilan des manches">
            {roundOutcomes.map((r, i) => (
              <span key={i} className="seg !h-2" data-state={r.found >= r.total ? "done" : r.found > 0 ? "partial" : "miss"} />
            ))}
          </div>

          {beat !== null && (
            <div className="challenge-banner mb-6">
              <Swords size={18} className="text-gold shrink-0" />
              <p className="text-sm leading-snug">
                {topScore > beat ? (
                  <>Tu bats <span className="font-semibold">{deepLink.from}</span> ({beat} pts). Renvoie-lui le défi.</>
                ) : topScore === beat ? (
                  <>Égalité parfaite avec <span className="font-semibold">{deepLink.from}</span> — {beat} pts chacun.</>
                ) : (
                  <><span className="font-semibold">{deepLink.from}</span> garde la main ({beat} pts). Rejoue pour le rattraper.</>
                )}
              </p>
            </div>
          )}

          {!solo && (
            <div className="flex items-end justify-center gap-3 mb-8">
              {[ranked[1], ranked[0], ranked[2]].map((p, i) =>
                p ? (
                  <div key={p.id} className={`flex flex-col items-center ${i === 1 ? "order-2" : i === 0 ? "order-1" : "order-3"}`}>
                    <div
                      className={`glass rounded-t-2xl w-24 sm:w-28 flex flex-col items-center justify-end pb-3 ${
                        i === 1 ? "h-32 border-gold/40" : i === 0 ? "h-24" : "h-16"
                      }`}
                    >
                      <p className="text-xs font-semibold truncate px-2 max-w-full">{p.name}</p>
                      <p className="score-num text-xl text-gold mt-1">{p.score}</p>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
          {!solo && ranked.length > 3 && (
            <div className="card divide-y divide-white/8 overflow-hidden mb-8">
              {ranked.slice(3).map((p, i) => (
                <div key={p.id} className="flex items-center gap-4 py-3 px-5">
                  <span className="font-mono text-sm text-ink-faint w-6">{i + 4}</span>
                  <span className="flex-1 text-sm font-medium">{p.name}</span>
                  <span className="font-mono text-sm text-gold">{p.score}</span>
                </div>
              ))}
            </div>
          )}

          {solo && scoreSaveStatus === "guest" && (
            <button
              onClick={() => setShowAuth(true)}
              className="action-row mb-6"
            >
              <span className="w-10 h-10 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0">
                <LogIn size={18} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Sauvegarder ce score</span>
                <span className="block text-xs text-ink-faint">Compte gratuit — classement, profil, amis à défier.</span>
              </span>
              <ChevronRight size={16} className="text-ink-faint" />
            </button>
          )}

          <section className="mb-8" aria-labelledby="share-title">
            <h3 id="share-title" className="font-display text-lg font-semibold mb-3">
              Partage ton résultat
            </h3>
            <ResultShare
              points={topScore}
              rounds={roundOutcomes}
              themeLabel={themeLabel}
              config={currentConfig}
              daily={isDailyRun ? { number: dailyNumber(), streak: dailyStreak } : null}
              bestStreak={bestStreak}
              playerName={solo ? (myUsername ?? undefined) : ranked[0]?.name}
            />
          </section>

          {roundHistory.length > 0 && (
            <details className="mb-8 group" open={!solo}>
              <summary className="cursor-pointer list-none flex items-center justify-between font-display text-lg font-semibold mb-3">
                Les {roundHistory.length} extraits
                <ChevronRight size={16} className="text-ink-faint transition-transform group-open:rotate-90" />
              </summary>
              <div data-lenis-prevent className="card divide-y divide-white/8 overflow-x-hidden overflow-y-auto overscroll-contain max-h-96">
                {roundHistory.map((r, i) => {
                  const foundBy = [...new Set(Object.values(r.solved))];
                  const o = roundOutcomes[i];
                  return (
                    <div key={r.track.id + i} className="flex items-center gap-3 py-3 px-4">
                      <span className={`w-1.5 self-stretch rounded-full ${o.found >= o.total ? "bg-gold" : o.found > 0 ? "bg-riseNeg" : "bg-white/15"}`} aria-hidden="true" />
                      {r.track.coverUrl ? (
                        <img src={r.track.coverUrl} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-white/5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{r.track.title}</p>
                        <p className="text-xs text-ink-faint truncate">
                          {r.track.artistName}
                          {r.track.feats.length > 0 && ` feat. ${r.track.feats.join(", ")}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {foundBy.length === 0 ? (
                          <button
                            onClick={() => retrySingleTrack(r.track)}
                            className="press inline-flex items-center gap-1 text-xs font-medium text-gold hover:text-glow min-h-[36px]"
                          >
                            <RotateCcw size={11} /> Réécouter
                          </button>
                        ) : solo ? (
                          <span className="text-xs font-mono text-gold">{o.found}/{o.total}{r.fast ? " ⚡" : ""}</span>
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
            </details>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Magnetic>
              <BorderMagicButton onClick={playAgain} size="md">
                <RotateCcw size={16} />
                {solo ? "Rejouer" : "Nouvelle partie"}
              </BorderMagicButton>
            </Magnetic>
            {solo && (
              <a href="/blindtest/classement" className="inline-flex items-center gap-2 glass rounded-full px-6 py-3 text-sm font-medium hover:border-gold/40 transition-colors min-h-[48px]">
                Classement
              </a>
            )}
            {solo && myUsername && (
              <a href={`/profil/${myUsername}`} className="inline-flex items-center gap-2 glass rounded-full px-6 py-3 text-sm font-medium hover:border-gold/40 transition-colors min-h-[48px]">
                Mon profil
              </a>
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
      className="max-w-2xl mx-auto blindtest-shell game-scroll-area overflow-y-auto overscroll-contain"
      style={{ height: "100dvh", paddingBottom: "calc(env(safe-area-inset-bottom) + 172px)" }}
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
            onClick={() => setConfirmQuit(true)}
            aria-label="Quitter la partie"
            title="Quitter la partie"
            className="tap-press w-8 h-8 flex items-center justify-center rounded-full glass text-ink-faint hover:text-riseNeg transition-colors"
          >
            <X size={15} />
          </button>
          {/* Confirmation — quitter efface la progression de la partie en cours */}
          {confirmQuit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
              <div className="glass-strong rounded-2xl p-6 max-w-sm w-full text-center">
                <p className="font-display text-lg font-semibold mb-1.5">Quitter la partie ?</p>
                <p className="text-sm text-ink-muted mb-5">
                  Manche {roundIndex + 1} / {tracks.length} — la progression et les scores de cette partie seront perdus.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setConfirmQuit(false)}
                    className="min-h-[44px] rounded-full bg-gold hover:bg-glow text-white text-sm font-semibold transition-colors"
                  >
                    Continuer à jouer
                  </button>
                  <button
                    onClick={() => { setConfirmQuit(false); playAgain(); }}
                    className="min-h-[44px] rounded-full glass text-ink-muted hover:text-riseNeg text-sm font-medium transition-colors"
                  >
                    Quitter quand même
                  </button>
                </div>
              </div>
            </div>
          )}
          <span className="text-xs font-semibold text-ink-muted">
            {roundIndex + 1} <span className="text-ink-faint font-normal">/ {tracks.length}</span>
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

        {/* Volume ajustable en pleine partie — clic sur l'icône = mute, slider au survol/focus */}
        <div className="group shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTrackVolume(trackVolume === 0 ? 1 : 0)}
            aria-label={trackVolume === 0 ? "Rétablir le son" : "Couper le son"}
            className="tap-press w-8 h-8 flex items-center justify-center rounded-full glass text-ink-muted hover:text-gold transition-colors"
          >
            {trackVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={trackVolume * 100}
            onChange={(e) => setTrackVolume(Number(e.target.value) / 100)}
            aria-label="Volume de l'extrait"
            className="w-0 opacity-0 group-hover:w-20 group-hover:opacity-100 focus:w-20 focus:opacity-100 transition-all duration-200 accent-[#f0001c] cursor-pointer"
          />
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

      <div className="seg-progress mb-4" aria-hidden="true">
        {tracks.map((_, i) => {
          const o = roundOutcomes[i];
          const state = i < roundIndex ? (o ? (o.found >= o.total ? "done" : o.found > 0 ? "partial" : "miss") : "miss") : i === roundIndex ? "current" : undefined;
          return <span key={i} className="seg" data-state={state} />;
        })}
      </div>

      <div className="card game-round-card text-center relative overflow-hidden flex flex-col justify-center transition-[height] duration-300">
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

            {/* Emplacement à hauteur fixe : le badge apparaît/disparaît SANS décaler
                le chrono ni les blocs de réponse en dessous (anti mis-click). */}
            <div className="h-7 mb-2 flex items-center justify-center" aria-live="polite">
              {bonusFlash !== null && (
                <span className="solved-pop inline-flex items-center gap-1 rounded-full bg-gold/15 text-gold px-3 py-1 text-xs font-bold">
                  ⚡ +{bonusFlash} rapidité
                </span>
              )}
            </div>
            <div
              className="timer-ring mx-auto mb-5"
              data-urgent={timeLeft <= 5}
              style={{ "--pct": Math.max(0, Math.min(100, (timeLeft / Math.max(effectiveSeconds, 1)) * 100)) } as CSSProperties}
              role="timer"
              aria-label={`${timeLeft} secondes restantes`}
            >
              <BrandMark size={16} className="absolute top-6 text-gold/70" />
              <span className={`score-num text-5xl ${timeLeft <= 5 ? "text-glow urgent-pulse" : "text-ink"}`}>{timeLeft}</span>
            </div>

            {hintsEnabled && (
              <div className="h-8 mb-4 flex items-center justify-center" aria-live="polite">
                {timeLeft <= 6 && timeLeft > 0 && !solved.title && (
                  <p className="solved-pop inline-flex items-center gap-1.5 font-mono text-xs text-gold bg-gold/10 border border-gold/25 rounded-full px-3 py-1.5">
                    <Lightbulb size={12} />
                    Le titre commence par « {track.title.charAt(0).toUpperCase()} »
                  </p>
                )}
              </div>
            )}

            {/* Slot fixe : le bouton "passer" disparaît au buzz sans décaler les réponses.
                En local (à plusieurs), passer prive tout le monde de la manche → confirmation. */}
            <div className="h-9 mb-6 flex items-center justify-center gap-2">
              {!buzzedBy && !confirmSkip && (
                <button
                  type="button"
                  onClick={() => (mode === "local" ? setConfirmSkip(true) : revealRound())}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint hover:text-ink glass rounded-full px-4 py-2 min-h-[36px] transition-colors"
                >
                  <SkipForward size={13} />
                  Passer ce son
                </button>
              )}
              {!buzzedBy && confirmSkip && (
                <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wide">
                  <span className="text-ink-muted">Révéler la réponse ?</span>
                  <button type="button" onClick={() => { setConfirmSkip(false); revealRound(); }} className="text-riseNeg hover:text-white hover:bg-riseNeg/20 rounded-full px-3 py-1.5 transition-colors">
                    Oui, passer
                  </button>
                  <button type="button" onClick={() => setConfirmSkip(false)} className="text-ink-faint hover:text-ink rounded-full px-3 py-1.5 transition-colors">
                    Annuler
                  </button>
                </span>
              )}
            </div>

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
          {started && !revealed && ((mode === "solo" && (answerMode !== "qcm" || jokersEnabled)) || (mode === "local" && buzzedBy)) && (
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
                    {jokersEnabled && answerMode === "qcm" && (
                      <p className="flex-1 text-center text-xs text-ink-faint px-2">Touche la bonne réponse — plus tu es rapide, plus tu marques.</p>
                    )}
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
                    {answerMode !== "qcm" && (
                      <button
                        type="submit"
                        form="solo-guess-form"
                        className="tap-press cta-glow flex-1 bg-gold hover:bg-glow text-white rounded-full min-h-[48px] font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <Check size={17} strokeWidth={3} />
                        Valider
                      </button>
                    )}
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
            className={`solved-pop tap-press w-full text-left rounded-xl px-4 py-3 min-h-[48px] text-sm font-medium border transition-colors disabled:opacity-50 active:scale-[0.985] ${
              wrongId === label
                ? "border-riseNeg bg-riseNeg/10 shake-wrong"
                : "border-white/10 bg-white/5 hover:border-gold/40 hover:bg-white/[0.07] active:bg-white/10"
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
function SignInGate({
  title = "Connecte-toi",
  description = "Ton compte sert à sauvegarder tes scores et à créer des salons privés entre potes.",
  onBack,
}: {
  title?: string;
  description?: string;
  onBack?: () => void;
}) {
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
      <p className="font-display text-xl font-medium mb-2">{title}</p>
      <p className="text-sm text-ink-muted mb-6">{description}</p>
      {onBack && (
        <button
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-ink-faint hover:text-ink transition-colors"
        >
          <ChevronLeft size={13} /> Revenir aux modes de jeu
        </button>
      )}
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
