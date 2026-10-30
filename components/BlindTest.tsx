"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent as ReactTouchEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  RotateCcw, Users, User, Clock,
  Check, LogIn, ChevronLeft, ChevronRight, SkipForward,
  X, VolumeX, Volume2, Lightbulb, Sliders,
  SpellCheck, PartyPopper, Swords, Clapperboard, Sparkles,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { checkGuess } from "@/lib/blindtest-match";
import { sfx } from "@/lib/sfx";
import { fieldsFor, fieldPrompt, guessableFeats } from "@/lib/fields";
import { track as trackEv } from "@/lib/track";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import { oauthCallbackUrl } from "@/lib/authRedirect";
import { speedBonus } from "@/lib/scoring";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { qcmStageOrder, qcmStageOptions, qcmIsCorrect, qcmCorrectLabel } from "@/lib/qcmStages";
import EmailAuthForm from "@/components/EmailAuthForm";
import Confetti from "@/components/Confetti";
import ThemePicker from "@/components/ThemePicker";
import { DRMark3D } from "@/components/BlindTestLogo";
import BlindTestRoom from "@/components/BlindTestRoom";
import BrandLoader from "@/components/BrandLoader";
import { THEME_OPTIONS, getDailyTheme } from "@/lib/themes";
import { decodeCustomSet, CUSTOM_THEME_ID } from "@/lib/customBlindtest";
import ResultTicket from "@/components/ResultTicket";
import SavedPresets from "@/components/SavedPresets";
import TrendingStrip from "@/components/TrendingStrip";
import DailyCard from "@/components/DailyCard";
import { parseConfig, touchPreset, VARIANTS, SPRINT_SECONDS, SPRINT_ROUNDS, SURVIVAL_POOL, type GameConfig, type Preset, type Variant } from "@/lib/presets";
import { markPlayedToday, bumpGamesPlayed, weeklyNumber, weekKey, getStreak, recordDailyScore } from "@/lib/dailyStreak";
import type { RoundOutcome } from "@/lib/share";
import ClipPlayer, { type ClipHandle } from "@/components/ClipPlayer";

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

// « clips » n'est pas un mode du blind test audio : la tuile envoie vers le feed vertical
// « Devine le clip » (/jouer?mode=clips), rendu par app/jouer/page.tsx à la place de ce composant.
const MODE_TILES: { id: Mode | "clips" | "custom"; label: string; Icon: LucideIcon; desc: string; tag: string }[] = [
  { id: "solo", label: "Solo", Icon: User, desc: "À ton rythme, score sauvegardé.", tag: "1 joueur" },
  { id: "clips", label: "Devine le clip", Icon: Clapperboard, desc: "Swipe, regarde, réponds. Clips officiels, sans l'intro.", tag: "Nouveau · vidéo" },
  { id: "local", label: "Entre potes", Icon: Users, desc: "Un écran, un buzzer, les pseudos.", tag: "2 à 8 joueurs" },
  { id: "online", label: "Salon en ligne", Icon: RemoteSalonIcon, desc: "Un code, chacun sur son téléphone.", tag: "À distance" },
  { id: "party", label: "Soirée TV", Icon: PartyPopper, desc: "Écran partagé, téléphones en manette, un gage pour le dernier.", tag: "2 à 8 + TV" },
  { id: "custom", label: "Créer mon blind test", Icon: Sparkles, desc: "Mes morceaux, mon nom, un lien à envoyer.", tag: "Nouveau" },
];

type Track = {
  id: string;
  title: string;
  artistName: string;
  previewUrl: string;
  coverUrl: string | null;
  feats: string[];
  clip?: { videoId: string; duration: number; start: number } | null;
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
    const cfg = parseConfig(searchParams, (id) => id === CUSTOM_THEME_ID ? !!searchParams.get("custom") : THEME_OPTIONS.some((t) => t.id === id));
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
  // Blind test personnalisé (constructeur /creer) : les titres sont dans l'URL, pas de choix de thème.
  const customCode = searchParams.get("custom");
  const customSet = useMemo(() => decodeCustomSet(customCode), [customCode]);
  const isCustom = !!customSet;
  const customSlug = searchParams.get("b");

  // Lien profond : mode + thème → direct aux réglages ; mode solo seul → direct au thème.
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2>(
    isCustom ? (deepLinkMode ? 2 : 0) : deepLinkTheme && deepLinkMode ? 2 : deepLinkTheme || deepLinkMode === "solo" ? 1 : 0
  );
  const [mode, setMode] = useState<Mode | null>(joinRoomCode ? "online" : deepLinkMode);
  // Premier écran : deux choix seulement — seul, ou à plusieurs. Les modes viennent ensuite.
  const [branch, setBranch] = useState<"solo" | "multi" | null>(deepLinkMode ? (deepLinkMode === "solo" ? "solo" : "multi") : null);
  const [themeId, setThemeId] = useState<string>(isCustom ? CUSTOM_THEME_ID : deepLinkTheme ?? "mix");
  const [variant, setVariant] = useState<Variant>(deepLink.variant ?? "classic");
  // Source : extrait audio Deezer ou clip YouTube (mode « Devine le clip »).
  const [media, setMedia] = useState<"audio" | "clip">(deepLink.media ?? "audio");
  const isClip = media === "clip";
  const clipRef = useRef<ClipHandle | null>(null);
  const [clipUnavailable, setClipUnavailable] = useState(false);
  // Clip : entre le tap et la vraie lecture, le chrono attend (buffering YouTube).
  const [clipBuffering, setClipBuffering] = useState(false);
  const clipStartedRef = useRef(false);
  const variantRef = useRef<Variant>(variant);
  variantRef.current = variant;
  const [roundCount, setRoundCount] = useState(deepLink.rounds ?? 10);
  const [roundSeconds, setRoundSeconds] = useState(deepLink.seconds ?? DEFAULT_ROUND_SECONDS);
  const [jokerCount, setJokerCount] = useState(deepLink.jokers ?? 1);
  const jokersEnabledBase = jokerCount > 0;
  // "Facile" (QCM) présélectionné : l'écran Réglages n'a plus d'état bloquant caché —
  // un joueur pressé peut taper "Lancer la partie" sans jamais avoir vu ce choix.
  const [answerMode, setAnswerMode] = useState<"text" | "qcm" | null>(deepLink.answerMode ?? "qcm");
  // Le défi de la semaine est "officiel" seulement en solo, sur le thème de la semaine, avec les réglages
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
  const effectiveRounds = customSet ? customSet.i.length : variant === "sprint" ? SPRINT_ROUNDS : variant === "survival" ? SURVIVAL_POOL : roundCount;
  const effectiveJokers = variant === "sprint" ? 0 : jokerCount;
  const jokersEnabled = jokersEnabledBase && effectiveJokers > 0;
  const currentConfig: GameConfig = {
    mode: mode ?? "solo",
    theme: themeId,
    ...(customCode ? { custom: customCode } : {}),
    ...(customSlug ? { b: customSlug } : {}),
    rounds: roundCount,
    seconds: roundSeconds,
    answerMode: answerMode ?? "qcm",
    jokers: jokerCount,
    players: mode === "local" ? playerNames.filter((n) => n.trim()) : [],
    variant,
    media,
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
  const applicableFields: FieldKey[] = track ? fieldsFor(isCustom ? "custom" : themeId, track) : ["title", "artist"];
  // Pour le QCM : les feats à deviner (sans l'artiste du thème quand c'est lui l'invité)
  const qcmTrack = track ? { ...track, feats: guessableFeats(isCustom ? "custom" : themeId, track) } : track;

  const [roundHistory, setRoundHistory] = useState<{ track: Track; solved: Partial<Record<FieldKey, string>>; fast: boolean }[]>([]);
  // Réponse éclair (tous les champs trouvés en moins de 5 s) — sert au ⚡ de la grille partagée.
  const fastRef = useRef(false);
  const trackRef = useRef<Track | undefined>(undefined);
  const singleArtistRef = useRef<string>("mix");
  singleArtistRef.current = isCustom ? "custom" : themeId;
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

  // Retour haptique (Android / navigateurs qui le supportent — iOS Safari l'ignore sans casser).
  const haptic = useCallback((pattern: number | number[]) => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
    } catch {}
  }, []);

  // Passage à la manche suivante (ou à la fin) — appelé par le minuteur après la révélation,
  // ou tout de suite si la personne glisse vers le haut / touche l'écran.
  const advanceRound = useCallback(() => {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = null;
    const nothingFound = Object.keys(solvedRef.current).length === 0;
    if (variantRef.current === "survival" && nothingFound) {
      setPhase("final");
      return;
    }
    setRoundIndex((i) => {
      const next = i + 1;
      if (next >= tracks.length) setPhase("final");
      return next;
    });
  }, [tracks.length]);

  const revealRound = useCallback(() => {
    blurAndRealign();
    setRevealed(true);
    sfx.reveal();
    haptic(Object.keys(solvedRef.current).length ? [18, 40, 18] : 60);
    clearTimers();
    audioRef.current?.pause();
    clipRef.current?.pause();
    if (trackRef.current) {
      setRoundHistory((prev) => [...prev, { track: trackRef.current!, solved: solvedRef.current, fast: fastRef.current }]);
    }
    if (modeRef.current === "solo" && trackRef.current) {
      const fields: FieldKey[] = fieldsFor(singleArtistRef.current, trackRef.current);
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
    advanceTimeoutRef.current = setTimeout(advanceRound, variantRef.current === "sprint" ? 1800 : 3800);
  }, [blurAndRealign, clearTimers, advanceRound, haptic]);

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
    setClipBuffering(false);
    clipStartedRef.current = false;
    clearTimers();
  }

  useEffect(() => {
    if (phase === "playing") {
      resetRoundState();
      // Lancement auto — uniquement si l'audio a déjà été déverrouillé une première fois
      // dans cette session (premier clic manuel sur "Lancer l'extrait"). Petit délai pour
      // laisser le <audio> (remonté via key={track.id}) être prêt après resetRoundState().
      if (autoPlayEnabled && audioUnlockedRef.current && media !== "clip") {
        const t = setTimeout(() => launchExtract(true), 150);
        return () => clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, phase]);

  async function maintenanceMessage(): Promise<string | null> {
    try {
      // Jamais plus de 2,5 s : si la base est lente, on lance la partie quand même.
      const { data } = await Promise.race([
        createClient().from("site_settings").select("value").eq("key", "maintenance").maybeSingle(),
        new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 2500)),
      ]);
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
    trackEv("game_start", { mode, theme: isCustom ? "custom" : themeId, variant, media, rounds: effectiveRounds, daily: isDailyRun });
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
      const poolQuery = buildQuery(playTheme, effectiveRounds);
      if (customSet) poolQuery.set("ids", customSet.i.join(","));
      const res = await fetch(`/api/blindtest/pool?${poolQuery}`);
      const data = await res.json();
      let pool: Track[] = data.tracks ?? [];
      if (pool.length < 3) {
        setSetupError("Deezer n'a pas renvoyé assez de titres pour ce thème. Réessaie, ou choisis un autre thème.");
        setPhase("setup");
        return;
      }
      if (media === "clip") {
        // Mode clip : on retrouve le clip YouTube de chaque morceau ; ceux sans clip sortent du lot.
        const cres = await fetch("/api/blindtest/clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tracks: pool.map((t) => ({ id: t.id, title: t.title, artistName: t.artistName })) }),
        });
        const cdata = (await cres.json()) as { clips?: Record<string, Track["clip"]>; available?: boolean };
        if (cdata.available === false) {
          setClipUnavailable(true);
          setSetupError("Le mode clip n'est pas encore activé sur ce site. Joue avec les extraits audio en attendant.");
          setPhase("setup");
          return;
        }
        pool = pool.map((t) => ({ ...t, clip: cdata.clips?.[t.id] ?? null })).filter((t) => t.clip);
        if (pool.length < 3) {
          setSetupError("Pas assez de clips officiels pour ce thème (on ne garde que les clips publiés sur la chaîne de l'artiste). Essaie un autre thème, ou repasse en extraits audio.");
          setPhase("setup");
          return;
        }
      }
      if (customSlug) {
        // Blind test enregistré : +1 partie (compteur public, non bloquant)
        fetch("/api/blindtest/custom/play", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: customSlug }) }).catch(() => {});
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

  // `force` : appel depuis l'effet de changement de manche, où la fermeture capture encore
  // l'état « révélé » de la manche précédente (resetRoundState vient de le remettre à zéro).
  function launchExtract(force = false) {
    if (!force && (started || revealed)) return;
    sfx.click();
    setStarted(true);
    audioUnlockedRef.current = true;
    extractStartedAtRef.current = Date.now();
    setAudioError(false);
    if (isClip) {
      // Le chrono partira dans onClipPlaying (premier état PLAYING du lecteur).
      clipStartedRef.current = false;
      setClipBuffering(true);
      clipRef.current?.play();
      return;
    }
    const a = audioRef.current;
    a?.play().catch((err: unknown) => {
      // Fichier pas encore prêt (nouvelle source) : on relance dès qu'il l'est, sans rien demander.
      if (a && (err as { name?: string })?.name !== "NotAllowedError") {
        const retry = () => { a.removeEventListener("canplay", retry); a.play().catch(() => void recoverAudio(true)); };
        a.addEventListener("canplay", retry, { once: true });
        setTimeout(() => { a.removeEventListener("canplay", retry); if (a.paused && (deadlineRef.current ?? 0) > Date.now()) a.play().catch(() => void recoverAudio(true)); }, 600);
      } else void recoverAudio(true);
    });
    deadlineRef.current = Date.now() + effectiveSeconds * 1000;
    intervalRef.current = setInterval(tick, 1000);
  }

  function onClipPlaying() {
    if (clipStartedRef.current) return; // reprise après joker/pause : ne pas relancer le chrono
    clipStartedRef.current = true;
    setClipBuffering(false);
    extractStartedAtRef.current = Date.now();
    deadlineRef.current = Date.now() + effectiveSeconds * 1000;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 1000);
  }

  const [previewOverride, setPreviewOverride] = useState<Record<string, string>>({});
  // Même élément <audio> d'une manche à l'autre (il garde le droit de lecture donné par le
  // premier tap — sur iOS un élément neuf peut se voir refuser la lecture auto) ; seule la
  // source change.
  const previewUrlNow = track && !isClip ? (previewOverride[track.id] ?? track.previewUrl) : null;
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !previewUrlNow) return;
    if (a.src !== previewUrlNow) { a.src = previewUrlNow; a.load(); }
  }, [previewUrlNow]);
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
    if (!jokersEnabled || !player || player.jokersLeft <= 0 || (!audio && !isClip) || !started || revealed || buzzedBy) return;
    sfx.joker();
    if (isClip) {
      clipRef.current?.seekBy(12);
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, jokersLeft: p.jokersLeft - 1 } : p)));
      return;
    }
    if (!audio) return;
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
    haptic(12);
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
      } else if (canFeat && !newlySolved.feat && guessableFeats(singleArtistRef.current, track).some((f) => isArtistMatch(values.artist, f))) {
        // Un featuring tapé dans la case "Artiste" — on le crédite quand même, sur le bon champ.
        newlySolved.feat = playerId;
        gained += POINTS.feat;
        sfx.bonus();
      }
    }

    if (canFeat && !newlySolved.feat && values.feat.trim()) {
      if (guessableFeats(singleArtistRef.current, track).some((f) => isArtistMatch(values.feat, f))) {
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
    return qcmStageOptions(currentQcmField, currentQcmField === "feat" ? qcmTrack : track, tracks.filter((t) => t.id !== track.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, answerMode, currentQcmField]);

  function submitQcmChoice(playerId: string, chosenLabel: string) {
    if (!track || qcmLockedFor || !currentQcmField) return;
    if (qcmIsCorrect(currentQcmField, qcmTrack, chosenLabel)) {
      const values = { title: "", artist: "", feat: "" };
      values[currentQcmField] = qcmCorrectLabel(currentQcmField, qcmTrack);
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
    haptic([30, 30, 30]);
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
        total: fieldsFor(isCustom ? "custom" : themeId, r.track).length,
        fast: r.fast,
      })),
    [roundHistory, themeId, isCustom]
  );
  const [dailyStreak, setDailyStreak] = useState(0);
  const [streakFrozen, setStreakFrozen] = useState(false);
  const [dailyRecord, setDailyRecord] = useState(false);
  useEffect(() => {
    if (phase !== "final") return;
    sfx.victory();
    // Confettis réservés aux vrais moments (partie parfaite ou record de la semaine) — pas à chaque fin.
    const soloPlayer = players[0];
    const perfectRun = mode === "solo" && roundOutcomes.length > 0 && roundOutcomes.every((r) => r.found >= r.total);
    bumpGamesPlayed();
    trackEv("game_end", { mode, theme: isCustom ? "custom" : themeId, variant, media, points: soloPlayer?.score ?? 0, rounds: roundOutcomes.length, daily: isDailyRun });
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
      body: JSON.stringify({ theme: isDailyRun ? `defi:${weekKey()}` : variant === "classic" ? themeId : `${variant}:${themeId}`, rounds: roundHistory.length || tracks.length, points: solo.score }),
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

  // « Encore » : même mode, même thème, mêmes réglages, nouveaux extraits — sans repasser
  // par les réglages. C'est le bouton principal de l'écran de fin.
  function replaySame() {
    sfx.click();
    clearTimers();
    setStreak(0);
    setStreakBurst(null);
    setRoundHistory([]);
    setScoreSaveStatus("idle");
    setTopPercent(null);
    setShowConfetti(false);
    resetRoundState();
    void startGame();
  }

  // Appui maintenu sur la scène = pause (son + chrono), relâcher = reprise.
  const holdRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; since: number | null }>({ timer: null, since: null });
  const [held, setHeld] = useState(false);
  // Grand écran (≥ 1024 px) : certains panneaux s'ouvrent d'office, il y a la place.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  function holdStart() {
    if (!started || revealed) return;
    holdRef.current.timer = setTimeout(() => {
      holdRef.current.since = Date.now();
      setHeld(true);
      audioRef.current?.pause();
      clipRef.current?.pause();
      haptic(10);
    }, 220);
  }
  function holdEnd() {
    if (holdRef.current.timer) clearTimeout(holdRef.current.timer);
    holdRef.current.timer = null;
    if (holdRef.current.since != null) {
      const pausedFor = Date.now() - holdRef.current.since;
      if (deadlineRef.current != null) deadlineRef.current += pausedFor;
      holdRef.current.since = null;
      setHeld(false);
      if (isClip) clipRef.current?.play();
      else audioRef.current?.play().catch(() => {});
    }
  }

  // Glisser vers le haut : lance l'extrait (avant le départ) ou passe à la suite (après la
  // révélation). Un petit déplacement vertical rapide suffit, comme dans un feed.
  const swipeRef = useRef<{ y: number; t: number } | null>(null);
  function swipeStart(e: ReactTouchEvent) {
    swipeRef.current = { y: e.touches[0].clientY, t: Date.now() };
  }
  function swipeEnd(e: ReactTouchEvent) {
    const s0 = swipeRef.current;
    swipeRef.current = null;
    if (!s0) return;
    const dy = e.changedTouches[0].clientY - s0.y;
    if (dy > -70 || Date.now() - s0.t > 700) return;
    if (revealed) {
      sfx.click();
      advanceRound();
    } else if (!started) {
      launchExtract();
    }
  }

  const immersive = phase === "playing";

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

    // Remonte en haut AVANT de verrouiller : sinon le verrou mémorise la position de la
    // page (ex. après avoir fait défiler les modes) et décale tout l'écran de jeu.
    window.__lenis?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
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

  // Lancement direct depuis un lien profond (défi de la semaine, preset solo, raccourci d'app) :
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
    setMedia(p.media ?? "audio");
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
          title={joinRoomCode ? `Tu es invité dans le salon ${joinRoomCode}` : mode === "party" ? "Un compte pour lancer la soirée" : "Un compte pour le salon en ligne"}
          description={joinRoomCode ? "Connecte-toi (10 secondes, Google ou e-mail) et tu arrives directement dans le salon." : "Les salons privés demandent un compte — c'est lui qui relie les joueurs entre eux. Solo et Local restent jouables sans."}
          onBack={() => setMode(null)}
        />
      );
    }
    return (
      <div className="stage blindtest-shell px-5 sm:px-6 pb-10 pt-4">
        <div className="max-w-2xl mx-auto">
          <BlindTestRoom
            user={user}
            onExit={() => setMode(null)}
            initialCode={joinRoomCode ?? undefined}
            party={mode === "party"}
            custom={customSet ? { title: customSet.t, ids: customSet.i, secs: customSet.s, answer: customSet.a } : null}
          />
        </div>
      </div>
    );
  }

  if (showAuth && !user) {
    return (
      <div className="pt-8 blindtest-shell">
        <SignInGate onBack={() => setShowAuth(false)} />
      </div>
    );
  }

  // ---------------------------------------------------------------------------------------
  // v3 "La Scène" — barre haute commune aux écrans de préparation et de fin
  // ---------------------------------------------------------------------------------------
  const themeLabelNow = customSet ? customSet.t : themeId === "random" ? "Thème surprise" : THEME_OPTIONS.find((t) => t.id === themeId)?.label ?? themeId;
  const modeLabelNow = MODE_TILES.find((m) => m.id === mode)?.label ?? "Solo";
  // Plus de barre haute propre au jeu : le header du site est le seul menu (en pleine partie,
  // le feed a son propre bouton Quitter).
  const stageTop = null;

  if (phase === "setup" || phase === "loading") {
    const canContinue = wizardStep === 0 ? !!mode && (mode !== "local" || playerNames.filter((n) => n.trim()).length >= 2) : true;
    return (
      <div className="stage blindtest-shell px-5 sm:px-6 lg:px-10 pt-2" style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + ${wizardStep === 2 || (wizardStep === 0 && mode === "local") ? "140px" : "40px"})` }}>
        <div className="max-w-2xl lg:max-w-6xl mx-auto">
          {stageTop}

          {phase === "loading" ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
              <BrandLoader label={media === "clip" ? "On cherche les clips officiels" : "On prépare les extraits"} size="lg" />
              <p className="text-sm text-ink-faint mt-6">{modeLabelNow} · {themeLabelNow}</p>
            </div>
          ) : wizardStep === 0 ? (
            <>
              {/* ÉTAPE 0 — deux portes, pas plus : seul ou à plusieurs. Puis 3 choix max. */}
              {branch === null ? (
                <>
                  {customSet ? (
                    <>
                      <p className="stage-kicker mt-4 mb-2 inline-flex items-center gap-1.5"><Sparkles size={13} /> Blind test perso</p>
                      <h2 className="stage-title mb-3">{customSet.t}</h2>
                      <div className="ticket p-4 mb-5 flex items-center gap-3">
                        <span className="w-11 h-11 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0"><Icon icon="game-icons:music-spell" width={22} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{customSet.i.length} titres{customSet.s ? ` · extraits de ${customSet.s} s` : ""}{customSet.a === "text" ? " · réponse à écrire" : customSet.a === "qcm" ? " · QCM" : ""}</span>
                          <span className="block text-xs text-ink-faint truncate">{customSet.d || "Fait maison sur DailyRapFrance. Tu joues comment ?"}</span>
                        </span>
                        <a href="/jouer" className="text-xs font-semibold text-ink-faint hover:text-ink shrink-0">Quitter</a>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="stage-kicker mt-4 mb-2">Blind test rap français</p>
                      <h2 className="stage-title mb-2">Tu joues<br />comment ?</h2>
                      <p className="text-sm text-ink-muted mb-5">Deux portes. Le reste se règle en un écran.</p>
                    </>
                  )}
                  {deepLink.from && (
                    <div className="challenge-banner mb-5">
                      <Swords size={18} className="text-gold shrink-0" />
                      <p className="text-sm leading-snug">
                        <span className="font-semibold">{deepLink.from}</span> te défie
                        {deepLink.scoreToBeat ? <> — <span className="text-gold font-semibold">{deepLink.scoreToBeat} pts</span> à battre</> : null}. Même thème, mêmes réglages.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button type="button" onClick={() => { sfx.click(); if (customSet) { setMode("solo"); setSetupError(null); setWizardStep(2); } else setBranch("solo"); }} className="door" style={{ "--poster-bg": "linear-gradient(160deg, #3a0a0f 0%, #8a0010 60%, #f0001c 130%)" } as CSSProperties}>
                      <span className="door-icon"><User size={24} /></span>
                      <span className="door-go" aria-hidden="true"><ArrowRight size={18} /></span>
                      <span className="door-title">Seul</span>
                      <span className="door-sub">À ton rythme, score sauvegardé</span>
                    </button>
                    <button type="button" onClick={() => { sfx.click(); setBranch("multi"); }} className="door" style={{ "--poster-bg": "linear-gradient(160deg, #2a0608 0%, #c20016 70%, #ff6b3b 140%)" } as CSSProperties}>
                      <span className="door-icon"><Users size={24} /></span>
                      <span className="door-go" aria-hidden="true"><ArrowRight size={18} /></span>
                      <span className="door-title">À plusieurs</span>
                      <span className="door-sub">{customSet ? "Même téléphone, ou chacun sur le sien" : "Même écran, en ligne ou sur la TV"}</span>
                    </button>
                  </div>
                  {!customSet && <a href="/jouer?mode=solo&theme=pop&autostart=1" className="action-row mb-3">
                    <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0 bg-white/10 text-white"><Icon icon="game-icons:play-button" width={22} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">Partie rapide</span>
                      <span className="block text-xs text-ink-faint">Solo · Top 50 · 10 extraits — ça démarre tout de suite.</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-ink-faint" />
                  </a>}
                  {!customSet && <DailyCard variant="compact" />}
                  {!customSet && <div className="mt-6"><SavedPresets title="Tes soirées enregistrées" onPlay={applyPreset} /></div>}
                </>
              ) : branch === "solo" ? (
                <>
                  <button type="button" onClick={() => { setBranch(null); setMode(null); }} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mt-3 min-h-[40px]"><ChevronLeft size={16} /> Retour</button>
                  <h2 className="stage-title mb-5">Seul.<br />Tu veux quoi ?</h2>
                  <div className="space-y-2.5">
                    <button type="button" onClick={() => { sfx.click(); setMode("solo"); setSetupError(null); setWizardStep(isCustom ? 2 : 1); }} className="choice" data-primary="true">
                      <span className="choice-icon"><Icon icon="game-icons:headphones" width={24} /></span>
                      <span className="min-w-0 flex-1"><span className="choice-title">Blind test classique</span><span className="choice-sub">Choisis un thème ou un artiste — 80 thèmes, extraits de 30 s.</span></span>
                      <ChevronRight size={18} className="shrink-0" />
                    </button>
                    <a href="/jouer?mode=clips" className="choice">
                      <span className="choice-icon"><Clapperboard size={22} /></span>
                      <span className="min-w-0 flex-1"><span className="choice-title">Devine le clip <span className="choice-tag">Nouveau</span></span><span className="choice-sub">Le clip officiel plein écran, 15 s pour dire qui est à l'écran.</span></span>
                      <ChevronRight size={18} className="shrink-0 text-ink-faint" />
                    </a>
                    <a href="/creer" className="choice">
                      <span className="choice-icon"><Sparkles size={22} /></span>
                      <span className="min-w-0 flex-1"><span className="choice-title">Mon blind test <span className="choice-tag">Nouveau</span></span><span className="choice-sub">Crée-le avec tes morceaux, ou rejoue ceux que tu as enregistrés.</span></span>
                      <ChevronRight size={18} className="shrink-0 text-ink-faint" />
                    </a>
                  </div>
                  <div className="mt-6"><DailyCard variant="compact" /></div>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => { setBranch(null); setMode(null); }} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mt-3 min-h-[40px]"><ChevronLeft size={16} /> Retour</button>
                  <h2 className="stage-title mb-5">À plusieurs.<br />Vous êtes où ?</h2>
                  <div className="space-y-2.5">
                    <button type="button" onClick={() => { sfx.click(); setMode("local"); setSetupError(null); setTimeout(() => document.getElementById("players-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80); }} className="choice" data-primary={mode === "local"} aria-pressed={mode === "local"}>
                      <span className="choice-icon"><Icon icon="game-icons:smartphone" width={24} /></span>
                      <span className="min-w-0 flex-1"><span className="choice-title">Sur le même téléphone</span><span className="choice-sub">2 à 8 joueurs, un buzzer, les pseudos de chacun.</span></span>
                      {mode === "local" ? <Check size={18} strokeWidth={3} className="shrink-0" /> : <ChevronRight size={18} className="shrink-0 text-ink-faint" />}
                    </button>
                    <button type="button" onClick={() => { sfx.click(); setMode("online"); }} className="choice">
                      <span className="choice-icon"><Icon icon="game-icons:wifi-router" width={24} /></span>
                      <span className="min-w-0 flex-1"><span className="choice-title">Chacun sur son téléphone</span><span className="choice-sub">{customSet ? "Un salon en ligne avec tes morceaux : tes potes rejoignent avec un code." : "Un salon en ligne : crée-le ou rejoins-le avec un code."}</span></span>
                      <ChevronRight size={18} className="shrink-0 text-ink-faint" />
                    </button>
                    <button type="button" onClick={() => { sfx.click(); setMode("party"); }} className="choice">
                      <span className="choice-icon"><Icon icon="game-icons:tv" width={24} /></span>
                      <span className="min-w-0 flex-1"><span className="choice-title">Soirée sur la TV</span><span className="choice-sub">L'écran partagé sur la télé, les téléphones en manette, un gage pour le dernier.</span></span>
                      <ChevronRight size={18} className="shrink-0 text-ink-faint" />
                    </button>
                  </div>
                  {!customSet && <p className="text-xs text-ink-faint mt-4">Tu as un code ? <a href="/jouer?mode=online" className="text-glow font-semibold">Rejoindre un salon →</a></p>}
                </>
              )}

              {mode === "local" && (
                <div id="players-panel" className="ticket p-5 mt-2 mb-6 lg:max-w-xl animate-[solved-pop_0.35s_cubic-bezier(0.34,1.56,0.64,1)]">
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="font-display text-xl font-bold">Qui joue ?</p>
                    <span className="text-xs text-ink-faint">{playerNames.filter((n) => n.trim()).length} / 8</span>
                  </div>
                  <p className="text-xs text-ink-faint mb-3">Les pseudos s&apos;affichent sur les buzzers. Au moins deux joueurs.</p>
                  <div className="space-y-2">
                    {playerNames.map((name, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="avatar w-9 h-9 rounded-full grid place-items-center text-xs font-extrabold text-white shrink-0" style={{ background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>
                          {(name.trim() || `J${i + 1}`).slice(0, 2).toUpperCase()}
                        </span>
                        <input
                          value={name}
                          onChange={(e) => setPlayerNames((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))}
                          placeholder={`Joueur ${i + 1}`}
                          maxLength={24}
                          aria-label={`Pseudo du joueur ${i + 1}`}
                          className="answer-input !min-h-[48px] !text-[15px]"
                        />
                        {playerNames.length > 2 && (
                          <button type="button" onClick={() => setPlayerNames((prev) => prev.filter((_, idx) => idx !== i))} className="w-10 h-10 shrink-0 grid place-items-center rounded-full text-ink-faint hover:text-riseNeg hover:bg-white/5" aria-label="Retirer ce joueur">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {playerNames.length < 8 && (
                    <button type="button" onClick={() => setPlayerNames((prev) => [...prev, ""])} className="mt-3 text-sm font-semibold text-glow min-h-[44px]">
                      + Ajouter un joueur
                    </button>
                  )}
                </div>
              )}


            </>
          ) : wizardStep === 1 ? (
            <>
              <button type="button" onClick={() => setWizardStep(0)} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mt-3 min-h-[40px]">
                <ChevronLeft size={16} /> {modeLabelNow}
              </button>
              <h2 className="stage-title mb-5">Choisis<br />ton thème.</h2>
              <ThemePicker
                themeId={themeId}
                onSelect={(id) => {
                  sfx.click();
                  setThemeId(id);
                  setTimeout(() => setWizardStep(2), 220);
                }}
                dailyTheme={dailyTheme}
              />
            </>
          ) : (
            <>
              <button type="button" onClick={() => setWizardStep(isCustom ? 0 : 1)} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mt-3 min-h-[40px]">
                <ChevronLeft size={16} /> {isCustom ? "Modes" : "Thèmes"}
              </button>
              <h2 className="stage-title mb-5">Dernier<br />réglage.</h2>

              <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
              <div className="ticket mb-5 lg:mb-0">
                <div className="p-5 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="stage-kicker mb-1">{modeLabelNow}{isCustom ? " · Blind test perso" : ""}</p>
                    <p className="font-display text-2xl font-extrabold leading-tight truncate">{themeLabelNow}</p>
                    <p className="text-xs text-ink-faint mt-1 truncate">
                      {mode === "local" ? playerNames.filter((n) => n.trim()).join(", ") : `${effectiveRounds} extraits · ${effectiveSeconds} s chacun`}
                    </p>
                  </div>
                  {!isCustom && <button type="button" onClick={() => setWizardStep(1)} className="sticker sticker-ghost sticker-sm">Changer</button>}
                </div>
                <div className="ticket-cut" />
                <div className="p-5 space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-ink-faint mb-2">Règles</p>
                    <div className="segmented">
                      {VARIANTS.map((v) => (
                        <button key={v.id} type="button" aria-pressed={variant === v.id} onClick={() => { sfx.click(); setVariant(v.id); }}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-ink-faint mt-2 min-h-[1.5em]">
                      {variant === "classic" ? `${roundCount} manches, ${roundSeconds} s par extrait, ${jokerCount ? `${jokerCount} joker${jokerCount > 1 ? "s" : ""}` : "sans joker"}.` : VARIANTS.find((v) => v.id === variant)?.desc}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-faint mb-2">Source</p>
                    <div className="segmented">
                      <button type="button" aria-pressed={media === "audio"} onClick={() => { sfx.click(); setMedia("audio"); setSetupError(null); }}>Extrait audio</button>
                      <button type="button" aria-pressed={media === "clip"} onClick={() => { sfx.click(); setMedia("clip"); setSetupError(null); }} disabled={clipUnavailable}>Devine le clip</button>
                    </div>
                    <p className="text-xs text-ink-faint mt-2 min-h-[1.5em]">
                      {media === "clip" ? "Le clip officiel YouTube, lancé après l'intro. Seuls les morceaux dont le clip est sur la chaîne officielle de l'artiste sont proposés — certains thèmes ont donc moins d'extraits." : "L'extrait Deezer de 30 secondes, pochette floutée en fond."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-faint mb-2">Réponse</p>
                    <div className="segmented">
                      <button type="button" aria-pressed={answerMode === "qcm"} onClick={() => { sfx.click(); setAnswerMode("qcm"); }}>Facile · 3 choix</button>
                      <button type="button" aria-pressed={answerMode === "text"} onClick={() => { sfx.click(); setAnswerMode("text"); }}>Difficile · j&apos;écris</button>
                    </div>
                  </div>
                </div>
              </div>

              <details className="group adv-card ticket mb-6 lg:mb-0" open={wide || undefined}>
                <summary className="cursor-pointer flex items-center gap-4 p-5 min-h-[72px]">
                  <span className="w-11 h-11 rounded-xl bg-white/8 grid place-items-center shrink-0 text-ink"><Sliders size={18} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-display text-lg font-bold leading-tight">Réglages avancés</span>
                    <span className="block text-xs text-ink-faint mt-0.5 truncate">
                      {variant === "classic" ? `${roundCount} manches · ${roundSeconds} s · ${jokerCount ? `${jokerCount} joker${jokerCount > 1 ? "s" : ""}` : "sans joker"}` : `${effectiveRounds} extraits · ${effectiveSeconds} s`}
                      {hintsEnabled ? " · indice" : ""}{answerMode === "text" && strictMode ? " · orthographe stricte" : ""}
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-ink-faint transition-transform group-open:rotate-90 shrink-0" />
                </summary>
                <div className="px-5 pb-5 space-y-5">
                  {variant === "classic" && (
                    <>
                      {!isCustom && <div>
                        <p className="text-xs font-semibold text-ink-faint mb-2">Nombre de manches</p>
                        <div className="segmented">
                          {[10, 15, 20, 30].map((n) => (
                            <button key={n} type="button" aria-pressed={roundCount === n} onClick={() => { sfx.click(); setRoundCount(n); }}>{n}</button>
                          ))}
                        </div>
                      </div>}
                      <div>
                        <p className="text-xs font-semibold text-ink-faint mb-2">Temps par manche</p>
                        <div className="segmented">
                          {ROUND_TIME_OPTIONS.map((n) => (
                            <button key={n} type="button" aria-pressed={roundSeconds === n} onClick={() => { sfx.click(); setRoundSeconds(n); }}>{n}s</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ink-faint mb-2">Jokers d&apos;écoute (réécouter un autre passage)</p>
                        <div className="segmented">
                          {[0, 1, 2].map((n) => (
                            <button key={n} type="button" aria-pressed={jokerCount === n} onClick={() => { sfx.click(); setJokerCount(n); }}>{n === 0 ? "Aucun" : n}</button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {variant === "survival" && (
                    <div>
                      <p className="text-xs font-semibold text-ink-faint mb-2">Temps par manche</p>
                      <div className="segmented">
                        {ROUND_TIME_OPTIONS.map((n) => (
                          <button key={n} type="button" aria-pressed={roundSeconds === n} onClick={() => { sfx.click(); setRoundSeconds(n); }}>{n}s</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {answerMode === "text" && (
                    <SettingToggle Icon={SpellCheck} label="Orthographe stricte" description="Aucune tolérance aux fautes. Désactivé, une réponse proche suffit." checked={strictMode} onChange={setStrictMode} />
                  )}
                  <SettingToggle Icon={Lightbulb} label="Indice en fin de chrono" description="La première lettre du titre s'affiche dans les dernières secondes." checked={hintsEnabled} onChange={setHintsEnabled} />
                  <SettingToggle Icon={sfxEnabled ? Volume2 : VolumeX} label="Effets sonores" description="Clics, buzzer, révélations." checked={sfxEnabled} onChange={(v) => { setSfxEnabled(v); sfx.setMuted(!v); }} />
                  <div className="flex items-center gap-3">
                    <Volume2 size={15} className="text-ink-faint shrink-0" />
                    <input type="range" min={0} max={100} value={trackVolume * 100} onChange={(e) => setTrackVolume(Number(e.target.value) / 100)} className="brand-slider flex-1" style={{ "--fill": `${trackVolume * 100}%` } as CSSProperties} aria-label="Volume des extraits" />
                    <span className="font-mono text-xs text-ink-faint w-9 text-right">{Math.round(trackVolume * 100)}%</span>
                  </div>
                  <p className="text-xs text-ink-faint">Barème : titre 1 pt · artiste 1 pt · featuring 2 pts · bonus de rapidité.</p>
                </div>
              </details>

              </div>

              {setupError && <p className="text-sm text-riseNeg mb-4">{setupError}</p>}
            </>
          )}
        </div>

        {/* Action principale, collée au pouce */}
        {phase !== "loading" && (wizardStep === 2 || (wizardStep === 0 && mode === "local")) && (
          <div className="stage-fixed bottom-0 inset-x-0 px-5 pt-6 pointer-events-none" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
            <div className="absolute inset-0 bg-gradient-to-t from-[#070404] via-[#070404]/90 to-transparent -z-10" aria-hidden="true" />
            <div className="max-w-2xl mx-auto pointer-events-auto">
              {wizardStep === 2 ? (
                <button type="button" onClick={startGame} className="sticker w-full h-16 text-lg">
                  <Icon icon="game-icons:play-button" width={20} /> Lancer la partie
                </button>
              ) : (
                <button type="button" disabled={!canContinue} onClick={() => { setSetupError(null); setWizardStep(isCustom ? 2 : 1); }} className="sticker w-full h-16 text-lg">
                  {!mode ? "Choisis un mode pour continuer" : mode === "local" && !canContinue ? "Ajoute au moins 2 joueurs" : isCustom ? "Continuer" : "Choisir le thème"} {canContinue && <ChevronRight size={18} />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "final") {
    const ranked = [...players].sort((a, b) => b.score - a.score);
    const solo = mode === "solo";
    const topScore = ranked[0]?.score ?? 0;
    const perfect = roundOutcomes.filter((r) => r.total > 0 && r.found >= r.total).length;
    const beat = solo ? deepLink.scoreToBeat : null;
    const chips: { label: string; strong?: boolean }[] = [];
    if (isDailyRun && dailyStreak > 0) chips.push({ label: `🔥 Série : ${dailyStreak} jour${dailyStreak > 1 ? "s" : ""}`, strong: true });
    if (streakFrozen) chips.push({ label: "🧊 Série sauvée" });
    if (dailyRecord) chips.push({ label: "🏆 Record de la semaine", strong: true });
    if (solo && topPercent !== null) chips.push({ label: isDailyRun ? `Top ${topPercent}% du défi` : `Top ${topPercent}% sur ce thème` });
    if (solo && bestStreak >= 2) chips.push({ label: `Combo max : ${bestStreak}` });
    if (beat !== null) chips.push(topScore > beat ? { label: `Tu bats ${deepLink.from} (${beat} pts)`, strong: true } : topScore === beat ? { label: `Égalité avec ${deepLink.from}` } : { label: `${deepLink.from} garde la main (${beat} pts)` });
    const headline = isDailyRun ? `Défi de la semaine #${weeklyNumber()} · ${themeLabelNow}` : `${modeLabelNow} · ${themeLabelNow}`;
    const subline = solo
      ? variant === "survival"
        ? `${roundOutcomes.filter((r) => r.found > 0).length} sons tenus avant la chute`
        : `${perfect} extrait${perfect > 1 ? "s" : ""} sur ${roundOutcomes.length} reconnu${perfect > 1 ? "s" : ""} en entier`
      : `${ranked.length} joueurs · ${roundOutcomes.length} extraits`;

    return (
      <div className="feed feed-final" data-lenis-prevent>
        {showConfetti && <Confetti />}
        <div className="feed-slide feed-slide-scroll max-w-xl lg:max-w-6xl mx-auto w-full lg:px-10">
          {stageTop}
          <div className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10 lg:items-start">
          <div>
          <h2 className="stage-title mt-4 mb-5">{solo ? (perfect === roundOutcomes.length && perfect > 0 ? "Sans faute." : topScore >= roundOutcomes.length * 2 ? "Solide." : "Fini.") : `${ranked[0]?.name} gagne.`}</h2>

          <ResultTicket
            points={topScore}
            rounds={roundOutcomes}
            themeLabel={themeLabelNow}
            config={currentConfig}
            daily={isDailyRun ? { number: weeklyNumber(), streak: dailyStreak } : null}
            bestStreak={bestStreak}
            playerName={solo ? (myUsername ?? undefined) : ranked[0]?.name}
            chips={chips}
            headline={headline}
            subline={subline}
            onReplay={playAgain}
            onReplaySame={replaySame}
            leaderboardHref={solo ? (isDailyRun ? "/blindtest/defi" : "/blindtest/classement") : undefined}
            podium={solo ? undefined : ranked.map((p) => ({ name: p.name, score: p.score }))}
          />
          </div>
          <div>

          {solo && scoreSaveStatus === "guest" && (
            <button type="button" onClick={() => setShowAuth(true)} className="mt-4 w-full ticket p-4 flex items-center gap-3 text-left">
              <span className="w-10 h-10 rounded-full bg-gold/15 text-gold grid place-items-center shrink-0"><LogIn size={17} /></span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Sauvegarder ce score</span>
                <span className="block text-xs text-ink-faint">Compte gratuit — classement, profil, amis à défier.</span>
              </span>
              <ChevronRight size={16} className="text-ink-faint" />
            </button>
          )}

          {roundHistory.length > 0 && (
            <details className="mt-6 group" open={!solo}>
              <summary className="cursor-pointer list-none flex items-center justify-between font-display text-xl font-bold min-h-[44px]">
                Les {roundHistory.length} extraits
                <ChevronRight size={16} className="text-ink-faint transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-2 space-y-1.5">
                {roundHistory.map((r, i) => {
                  const o = roundOutcomes[i];
                  const foundBy = [...new Set(Object.values(r.solved))];
                  return (
                    <div key={r.track.id + i} className="flex items-center gap-3 py-2">
                      <span className="tile shrink-0" data-s={o.found >= o.total ? (r.fast ? "fast" : "done") : o.found > 0 ? "partial" : "miss"} />
                      {r.track.coverUrl ? <img src={r.track.coverUrl} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" /> : <div className="w-11 h-11 rounded-lg bg-white/5 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{r.track.title}</p>
                        <p className="text-xs text-ink-faint truncate">{r.track.artistName}{r.track.feats.length > 0 && ` feat. ${r.track.feats.join(", ")}`}</p>
                      </div>
                      {foundBy.length === 0 ? (
                        <button onClick={() => retrySingleTrack(r.track)} className="text-xs font-semibold text-glow min-h-[36px] inline-flex items-center gap-1"><RotateCcw size={11} /> Réécouter</button>
                      ) : solo ? (
                        <span className="score-num text-base text-ink-muted">{o.found}/{o.total}</span>
                      ) : (
                        <span className="text-[11px] text-glow text-right">{foundBy.map((pid) => players.find((p) => p.id === pid)?.name).join(", ")}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          )}

          {/* Le média, même en fin de partie : les sons du moment, à écouter avant de relancer */}
          <div className="mt-8">
            <TrendingStrip title="Les sons du moment" limit={8} />
          </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  if (!track) return null;

  const activePlayer = mode === "local" ? players.find((p) => p.id === buzzedBy) : players[0];
  const soloPlayer = players[0];
  const showAnswers = started && !revealed;
  const qcmKeys = ["A", "B", "C", "D"];

  return (
    <div className="feed" data-lenis-prevent onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
      {/* `loop` : l'extrait Deezer dure 30 s ; avec le joker +15 s (ou 35/45 s de chrono) il
          s'arrêtait net avant la fin de la manche — il reboucle désormais sur lui-même. */}
      {!isClip && <audio ref={audioRef} preload="auto" loop onError={() => (started ? void recoverAudio(true) : undefined)} />}

      {/* Fond : pochette floutée qui respire (audio) ou clip plein écran (vidéo) */}
      {track.coverUrl && !isClip && <div className="round-bg feed-bg" data-revealed={revealed} data-playing={started && !revealed} style={{ backgroundImage: `url(${track.coverUrl})` }} aria-hidden="true" />}
      {isClip && track.clip && !revealed && (
        <div className="reel-video">
          <ClipPlayer key={track.id} ref={clipRef} videoId={track.clip.videoId} start={track.clip.start} volume={trackVolume} onError={() => setAudioError(true)} onPlaying={onClipPlaying} covered={!started} />
        </div>
      )}
      <div className="reel-shade" aria-hidden="true" />

      <div key={`${roundIndex}-${track.id}`} className="feed-slide">
        {/* Haut : quitter · progression segmentée · son */}
        <div className="feed-top">
          <button type="button" onClick={() => setConfirmQuit(true)} aria-label="Quitter la partie" className="feed-icon">
            <X size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="seg-progress" aria-hidden="true">
              {tracks.map((_, i) => {
                const o = roundOutcomes[i];
                const state = i < roundIndex ? (o ? (o.found >= o.total ? "done" : o.found > 0 ? "partial" : "miss") : "miss") : i === roundIndex ? "current" : undefined;
                return <span key={i} className="seg" data-state={state} />;
              })}
            </div>
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <p className="text-[11px] font-semibold text-ink-muted truncate">
                {variant === "survival" ? `Survie · son ${roundIndex + 1}` : `${roundIndex + 1} / ${tracks.length}`} · {themeLabelNow}
              </p>
              {mode === "solo" ? (
                <p className="text-[11px] font-bold shrink-0 inline-flex items-center gap-1.5">
                  <span className="score-num text-base text-ink">{soloPlayer?.score ?? 0}</span>
                  <span className="text-ink-faint">pts</span>
                  {streak >= 2 && <span className="text-glow inline-flex items-center gap-0.5"><Icon icon="game-icons:flame" width={12} /> {streak}</span>}
                </p>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={() => setTrackVolume(trackVolume === 0 ? 1 : 0)} aria-label={trackVolume === 0 ? "Rétablir le son" : "Couper le son"} className="feed-icon">
            {trackVolume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        {mode === "local" && (
          <div className="feed-players">
            {players.map((p) => (
              <span key={p.id} className="player-chip" data-buzzed={buzzedBy === p.id}>
                <span className="avatar">{p.name.slice(0, 2).toUpperCase()}</span>
                {p.name}
                <b>{p.score}</b>
              </span>
            ))}
          </div>
        )}

        {confirmQuit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div className="ticket p-6 max-w-sm w-full text-center">
              <p className="font-display text-xl font-bold mb-1.5">Quitter la partie ?</p>
              <p className="text-sm text-ink-muted mb-5">Manche {roundIndex + 1} / {tracks.length} — la progression et les scores seront perdus.</p>
              <div className="grid gap-2">
                <button onClick={() => setConfirmQuit(false)} className="sticker w-full">Continuer à jouer</button>
                <button onClick={() => { setConfirmQuit(false); playAgain(); }} className="sticker sticker-ghost w-full">Quitter quand même</button>
              </div>
            </div>
          </div>
        )}

        {/* Scène : appui maintenu = pause */}
        <div
          className="feed-scene"
          onPointerDown={holdStart}
          onPointerUp={holdEnd}
          onPointerCancel={holdEnd}
          onPointerLeave={holdEnd}
          onContextMenu={(e) => e.preventDefault()}
        >
          {roundGain && (
            <span key={roundGain.nonce} className="float-points feed-gain score-num text-5xl text-glow pointer-events-none">+{roundGain.points}</span>
          )}
          {streakBurst && (
            <div key={streakBurst} className="solved-pop feed-burst pointer-events-none">
              <span className="inline-flex items-center gap-1.5 bg-[#ffd166] text-[#3a0007] font-display font-extrabold text-sm rounded-full px-4 py-1.5"><Icon icon="game-icons:flame" width={15} /> Combo x{streakBurst} — +2</span>
            </div>
          )}

          {!started ? (
            <button type="button" onClick={() => launchExtract()} className="feed-launch">
              <span className="feed-launch-ring"><Icon icon="game-icons:play-button" width={34} /></span>
              <span className="stage-kicker mt-5">{variant === "survival" ? `Son n°${roundIndex + 1}` : `Manche ${roundIndex + 1}`}</span>
              <span className="font-display text-2xl font-extrabold tracking-tight">{roundIndex === 0 ? (isClip ? "Touche pour lancer le clip" : "Touche pour lancer le son") : "Suivant"}</span>
              <span className="text-xs text-ink-faint mt-1">ou glisse vers le haut</span>
            </button>
          ) : !revealed ? (
            <>
              {audioError && (
                <div className="solved-pop mb-4 flex items-center gap-2.5 bg-riseNeg/15 border border-riseNeg/40 rounded-xl px-3.5 py-2.5 text-left">
                  <VolumeX size={16} className="text-riseNeg shrink-0" />
                  <p className="text-xs flex-1">Le son n&apos;a pas pu se charger.</p>
                  <button type="button" onClick={retryAudio} className="text-xs font-semibold text-riseNeg inline-flex items-center gap-1"><RotateCcw size={12} /> Réessayer</button>
                </div>
              )}
              {!isClip && (
                <div className="feed-disc" data-held={held} aria-hidden="true">
                  <div className={`feed-disc-inner ${held ? "" : "vinyl-spin"}`}>
                    <DRMark3D size="46%" />
                  </div>
                </div>
              )}
              <div className={`big-timer feed-timer ${isClip ? "feed-timer-sm" : ""}`} data-urgent={timeLeft <= 5} style={{ "--pct": Math.max(0, Math.min(100, (timeLeft / Math.max(effectiveSeconds, 1)) * 100)) } as CSSProperties} role="timer" aria-label={`${timeLeft} secondes restantes`}>
                <span className={`score-num ${isClip ? "text-3xl" : "text-5xl"} ${timeLeft <= 5 ? "text-[#ffd166] urgent-pulse" : "text-ink"}`}>{held ? <Icon icon="game-icons:pause-button" width={28} /> : timeLeft}</span>
              </div>
              <div className="h-6 flex items-center justify-center" aria-live="polite">
                {held && <span className="text-xs font-semibold text-ink-muted">En pause — relâche pour reprendre</span>}
                {!held && clipBuffering && <span className="text-xs text-ink-faint animate-pulse">Le clip charge… le chrono part avec l&apos;image.</span>}
                {!held && bonusFlash !== null && <span className="solved-pop text-xs font-bold text-[#ffd166]">⚡ +{bonusFlash} rapidité</span>}
                {!held && hintsEnabled && bonusFlash === null && timeLeft <= 6 && timeLeft > 0 && !solved.title && (
                  <span className="solved-pop text-xs font-semibold text-ink-muted inline-flex items-center gap-1.5"><Lightbulb size={12} className="text-[#ffd166]" /> Le titre commence par « {track.title.charAt(0).toUpperCase()} »</span>
                )}
              </div>
            </>
          ) : (
            <button type="button" onClick={() => { sfx.click(); advanceRound(); }} className="feed-reveal solved-pop" aria-label="Manche suivante">
              {track.coverUrl && <img src={track.coverUrl} alt="" className="w-36 h-36 rounded-2xl object-cover mx-auto mb-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]" />}
              <p className="font-display text-3xl font-extrabold tracking-tight leading-tight">{track.title}</p>
              <p className="text-ink-muted text-lg mt-1">{track.artistName}</p>
              {track.feats.length > 0 && <p className="text-sm text-ink-faint mt-1">feat. {track.feats.join(", ")}</p>}
              <span className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <ResultPill ok={!!solved.title} label="Titre" points={POINTS.title} />
                {applicableFields.includes("artist") && <ResultPill ok={!!solved.artist} label="Artiste" points={POINTS.artist} />}
                {applicableFields.includes("feat") && <ResultPill ok={!!solved.feat} label="Feat" points={POINTS.feat} />}
              </span>
              {mode === "local" && Object.keys(solved).length > 0 && (
                <span className="block mt-3 text-sm font-semibold text-glow">
                  {[...new Set(Object.values(solved))].map((id) => players.find((p) => p.id === id)?.name).filter(Boolean).join(" et ")} — bien joué !
                </span>
              )}
              {Object.keys(solved).length === 0 && <span className="block mt-3 text-sm text-ink-faint">Personne ne l&apos;a reconnu — il était dur celui-là.</span>}
              <span className="feed-next" aria-hidden="true">
                <span className="feed-next-bar" style={{ animationDuration: `${variant === "sprint" ? 1.8 : 3.8}s` }} />
                <span className="text-[11px] font-semibold text-ink-faint inline-flex items-center gap-1"><ChevronRight size={12} className="-rotate-90" /> Glisse ou touche pour la suite</span>
              </span>
            </button>
          )}
        </div>

        {/* Rail d'actions à droite */}
        {showAnswers && (mode === "solo" || buzzedBy) && (
          <div className="feed-rail">
            {jokersEnabled && (
              <button type="button" onClick={() => useJoker(mode === "solo" ? "solo" : buzzedBy!)} disabled={((mode === "solo" ? soloPlayer : activePlayer)?.jokersLeft ?? 0) <= 0} className="feed-rail-btn">
                <span className="feed-rail-icon"><Icon icon="game-icons:headphones" width={22} /></span>
                <span>Joker{jokerCount > 1 ? ` ${(mode === "solo" ? soloPlayer : activePlayer)?.jokersLeft ?? 0}` : ""}</span>
              </button>
            )}
            {jokersEnabled && timeLeft <= 8 && timeLeft > 0 && !(mode === "solo" ? soloPlayer : activePlayer)?.timeJokerUsed && (
              <button type="button" onClick={() => useTimeJoker(mode === "solo" ? "solo" : buzzedBy!)} className="feed-rail-btn urgent-pulse-soft">
                <span className="feed-rail-icon feed-rail-icon-gold"><Clock size={20} /></span>
                <span>+{TIME_JOKER_SECONDS} s</span>
              </button>
            )}
            {!buzzedBy && (
              <button type="button" onClick={() => (mode === "local" ? setConfirmSkip(true) : revealRound())} className="feed-rail-btn">
                <span className="feed-rail-icon"><SkipForward size={20} /></span>
                <span>Passer</span>
              </button>
            )}
          </div>
        )}

        {/* Bas : réponses, toujours à portée de pouce */}
        <div className="feed-bottom">
          {showAnswers && mode === "local" && !buzzedBy && (
            <div>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <p className="text-sm font-bold">Qui buzze ?</p>
                {!confirmSkip ? (
                  <button type="button" onClick={() => setConfirmSkip(true)} className="text-xs font-semibold text-ink-faint inline-flex items-center gap-1 min-h-[32px]"><SkipForward size={12} /> Passer</button>
                ) : (
                  <span className="inline-flex items-center gap-2 text-xs font-semibold">
                    <span className="text-ink-muted">Révéler ?</span>
                    <button type="button" onClick={() => { setConfirmSkip(false); revealRound(); }} className="text-riseNeg px-2 py-1.5">Oui</button>
                    <button type="button" onClick={() => setConfirmSkip(false)} className="text-ink-faint px-2 py-1.5">Non</button>
                  </span>
                )}
              </div>
              <div className={`grid gap-3 justify-items-center ${players.length <= 2 ? "grid-cols-2 max-w-xs mx-auto" : players.length <= 3 ? "grid-cols-3" : "grid-cols-4"}`}>
                {players.map((p) => (
                  <button key={p.id} type="button" onClick={() => handleBuzz(p.id)} disabled={locked.has(p.id)} className="buzzer">
                    <span className="text-[11px] opacity-80">{locked.has(p.id) ? "éliminé" : "BUZZ"}</span>
                    <span className="truncate max-w-[90%]">{p.name}</span>
                  </button>
                ))}
              </div>
              {jokersEnabled && (
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {players.map((p) => (
                    <button key={p.id} type="button" onClick={() => useJoker(p.id)} disabled={p.jokersLeft <= 0} className="text-[11px] font-semibold text-ink-faint hover:text-ink disabled:opacity-30 inline-flex items-center gap-1 px-2 min-h-[32px]">
                      <Icon icon="game-icons:headphones" width={12} /> Joker {p.name}{jokerCount > 1 && ` (${p.jokersLeft})`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {showAnswers && (mode === "solo" || buzzedBy) && answerMode === "qcm" && (
            <div>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <p className="text-sm font-bold">
                  {mode === "local" && <span className="text-glow">{activePlayer?.name} — </span>}
                  {currentQcmField && track ? fieldPrompt(currentQcmField, isCustom ? "custom" : themeId, track) : ""}
                </p>
                {qcmStages.length > 1 && (
                  <span className="flex items-center gap-1" aria-label={`Étape ${(currentQcmField ? qcmStages.indexOf(currentQcmField) : 0) + 1} sur ${qcmStages.length}`}>
                    {qcmStages.map((f, i) => {
                      const idx = currentQcmField ? qcmStages.indexOf(currentQcmField) : 0;
                      return <span key={f} className={`h-1.5 rounded-full ${i < idx ? "w-1.5 bg-gold" : i === idx ? "w-5 bg-gold" : "w-1.5 bg-white/20"}`} />;
                    })}
                  </span>
                )}
              </div>
              <div className="feed-answers" key={currentQcmField ?? "x"}>
                {qcmOptions.map((label, i) => (
                  <button key={label} type="button" onClick={() => submitQcmChoice(mode === "solo" ? "solo" : buzzedBy!, label)} disabled={!!qcmLockedFor} className="answer solved-pop" data-wrong={qcmWrongId === label}>
                    <span className="answer-key">{qcmKeys[i]}</span>
                    <span className="flex-1 truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showAnswers && (mode === "solo" || buzzedBy) && answerMode === "text" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (mode === "solo") submitSoloGuess();
                else submitLocalGuess();
              }}
              className={`space-y-2 ${wrongFlash ? "shake-wrong" : ""}`}
            >
              {mode === "local" && <p className="text-sm font-bold px-1"><span className="text-glow">{activePlayer?.name}</span> a buzzé</p>}
              <FieldRow value={guess.title} onChange={(v) => setGuess((g) => ({ ...g, title: v }))} placeholder="Titre (1 pt)" solved={!!solved.title} wrongFlash={wrongFlash} />
              {applicableFields.includes("artist") && <FieldRow value={guess.artist} onChange={(v) => setGuess((g) => ({ ...g, artist: v }))} placeholder={track ? fieldPrompt("artist", isCustom ? "custom" : themeId, track, "placeholder") : "Artiste (1 pt)"} solved={!!solved.artist} wrongFlash={wrongFlash} />}
              {applicableFields.includes("feat") && <FieldRow value={guess.feat} onChange={(v) => setGuess((g) => ({ ...g, feat: v }))} placeholder="Featuring (+2 pts)" solved={!!solved.feat} wrongFlash={wrongFlash} gold />}
              <button type="submit" className="sticker w-full h-14"><Check size={18} strokeWidth={3} /> Valider{mode === "local" ? ` — ${activePlayer?.name}` : ""}</button>
            </form>
          )}
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
      <div className="solved-pop answer !min-h-[52px] !bg-gold/15 !border-gold/40 text-glow text-sm">
        <Check size={16} strokeWidth={3} />
        {placeholder.replace(/\s*\(.+\)/, "")} trouvé
      </div>
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      className={`answer-input !min-h-[52px] ${wrongFlash ? "!border-riseNeg" : gold ? "!border-gold/40" : ""}`}
    />
  );
}

function ResultPill({ ok, label, points }: { ok: boolean; label: string; points: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold ${
        ok ? "bg-gold text-white" : "bg-white/8 text-ink-faint line-through"
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
          className="mb-5 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink min-h-[40px]"
        >
          <ChevronLeft size={16} /> Retour
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
        <span className="text-xs text-ink-faint">ou avec un e-mail</span>
        <span className="flex-1 h-px bg-white/10" />
      </div>

      <EmailAuthForm />
    </div>
  );
}
