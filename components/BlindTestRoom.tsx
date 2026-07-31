"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Users, Copy, Check, Crown, ArrowLeft, SkipForward, Share2, VolumeX, RotateCcw, LogOut, Tv } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateRoomCode } from "@/lib/roomCode";
import { checkGuess } from "@/lib/blindtest-match";
import { sfx } from "@/lib/sfx";
import { randomGage } from "@/lib/gages";
import { speedBonus } from "@/lib/scoring";
import { qcmStageOrder, qcmStageOptions, qcmIsCorrect, QCM_STAGE_PROMPTS, type QcmField } from "@/lib/qcmStages";
import Magnetic from "@/components/Magnetic";
import ThemePicker from "@/components/ThemePicker";
import BrandLoader from "@/components/BrandLoader";
import RoomFriendInvites from "@/components/RoomFriendInvites";
import type { User } from "@supabase/supabase-js";

type Track = { id: string; title: string; artistName: string; previewUrl: string; coverUrl: string | null; feats: string[] };
type FieldKey = "title" | "artist" | "feat";

function applicableFieldsFor(theme: string | undefined, track: { feats: string[] }): FieldKey[] {
  const base: FieldKey[] = theme?.startsWith("artist-") ? ["title"] : ["title", "artist"];
  return track.feats.length ? [...base, "feat"] : base;
}
const ROUND_SECONDS = 25;
const REVEAL_SECONDS = 3.2;
const POINTS: Record<FieldKey, number> = { title: 1, artist: 1, feat: 2 };

type RoomRow = {
  id: string;
  code: string;
  host_id: string;
  theme: string;
  rounds: number;
  tracks: Track[];
  status: "lobby" | "playing" | "finished";
  current_round: number;
  round_started_at: string | null;
  answer_mode: "text" | "qcm";
  gages_enabled: boolean;
  gages_intensity: "soft" | "hard";
};
type PlayerRow = { room_id: string; user_id: string; display_name: string };
type SolveRow = { room_id: string; round_index: number; field: FieldKey; user_id: string; bonus?: number | null };

export default function BlindTestRoomWrapper(props: {
  user: User;
  onExit?: () => void;
  initialCode?: string;
  party?: boolean;
}) {
  return <BlindTestRoom {...props} />;
}

function BlindTestRoom({
  user,
  onExit,
  initialCode,
  party = false,
}: {
  user: User;
  onExit?: () => void;
  initialCode?: string;
  party?: boolean;
}) {
  const supabase = createClient();
  const [screen, setScreen] = useState<"menu" | "lobby" | "playing" | "final">("menu");
  const [joinCode, setJoinCode] = useState(initialCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const [closedMessage, setClosedMessage] = useState<string | null>(null);
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; from: string }[]>([]);
  const reactionIdRef = useRef(0);
  const roomChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Petites notifications "X a rejoint / a quitté le salon" — éphémères, comme les
  // réactions emoji, mais dans leur propre pile en haut de l'écran.
  const [notices, setNotices] = useState<{ id: number; text: string }[]>([]);
  const noticeIdRef = useRef(0);
  const pushNotice = useCallback((text: string) => {
    const id = noticeIdRef.current++;
    setNotices((prev) => [...prev, { id, text }]);
    setTimeout(() => setNotices((prev) => prev.filter((n) => n.id !== id)), 3200);
  }, []);
  const [replaying, setReplaying] = useState(false);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [solves, setSolves] = useState<SolveRow[]>([]);

  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false);
  const [guess, setGuess] = useState({ title: "", artist: "", feat: "" });
  const [flash, setFlash] = useState<"ok" | "taken" | null>(null);
  const [qcmChoiceLocked, setQcmChoiceLocked] = useState(false);
  const [qcmWrongId, setQcmWrongId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<RoomRow | null>(null);
  roomRef.current = room;

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || "Joueur";
  const isHost = room?.host_id === user.id;
  const track: Track | undefined = room?.tracks?.[room.current_round];

  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room:${room.id}`)
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        const id = reactionIdRef.current++;
        setReactions((prev) => [...prev, { id, emoji: payload.emoji, from: payload.from }]);
        setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2000);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` }, () => {
        supabase
          .from("rooms")
          .select("*")
          .eq("id", room.id)
          .single()
          .then(({ data }) => {
            if (data) setRoom(data as RoomRow);
          });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_players", filter: `room_id=eq.${room.id}` }, (payload) => {
        const joined = payload.new as PlayerRow;
        setPlayers((prev) => [...prev, joined]);
        if (joined.user_id !== user.id) pushNotice(`${joined.display_name} a rejoint le salon`);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "room_players", filter: `room_id=eq.${room.id}` }, () => {
        // On ne fait pas confiance au contenu du payload de suppression (souvent limité à
        // la clé primaire selon la configuration de la table côté Supabase) — on relit la
        // liste à jour et on compare avec l'état local pour savoir précisément qui est
        // parti, plutôt que de deviner depuis un payload potentiellement incomplet.
        supabase
          .from("room_players")
          .select("*")
          .eq("room_id", room.id)
          .then(({ data }) => {
            if (!data) return;
            setPlayers((prev) => {
              const stillHere = new Set((data as PlayerRow[]).map((p) => p.user_id));
              prev.filter((p) => !stillHere.has(p.user_id)).forEach((p) => pushNotice(`${p.display_name} a quitté le salon`));
              return data as PlayerRow[];
            });
          });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_round_solves", filter: `room_id=eq.${room.id}` }, (payload) => {
        setSolves((prev) => [...prev, payload.new as SolveRow]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` }, () => {
        setClosedMessage("Un joueur a quitté — le salon a été fermé.");
        setRoom(null);
        setPlayers([]);
        setSolves([]);
        setScreen("menu");
      })
      .subscribe();
    roomChannelRef.current = channel;

    return () => {
      roomChannelRef.current = null;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  useEffect(() => {
    if (!room?.id || screen !== "lobby") return;
    const poll = setInterval(() => {
      supabase
        .from("room_players")
        .select("*")
        .eq("room_id", room.id)
        .then(({ data }) => {
          if (data) setPlayers(data as PlayerRow[]);
        });
    }, 3000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, screen]);

  useEffect(() => {
    if (!room) return;
    if (room.status === "playing") {
      setScreen("playing");
      // "started" ne concerne plus QUE la lecture audio locale (elle a besoin d'un vrai
      // clic pour démarrer — c'est une contrainte des navigateurs, surtout Safari iOS, pas
      // un choix arbitraire). La zone de réponse, elle, s'affiche pour tout le monde dès le
      // début de la manche indépendamment de ce clic (voir le rendu plus bas) — donc
      // personne n'est avantagé ou désavantagé selon la rapidité avec laquelle il clique
      // pour lancer le son.
      setStarted(false);
      setGuess({ title: "", artist: "", feat: "" });
      setFlash(null);
      setRevealed(false);
      revealedRef.current = false;
      setAudioError(false);
      setQcmChoiceLocked(false);
      setQcmWrongId(null);
      // Une manche 0 signifie toujours le DÉBUT d'une partie (lancement initial ou "Rejouer
      // — même salon" par l'hôte), jamais un simple passage de manche en cours de jeu. On y
      // efface donc le tableau des réponses : sans ça, les scores et champs "déjà trouvés"
      // de la partie précédente restaient affichés chez les AUTRES joueurs — l'hôte, lui,
      // les efface bien dans relaunchRoom(), mais uniquement dans son propre état local ;
      // les autres ne recevaient jamais cette information (la suppression des lignes solves
      // en base ne déclenche pas d'événement temps réel écouté ici, seul l'INSERT l'est).
      // Résultat pour eux : la manche 0 semblait déjà entièrement résolue par les réponses
      // de l'ancienne partie, donc plus aucun champ ni bouton QCM ne s'affichait — juste le
      // décompte qui tournait dans le vide.
      if (room.current_round === 0) setSolves([]);
    } else if (room.status === "finished") {
      sfx.victory();
      setScreen("final");
    } else if (room.status === "lobby") {
      setScreen("lobby");
      setSolves([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, room?.current_round]);

  useEffect(() => {
    if (screen !== "playing" || !room?.round_started_at) return;
    const startedAt = new Date(room.round_started_at).getTime();

    function check() {
      const elapsed = (Date.now() - startedAt) / 1000;
      if (elapsed < ROUND_SECONDS) {
        setTimeLeft(Math.max(0, Math.round(ROUND_SECONDS - elapsed)));
        if (ROUND_SECONDS - elapsed <= 6) sfx.tick();
      } else if (elapsed < ROUND_SECONDS + REVEAL_SECONDS) {
        setTimeLeft(0);
        if (!revealedRef.current) {
          revealedRef.current = true;
          setRevealed(true);
          sfx.reveal();
          audioRef.current?.pause();
        }
      } else if (isHost) {
        advanceRound();
      }
    }
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, room?.round_started_at, room?.current_round]);

  const endRoundEarly = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    const past = new Date(Date.now() - ROUND_SECONDS * 1000).toISOString();
    await supabase.from("rooms").update({ round_started_at: past }).eq("id", r.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Volontairement pas d'arrêt automatique de la manche dès que tous les champs sont
  // trouvés.) Avant, dès qu'UN joueur trouvait tout, la manche s'arrêtait pour TOUT LE
  // MONDE — les autres joueurs, encore en train de réfléchir ou de taper leur réponse,
  // se faisaient couper avant même d'avoir eu leur chance. La manche va maintenant
  // toujours jusqu'au bout de son temps (ROUND_SECONDS), pour laisser à chacun une vraie
  // fenêtre pour répondre. Seul l'hôte peut encore écourter une manche manuellement, via
  // le bouton "Personne ne trouve — passer" (endRoundEarly, toujours utilisé plus bas).

  const advanceRound = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    const next = r.current_round + 1;
    if (next >= r.tracks.length) {
      await supabase.from("rooms").update({ status: "finished" }).eq("id", r.id);
    } else {
      await supabase.from("rooms").update({ current_round: next, round_started_at: new Date().toISOString() }).eq("id", r.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createRoom(
    theme: string,
    rounds: number,
    answerMode: "text" | "qcm",
    gagesEnabled: boolean,
    gagesIntensity: "soft" | "hard"
  ) {
    setBusy(true);
    setError(null);
    try {
      const { data: maint } = await supabase.from("site_settings").select("value").eq("key", "maintenance").maybeSingle();
      const v = maint?.value as { enabled?: boolean; message?: string } | undefined;
      if (v?.enabled) {
        setError(`🔧 ${v.message?.trim() || "Le blind test revient dans quelques minutes."}`);
        setBusy(false);
        return;
      }
    } catch {
      // en cas de doute, on laisse jouer
    }
    const code = generateRoomCode();
    const { data, error: err } = await supabase
      .from("rooms")
      .insert({
        code,
        host_id: user.id,
        theme,
        rounds,
        answer_mode: answerMode,
        gages_enabled: gagesEnabled,
        gages_intensity: gagesIntensity,
      })
      .select()
      .single();
    if (err || !data) {
      console.error("[createRoom]", err);
      setError(
        err?.message
          ? `Impossible de créer le salon (${err.message}). Vérifie que les tables "rooms" existent bien dans Supabase.`
          : "Impossible de créer le salon. Réessaie."
      );
      setBusy(false);
      return;
    }
    const { error: joinErr } = await supabase
      .from("room_players")
      .insert({ room_id: data.id, user_id: user.id, display_name: displayName });
    if (joinErr) {
      console.error("[createRoom:joinSelf]", joinErr);
      setError(`Salon créé mais impossible de te rejoindre (${joinErr.message}).`);
      setBusy(false);
      return;
    }
    setRoom(data as RoomRow);
    setPlayers([{ room_id: data.id, user_id: user.id, display_name: displayName }]);
    setScreen("lobby");
    setBusy(false);
  }

  async function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    setError(null);
    const { data: r, error: err } = await supabase.from("rooms").select("*").eq("code", code).single();
    if (err || !r) {
      setError("Aucun salon avec ce code.");
      setBusy(false);
      return;
    }
    if (r.status !== "lobby") {
      setError("Cette partie a déjà commencé.");
      setBusy(false);
      return;
    }
    const { data: existingPlayers } = await supabase.from("room_players").select("*").eq("room_id", r.id);
    await supabase.from("room_players").upsert({ room_id: r.id, user_id: user.id, display_name: displayName });
    setRoom(r as RoomRow);
    setPlayers([...(existingPlayers ?? []).filter((p) => p.user_id !== user.id), { room_id: r.id, user_id: user.id, display_name: displayName }]);
    setScreen("lobby");
    setBusy(false);
  }

  const autoJoinedRef = useRef(false);
  useEffect(() => {
    if (!initialCode || autoJoinedRef.current) return;
    autoJoinedRef.current = true;
    joinRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function relaunchRoom(theme: string, rounds: number, answerMode: "text" | "qcm") {
    const r = roomRef.current;
    if (!r) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/blindtest/pool?theme=${theme}&count=${rounds}`);
      const data = await res.json();
      const tracks: Track[] = data.tracks ?? [];
      if (tracks.length < 3) {
        setError("Pas assez de titres Deezer pour ce thème.");
        setBusy(false);
        return;
      }
      await supabase.from("room_round_solves").delete().eq("room_id", r.id);
      await supabase
        .from("rooms")
        .update({
          theme,
          rounds,
          tracks,
          answer_mode: answerMode,
          status: "playing",
          current_round: 0,
          round_started_at: new Date().toISOString(),
        })
        .eq("id", r.id);
      setSolves([]);
      setReplaying(false);
    } finally {
      setBusy(false);
    }
  }

  async function startGame() {
    if (!room) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/blindtest/pool?theme=${room.theme}&count=${room.rounds}`);
      const data = await res.json();
      const tracks: Track[] = data.tracks ?? [];
      if (tracks.length < 3) {
        setError("Pas assez de titres Deezer pour ce thème.");
        setBusy(false);
        return;
      }
      await supabase
        .from("rooms")
        .update({ tracks, status: "playing", current_round: 0, round_started_at: new Date().toISOString() })
        .eq("id", room.id);
    } finally {
      setBusy(false);
    }
  }

  function launchExtract() {
    if (revealed) return;
    setStarted(true);
    setAudioError(false);
    audioRef.current?.play().catch(() => void recoverAudio(true));
  }

  const [previewOverride, setPreviewOverride] = useState<Record<string, string>>({});
  const autoRecoveredRef = useRef<Set<string>>(new Set());
  const trackIdRef = useRef<string | null>(null);
  trackIdRef.current = track?.id ?? null;

  const recoverAudio = useCallback(async (auto: boolean) => {
    const id = trackIdRef.current;
    if (!id) {
      setAudioError(true);
      return;
    }
    if (auto) {
      if (autoRecoveredRef.current.has(id)) {
        setAudioError(true);
        return;
      }
      autoRecoveredRef.current.add(id);
    }
    try {
      const res = await fetch(`/api/blindtest/preview?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("preview refresh failed");
      const data = (await res.json()) as { previewUrl?: string };
      if (data.previewUrl) {
        setPreviewOverride((prev) => ({ ...prev, [id]: data.previewUrl! }));
      }
    } catch {
      // On tente quand même une relecture de la source actuelle.
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
    setAudioError(false);
    void recoverAudio(false);
  }

  const roomApplicable: FieldKey[] = track && room ? applicableFieldsFor(room.theme, track) : [];
  const roomQcmStages = useMemo(
    () => (track && room?.answer_mode === "qcm" ? qcmStageOrder(roomApplicable as QcmField[]) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [track?.id, room?.answer_mode, roomApplicable.join(",")]
  );
  // Progression PROPRE À CE JOUEUR — avant, l'étape courante du QCM (et l'affichage
  // "trouvé" en mode texte) se basait sur les réponses de TOUT LE SALON : dès que l'hôte
  // (ou n'importe qui) trouvait un champ, l'étape suivante s'affichait instantanément chez
  // tous les autres joueurs, sans même leur laisser le temps de cliquer sur l'étape en
  // cours — "les autres joueurs ne peuvent plus répondre". Chaque joueur avance maintenant
  // à son propre rythme, sur ses propres bonnes réponses uniquement ; les points restent
  // attribués au premier qui valide vraiment en base (insertSolve, contrainte d'unicité),
  // mais tout le monde peut toujours essayer de trouver, même après que quelqu'un d'autre
  // a déjà eu le point sur ce champ.
  const [myCorrectFields, setMyCorrectFields] = useState<Set<FieldKey>>(new Set());
  useEffect(() => {
    setMyCorrectFields(new Set());
  }, [room?.current_round, track?.id]);
  const currentQcmField = roomQcmStages.find((f) => !myCorrectFields.has(f)) ?? null;
  const qcmOptions = useMemo(() => {
    if (!track || room?.answer_mode !== "qcm" || !currentQcmField) return [];
    return qcmStageOptions(currentQcmField, track, (room?.tracks ?? []).filter((t) => t.id !== track.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, room?.answer_mode, currentQcmField]);

  async function insertSolve(field: FieldKey) {
    if (!room) return { error: new Error("no room") };
    const startedAt = room.round_started_at ? new Date(room.round_started_at).getTime() : null;
    const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : Infinity;
    const bonus = speedBonus(elapsed);
    const base = { room_id: room.id, round_index: room.current_round, field, user_id: user.id };
    const { error } = await supabase.from("room_round_solves").insert({ ...base, bonus });
    if (error && /bonus/i.test(error.message ?? "")) {
      return await supabase.from("room_round_solves").insert(base);
    }
    return { error };
  }

  async function submitRoomQcmChoice(chosenLabel: string) {
    if (!room || !track || revealed || qcmChoiceLocked || !currentQcmField) return;
    if (!qcmIsCorrect(currentQcmField, track, chosenLabel)) {
      sfx.wrong();
      setQcmWrongId(chosenLabel);
      setTimeout(() => setQcmWrongId(null), 450);
      setQcmChoiceLocked(true);
      return;
    }
    // Bonne réponse : on avance TOUJOURS ce joueur à l'étape suivante, même si le champ a
    // déjà été réclamé par quelqu'un d'autre entre-temps (l'insert échoue alors seul —
    // contrainte d'unicité — mais ce joueur a bien répondu juste, il doit continuer).
    sfx.correct();
    setFlash("ok");
    setTimeout(() => setFlash(null), 700);
    setMyCorrectFields((prev) => new Set(prev).add(currentQcmField));
    await insertSolve(currentQcmField);
  }

  async function submitGuess() {
    if (!room || !track || revealed) return;
    const applicable: FieldKey[] = applicableFieldsFor(room.theme, track);
    let anyOk = false;

    for (const field of applicable) {
      // On ignore seulement les champs QUE CE JOUEUR a déjà trouvés — pas ceux trouvés par
      // quelqu'un d'autre : sinon un champ pris par l'hôte devenait immédiatement impossible
      // à retenter pour tous les autres, qui perdaient leur chance sans même avoir essayé.
      if (myCorrectFields.has(field)) continue;
      const value = guess[field];
      if (!value.trim()) continue;
      const match =
        field === "feat"
          ? track.feats.some((f) => checkGuess(value, f, ""))
          : field === "title"
          ? checkGuess(value, "", track.title)
          : checkGuess(value, track.artistName, "");
      if (!match) continue;

      // Réponse juste : ce joueur a trouvé, qu'il touche le point ou non (si quelqu'un
      // d'autre l'a déjà réclamé, insertSolve échoue silencieusement côté base — la
      // contrainte d'unicité protège juste l'attribution des points, pas le droit d'essayer).
      anyOk = true;
      setMyCorrectFields((prev) => new Set(prev).add(field));
      if (field === "feat") sfx.bonus();
      else sfx.correct();
      await insertSolve(field);
    }

    if (anyOk) {
      setFlash("ok");
      setGuess({ title: "", artist: "", feat: "" });
    } else {
      setFlash("taken");
      sfx.wrong();
    }
    setTimeout(() => setFlash(null), 700);
  }

  function sendReaction(emoji: string) {
    roomChannelRef.current?.send({
      type: "broadcast",
      event: "reaction",
      payload: { emoji, from: displayName },
    });
  }

  const gageText = useMemo(() => {
    if (!room?.gages_enabled) return "";
    return randomGage(room.gages_intensity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status]);

  function scoreFor(userId: string) {
    return solves.filter((s) => s.user_id === userId).reduce((sum, s) => sum + POINTS[s.field] + (s.bonus ?? 0), 0);
  }

  function copyCode() {
    if (!room) return;
    navigator.clipboard.writeText(room.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function shareRoom() {
    if (!room) return;
    const url = `${window.location.origin}/blindtest?room=${room.code}`;
    const text = `Rejoins ma partie de Blind Test DailyRapFrance ! Code : ${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Blind Test DailyRapFrance", text, url });
      } catch {
        // l'utilisateur a annulé le partage
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    }
  }

  function leaveToMenu() {
    setRoom(null);
    setPlayers([]);
    setSolves([]);
    setScreen("menu");
    setError(null);
  }

  // Quitter POUR DE VRAI (hôte uniquement) : supprime le salon (cascade → room_players,
  // room_round_solves). Ferme la partie pour tout le monde — c'est pour ça que seul l'hôte
  // y a accès désormais (voir isHost plus bas).
  async function leaveRoom() {
    const r = roomRef.current;
    if (!r) {
      leaveToMenu();
      return;
    }
    setBusy(true);
    const { error: delErr } = await supabase.from("rooms").delete().eq("id", r.id);
    setBusy(false);
    if (delErr) {
      setError(`Impossible de quitter le salon (${delErr.message}).`);
      return;
    }
    leaveToMenu();
  }

  // Quitter SEUL (non-hôte) : se retire juste de la liste des joueurs, le salon continue
  // de tourner normalement pour les autres — c'est cette suppression qui déclenche la
  // notification "X a quitté le salon" vue par les joueurs restants.
  async function leaveIndividually() {
    const r = roomRef.current;
    if (!r) {
      leaveToMenu();
      return;
    }
    setBusy(true);
    await supabase.from("room_players").delete().eq("room_id", r.id).eq("user_id", user.id);
    setBusy(false);
    leaveToMenu();
  }

  if (screen === "menu") {
    return <RoomMenu busy={busy} error={error} joinCode={joinCode} setJoinCode={setJoinCode} onCreate={createRoom} onJoin={joinRoom} onExit={onExit} party={party} />;
  }

  if (screen === "lobby" && room) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="fixed top-4 inset-x-0 z-40 pointer-events-none flex flex-col items-center gap-2">
          {notices.map((n) => (
            <span key={n.id} className="solved-pop glass-strong rounded-full px-4 py-2 text-xs font-medium text-ink-muted shadow-lg">
              {n.text}
            </span>
          ))}
        </div>
        {confirmingQuit ? (
          <div className="flex items-center gap-2 mb-6 text-xs font-mono uppercase tracking-wide">
            <span className="text-ink-muted">Fermer le salon pour tout le monde ?</span>
            <button onClick={leaveRoom} disabled={busy} className="text-riseNeg hover:text-white hover:bg-riseNeg/20 rounded-full px-3 py-1 transition-colors">
              Confirmer
            </button>
            <button onClick={() => setConfirmingQuit(false)} className="text-ink-faint hover:text-ink rounded-full px-3 py-1 transition-colors">
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => (isHost ? setConfirmingQuit(true) : leaveIndividually())}
            className="flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink mb-6 font-mono uppercase tracking-wide"
          >
            <ArrowLeft size={14} /> Quitter le salon
          </button>
        )}
        <div className="card p-6 md:p-8 text-center">
          <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Code du salon</p>
          <button onClick={copyCode} className="inline-flex items-center gap-3 mb-4 group">
            <span className="font-display text-4xl font-semibold tracking-[0.2em]">{room.code}</span>
            {copied ? <Check size={20} className="text-gold" /> : <Copy size={18} className="text-ink-faint group-hover:text-ink" />}
          </button>

          <div className="mb-6">
            <Magnetic strength={0.15}>
              <button
                onClick={shareRoom}
                className="inline-flex items-center gap-2 bg-gold hover:bg-glow text-white rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
              >
                <Share2 size={15} />
                {shared ? "Lien envoyé !" : "Partager l'invitation"}
              </button>
            </Magnetic>
          </div>

          {party ? (
            <a
              href={`/ecran?code=${room.code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 flex items-center gap-3.5 rounded-2xl border border-gold/40 bg-gold/[0.07] p-4 text-left hover:border-gold transition-colors"
            >
              <span className="icon-tile w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#7a0f0f] to-[#F0001C] text-white">
                <Tv size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Ouvrir l&apos;écran partagé</span>
                <span className="block text-xs text-ink-faint mt-0.5 leading-snug">
                  Sur la TV ou un laptop : QR pour rejoindre, décompte et classement en direct.
                </span>
              </span>
            </a>
          ) : (
            <a
              href={`/ecran?code=${room.code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-ink-faint hover:text-gold font-mono uppercase tracking-wide mb-6"
            >
              <Tv size={13} /> Ouvrir l&apos;écran salon (TV / laptop)
            </a>
          )}

          <RoomFriendInvites userId={user.id} roomCode={room.code} />

          <div className="glass rounded-xl p-4 mb-6">
            <p className="font-mono text-xs text-ink-faint uppercase tracking-wide mb-3 flex items-center justify-center gap-1.5">
              <Users size={13} /> {players.length} joueur{players.length > 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p) => (
                <span key={p.user_id} className="glass rounded-full px-3 py-1 text-sm flex items-center gap-1.5">
                  {p.user_id === room.host_id && <Crown size={12} className="text-gold" />}
                  {p.display_name}
                </span>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-riseNeg mb-4">{error}</p>}

          {isHost ? (
            <Magnetic strength={0.15} className="block w-full">
              <button
                onClick={startGame}
                disabled={busy || players.length < 1}
                className="cta-glow w-full bg-gold hover:bg-glow disabled:opacity-60 disabled:animate-none text-white rounded-full py-3.5 font-semibold flex items-center justify-center gap-2"
              >
                {busy ? "Chargement..." : "Démarrer la partie"}
                {!busy && <Play size={18} />}
              </button>
            </Magnetic>
          ) : (
            <div className="flex items-center justify-center gap-3 py-1">
              <BrandLoader size="sm" />
              <p className="text-sm text-ink-faint font-mono">En attente que l'hôte démarre...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "final" && room) {
    if (replaying) {
      return (
        <ReplayPanel
          initialTheme={room.theme}
          initialRounds={room.rounds}
          initialAnswerMode={room.answer_mode}
          busy={busy}
          error={error}
          onCancel={() => setReplaying(false)}
          onConfirm={(theme, rounds, answerMode) => relaunchRoom(theme, rounds, answerMode)}
        />
      );
    }
    const ranked = [...players].sort((a, b) => scoreFor(b.user_id) - scoreFor(a.user_id));
    const lastPlace = ranked.length > 1 ? ranked[ranked.length - 1] : null;
    return (
      <div className="max-w-lg mx-auto text-center">
        <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Terminé</p>
        <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8">Résultats</h2>

        {room.gages_enabled && lastPlace && (
          <div className="rounded-2xl p-5 mb-8 border border-gold/40 bg-gold/10 text-left">
            <p className="font-mono text-[10px] text-gold uppercase tracking-[0.16em] mb-2">
              🎉 Gage pour {lastPlace.display_name}
            </p>
            <p className="text-sm font-medium">{gageText}</p>
          </div>
        )}

        <div className="card divide-y divide-white/8 overflow-hidden mb-8 text-left">
          {ranked.map((p, i) => (
            <div key={p.user_id} className="flex items-center gap-4 py-3.5 px-5">
              <span className="font-display text-lg w-6 text-center text-ink-faint">{i + 1}</span>
              <span className="flex-1 text-sm font-medium">{p.display_name}</span>
              <span className="font-mono text-gold">{scoreFor(p.user_id)} pts</span>
            </div>
          ))}
        </div>

        <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3 text-left">Récap de la partie</p>
        <div data-lenis-prevent className="card divide-y divide-white/8 overflow-x-hidden overflow-y-auto overscroll-contain mb-8 text-left max-h-96">
          {room.tracks.map((t, i) => {
            const rSolves = solves.filter((s) => s.round_index === i);
            return (
              <div key={t.id} className="flex items-center gap-3 py-3 px-4">
                {t.coverUrl ? (
                  <img src={t.coverUrl} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-white/5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-ink-faint truncate">{t.artistName}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {rSolves.length === 0 ? (
                    <span className="text-[11px] font-mono text-ink-faint">personne</span>
                  ) : (
                    [...new Set(rSolves.map((s) => s.user_id))].map((uid) => (
                      <span key={uid} className="text-[11px] font-mono text-gold">
                        {players.find((p) => p.user_id === uid)?.display_name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {closedMessage && <p className="text-sm text-riseNeg mb-4">{closedMessage}</p>}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {isHost && (
            <button
              onClick={() => setReplaying(true)}
              className="inline-flex items-center gap-2 bg-gold hover:bg-glow text-white rounded-full px-6 py-3 font-medium transition-colors"
            >
              <RotateCcw size={16} />
              Rejouer — même salon
            </button>
          )}
          {confirmingQuit ? (
            <span className="inline-flex items-center gap-2 text-xs font-mono uppercase">
              <span className="text-ink-muted">Fermer le salon ?</span>
              <button onClick={leaveRoom} className="text-riseNeg hover:text-white hover:bg-riseNeg/20 rounded-full px-3 py-1.5 transition-colors">
                Confirmer
              </button>
              <button onClick={() => setConfirmingQuit(false)} className="text-ink-faint hover:text-ink rounded-full px-3 py-1.5 transition-colors">
                Annuler
              </button>
            </span>
          ) : (
            <button
              onClick={() => (isHost ? setConfirmingQuit(true) : leaveIndividually())}
              className="inline-flex items-center gap-2 glass text-ink-muted hover:text-ink rounded-full px-6 py-3 font-medium transition-colors"
            >
              <LogOut size={16} />
              Quitter le salon
            </button>
          )}
        </div>
        {!isHost && (
          <p className="text-xs text-ink-faint font-mono mt-4">
            Seul l'hôte peut relancer une partie dans ce salon.
          </p>
        )}
      </div>
    );
  }

  if (!room) return null;
  if (!track) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <div className="card p-8">
          <p className="text-sm text-ink-muted mb-4">Reconnexion à la partie...</p>
          <button
            onClick={() => {
              supabase
                .from("rooms")
                .select("*")
                .eq("id", room.id)
                .single()
                .then(({ data }) => {
                  if (data) setRoom(data as RoomRow);
                });
            }}
            className="text-xs font-mono uppercase text-gold hover:text-glow transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }
  const applicable: FieldKey[] = applicableFieldsFor(room.theme, track);
  const roundSolves = solves.filter((s) => s.round_index === room.current_round);
  const isSolved = (f: FieldKey) => roundSolves.some((s) => s.field === f);

  return (
    <div className="max-w-lg mx-auto">
      <audio
        key={previewOverride[track.id] ?? track.id}
        ref={audioRef}
        src={previewOverride[track.id] ?? track.previewUrl}
        preload="auto"
        onError={() => {
          if (started && !revealed) void recoverAudio(true);
          else setAudioError(true);
        }}
      />

      <div className="fixed top-4 inset-x-0 z-40 pointer-events-none flex flex-col items-center gap-2">
        {notices.map((n) => (
          <span key={n.id} className="solved-pop glass-strong rounded-full px-4 py-2 text-xs font-medium text-ink-muted shadow-lg">
            {n.text}
          </span>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-24 z-40 pointer-events-none flex justify-center">
        <div className="relative w-full max-w-lg h-0">
          {reactions.map((r) => (
            <span
              key={r.id}
              className="reaction-float absolute left-1/2 bottom-0 -translate-x-1/2 text-3xl"
              title={r.from}
            >
              {r.emoji}
            </span>
          ))}
        </div>
      </div>

      <div className="sticky top-0 z-20 py-2.5 mb-4 flex items-center justify-between glass-strong rounded-xl px-4 gap-2">
        {confirmingQuit ? (
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase">
            <span className="text-ink-muted">Fermer pour tous ?</span>
            <button onClick={leaveRoom} className="text-riseNeg hover:text-white hover:bg-riseNeg/20 rounded-full px-2 py-1 transition-colors">
              Oui
            </button>
            <button onClick={() => setConfirmingQuit(false)} className="text-ink-faint hover:text-ink rounded-full px-2 py-1 transition-colors">
              Non
            </button>
          </div>
        ) : (
          <button
            onClick={() => (isHost ? setConfirmingQuit(true) : leaveIndividually())}
            title={isHost ? "Quitter le salon (le ferme pour tout le monde)" : "Quitter le salon"}
            className="tap-press shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-ink-faint hover:text-riseNeg transition-colors"
          >
            <LogOut size={14} />
          </button>
        )}
        <span className="font-mono text-xs text-ink-faint uppercase tracking-wide">
          Manche {room.current_round + 1} / {room.tracks.length}
        </span>
        <button
          onClick={copyCode}
          className="tap-press inline-flex items-center gap-1.5 font-mono text-xs font-semibold tracking-[0.15em] bg-gold/10 border border-gold/30 text-gold rounded-full px-3 py-1.5 hover:bg-gold/20 transition-colors"
        >
          {room.code}
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>

      <div className="flex justify-center gap-1.5 mb-4">
        {["🔥", "😭", "💀", "🎯", "👀"].map((e) => (
          <button
            key={e}
            onClick={() => sendReaction(e)}
            className="tap-press w-9 h-9 rounded-full glass text-lg hover:bg-white/10 transition-colors"
          >
            {e}
          </button>
        ))}
      </div>

      <div className="card p-6 md:p-8 text-center mb-4 min-h-[320px] flex flex-col justify-center">
        {revealed ? (
          <div>
            {track.coverUrl && (
              <img src={track.coverUrl} alt={track.title} className="w-24 h-24 rounded-lg object-cover mx-auto mb-4" />
            )}
            <p className="font-display text-2xl font-medium">{track.title}</p>
            <p className="text-ink-muted mt-1">{track.artistName}</p>
            {track.feats.length > 0 && <p className="text-xs text-ink-faint mt-1">feat. {track.feats.join(", ")}</p>}
            <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
              {applicable.map((f) => (
                <span
                  key={f}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-mono ${
                    isSolved(f) ? "bg-gold/15 text-gold" : "bg-white/5 text-ink-faint"
                  }`}
                >
                  {isSolved(f) && <Check size={11} />}
                  {f === "title" ? "Titre" : f === "artist" ? "Artiste" : "Featuring"}
                  {isSolved(f) && ` — ${players.find((p) => p.user_id === roundSolves.find((s) => s.field === f)?.user_id)?.display_name}`}
                </span>
              ))}
            </div>
            {roundSolves.length === 0 && <p className="mt-4 font-mono text-sm text-ink-faint">Personne n'a trouvé.</p>}
          </div>
        ) : (
          <>
            {/* La lecture du son a besoin d'un vrai clic (contrainte des navigateurs,
                surtout Safari iOS) — mais contrairement à avant, ce clic ne conditionne
                plus l'accès à la zone de réponse juste en dessous : elle est déjà là pour
                tout le monde, dès le début de la manche, clic ou pas. */}
            {!started && (
              <Magnetic strength={0.2} className="block mb-5">
                <button onClick={launchExtract} className="mx-auto flex items-center gap-3 bg-gold hover:bg-glow text-white rounded-full px-8 py-4 font-medium transition-colors">
                  <Play size={20} /> Lancer le son
                </button>
              </Magnetic>
            )}
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
            <span className={`font-display text-2xl text-gold block mb-4 ${timeLeft <= 5 ? "urgent-pulse" : ""}`}>{timeLeft}</span>
            {isHost && (
              <button
                type="button"
                onClick={endRoundEarly}
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-ink-faint hover:text-ink glass rounded-full px-4 py-2 transition-colors"
              >
                <SkipForward size={13} />
                Personne ne trouve — passer
              </button>
            )}
            {room.answer_mode === "qcm" ? (
              <QcmChoicesRoom
                options={qcmOptions}
                onPick={(label) => void submitRoomQcmChoice(label)}
                disabled={qcmChoiceLocked}
                wrongId={qcmWrongId}
                prompt={currentQcmField ? QCM_STAGE_PROMPTS[currentQcmField] : ""}
                stageIndex={currentQcmField ? roomQcmStages.indexOf(currentQcmField) : 0}
                stageCount={roomQcmStages.length}
              />
            ) : (
            <div className={`space-y-2.5 max-w-sm mx-auto ${flash === "taken" ? "shake-wrong" : ""}`}>
              {applicable
                .filter((f) => applicable.includes(f))
                .map((f) => (
                  <div key={f}>
                    {myCorrectFields.has(f) ? (
                      <div className="solved-pop w-full bg-gold/10 border border-gold/30 rounded-lg px-3 py-2 text-sm text-gold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Check size={14} />
                          {f === "title" ? "Titre" : f === "artist" ? "Artiste" : "Featuring"} trouvé
                        </span>
                        <span className="text-xs text-ink-faint">
                          {isSolved(f)
                            ? players.find((p) => p.user_id === roundSolves.find((s) => s.field === f)?.user_id)?.display_name
                            : "toi"}
                        </span>
                      </div>
                    ) : (
                      <>
                        <input
                          value={guess[f]}
                          onChange={(e) => setGuess((g) => ({ ...g, [f]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && submitGuess()}
                          placeholder={f === "title" ? "Titre (1 pt)" : f === "artist" ? "Artiste (1 pt)" : "Featuring (+2 pts)"}
                          className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
                            f === "feat" ? "border-gold/30 focus:border-gold/60" : "border-white/10 focus:border-gold/50"
                          }`}
                        />
                        {/* Le champ reste tapable même si quelqu'un d'autre l'a déjà — juste
                            un petit rappel, pas un blocage : chacun garde sa chance de trouver. */}
                        {isSolved(f) && (
                          <p className="text-[10px] text-ink-faint mt-1 ml-1">
                            Déjà trouvé par {players.find((p) => p.user_id === roundSolves.find((s) => s.field === f)?.user_id)?.display_name} — tente ta chance quand même !
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              <button onClick={submitGuess} className="w-full bg-gold hover:bg-glow text-white rounded-lg py-2.5 text-sm font-medium">
                Valider
              </button>
            </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {[...players].sort((a, b) => scoreFor(b.user_id) - scoreFor(a.user_id)).map((p) => (
          <span key={p.user_id} className="font-mono text-xs glass rounded-full px-3 py-1">
            {p.display_name} · <span className="text-gold">{scoreFor(p.user_id)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ReplayPanel({
  initialTheme,
  initialRounds,
  initialAnswerMode,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  initialTheme: string;
  initialRounds: number;
  initialAnswerMode: "text" | "qcm";
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (theme: string, rounds: number, answerMode: "text" | "qcm") => void;
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [rounds, setRounds] = useState(initialRounds);
  const [answerMode, setAnswerMode] = useState<"text" | "qcm">(initialAnswerMode);

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-32">
      <button onClick={onCancel} className="flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide">
        <ArrowLeft size={14} /> Annuler
      </button>
      <div className="px-0.5">
        <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-1">Rejouer — même salon</p>
        <p className="text-xs text-ink-faint mb-4">Même code, mêmes joueurs — change juste le thème ou le nombre de manches.</p>

        <div className="mb-6 -mx-1 px-1">
          <ThemePicker themeId={theme} onSelect={(id) => { sfx.click(); setTheme(id); }} />
        </div>

        <p className="text-xs text-ink-faint mb-2">Nombre de manches</p>
        <div className="flex gap-2 mb-6">
          {[10, 15, 20].map((n) => (
            <button
              key={n}
              onClick={() => setRounds(n)}
              className={`rounded-full px-4 py-1.5 text-sm font-mono transition-colors ${
                rounds === n ? "bg-gold text-white" : "glass text-ink-muted hover:text-ink"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <p className="text-xs text-ink-faint mb-2 flex items-center gap-2">
          Mode de réponse
          {!answerMode && (
            <span className="inline-flex items-center rounded-full bg-gold/15 text-gold px-2 py-0.5 text-[10px] font-bold">
              À choisir
            </span>
          )}
        </p>
        <div className="flex gap-2">
          {([
            { id: "qcm" as const, label: "Facile (QCM)" },
            { id: "text" as const, label: "Difficile (écrire)" },
          ]).map((o) => (
            <button
              key={o.id}
              onClick={() => setAnswerMode(o.id)}
              className={`flex-1 rounded-lg py-2 text-xs font-mono transition-colors ${
                answerMode === o.id ? "bg-gold text-white" : "glass text-ink-muted hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-riseNeg text-center">{error}</p>}

      <Magnetic strength={0.15} className="block w-full">
        <button
          onClick={() => onConfirm(theme, rounds, answerMode)}
          disabled={busy}
          className="cta-glow w-full bg-gold hover:bg-glow disabled:opacity-60 disabled:animate-none text-white rounded-full py-3.5 font-semibold flex items-center justify-center gap-2"
        >
          {busy ? "Lancement..." : "Relancer la partie"}
          {!busy && <Play size={18} />}
        </button>
      </Magnetic>
    </div>
  );
}

function RoomMenu({
  busy,
  error,
  joinCode,
  setJoinCode,
  onCreate,
  onJoin,
  onExit,
  party = false,
}: {
  busy: boolean;
  error: string | null;
  joinCode: string;
  setJoinCode: (v: string) => void;
  onCreate: (theme: string, rounds: number, answerMode: "text" | "qcm", gagesEnabled: boolean, gagesIntensity: "soft" | "hard") => void;
  onJoin: () => void;
  onExit?: () => void;
  party?: boolean;
}) {
  const [rounds, setRounds] = useState(10);
  const [theme, setTheme] = useState("mix");
  const [answerMode, setAnswerMode] = useState<"text" | "qcm" | null>(null);
  const [gagesEnabled, setGagesEnabled] = useState(party);
  const [gagesIntensity, setGagesIntensity] = useState<"soft" | "hard">("soft");
  const [needAnswerMode, setNeedAnswerMode] = useState(false);
  const answerModeRef = useRef<HTMLDivElement>(null);

  function handleCreate() {
    if (!answerMode) {
      setNeedAnswerMode(true);
      answerModeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onCreate(theme, rounds, answerMode, gagesEnabled, gagesIntensity);
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-40">
      {onExit && (
        <button
          onClick={onExit}
          className="tap-press inline-flex items-center gap-2 glass rounded-full pl-3 pr-4 py-2 text-xs font-medium text-ink-muted hover:text-ink hover:border-white/25 border border-white/10 transition-colors"
        >
          <ArrowLeft size={14} className="text-gold" /> Choix du mode
        </button>
      )}
      <div className="px-0.5">
        {party ? (
          <div className="mb-4">
            <h2 className="font-display text-2xl font-semibold leading-tight flex items-center gap-2.5">
              🎉 Mode Soirée
              <span className="inline-flex items-center rounded-full bg-gold text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                Nouveau
              </span>
            </h2>
            <p className="text-xs text-ink-faint mt-1.5 leading-relaxed">
              Le blind test version fête : un écran partagé sur la TV avec QR code et classement en
              direct, chacun joue sur son téléphone, et un gage attend le dernier du classement.
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <h2 className="font-display text-2xl font-semibold leading-tight">Créer un salon</h2>
            <p className="text-sm text-ink-faint mt-1.5 leading-snug">
              Choisis un thème et les règles — tes potes rejoignent avec un code à 5 lettres.
            </p>
          </div>
        )}

        <div className="mb-6 -mx-1 px-1">
          <ThemePicker themeId={theme} onSelect={(id) => { sfx.click(); setTheme(id); }} />
        </div>

        <p className="text-xs text-ink-faint mb-2">Nombre de manches</p>
        <div className="flex gap-2 mb-4">
          {[10, 15, 20].map((n) => (
            <button
              key={n}
              onClick={() => setRounds(n)}
              className={`rounded-full px-4 py-1.5 text-sm font-mono transition-colors ${
                rounds === n ? "bg-gold text-white" : "glass text-ink-muted hover:text-ink"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div
          ref={answerModeRef}
          className={`rounded-2xl p-3 -mx-3 transition-shadow ${
            needAnswerMode && !answerMode ? "ring-2 ring-riseNeg/60 shake-wrong" : ""
          }`}
        >
          <p className="text-xs text-ink-faint mb-2.5 flex items-center gap-2">
            Mode de réponse
            {!answerMode && (
              <span className="inline-flex items-center rounded-full bg-gold/15 text-gold px-2.5 py-0.5 text-[10px] font-bold">
                À choisir
              </span>
            )}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {([
              { id: "qcm" as const, label: "Facile", sub: "QCM — 3 choix", emoji: "🎯" },
              { id: "text" as const, label: "Difficile", sub: "Écrire la réponse", emoji: "✍️" },
            ]).map((o) => {
              const active = answerMode === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => {
                    sfx.click();
                    setAnswerMode(o.id);
                    setNeedAnswerMode(false);
                  }}
                  className={`tap-press rounded-xl border px-3 py-3.5 text-left transition-[border-color,box-shadow,background-color] ${
                    active
                      ? "border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(240,0,28,0.35)]"
                      : "border-white/10 glass hover:border-white/25"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-lg leading-none">{o.emoji}</span>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                        active ? "bg-gold text-white" : "bg-white/5 text-transparent"
                      }`}
                    >
                      <Check size={11} strokeWidth={3} />
                    </span>
                  </span>
                  <span className="block text-sm font-semibold mt-2">{o.label}</span>
                  <span className="block text-[11px] text-ink-faint mt-0.5">{o.sub}</span>
                </button>
              );
            })}
          </div>
          {needAnswerMode && !answerMode && (
            <p className="text-xs text-riseNeg mt-2.5">Choisis Facile ou Difficile pour créer la partie.</p>
          )}
        </div>

        <div
          className={`mt-5 rounded-2xl border p-4 transition-[border-color,background-color] ${
            gagesEnabled ? "border-gold/40 bg-gold/[0.06]" : "border-white/10 glass"
          }`}
        >
          <button
            type="button"
            role="switch"
            aria-checked={gagesEnabled}
            onClick={() => {
              sfx.click();
              setGagesEnabled((v) => !v);
            }}
            className="w-full flex items-center gap-3.5 text-left"
          >
            <span
              className={`icon-tile w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-xl transition-colors ${
                gagesEnabled ? "bg-gradient-to-br from-[#8a1216] to-[#FF3B4E] text-white" : "bg-white/5"
              }`}
            >
              🎉
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-sm font-semibold flex items-center gap-2">
                Mode gages
                {gagesEnabled && (
                  <span className="inline-flex items-center rounded-full bg-gold text-white px-2 py-0.5 text-[10px] font-bold">
                    Activé
                  </span>
                )}
              </span>
              <span className="block text-xs text-ink-faint mt-0.5 leading-snug">
                Un gage pour le dernier du classement, révélé en fin de partie.
              </span>
            </span>
            <span
              className={`shrink-0 w-12 h-7 rounded-full transition-colors relative ${
                gagesEnabled ? "bg-gold" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  gagesEnabled ? "translate-x-[26px]" : "translate-x-1"
                }`}
              />
            </span>
          </button>

          {gagesEnabled && (
            <div className="mt-3.5 pt-3.5 border-t border-white/8 animate-[solved-pop_0.35s_cubic-bezier(0.34,1.56,0.64,1)]">
              <p className="text-[11px] text-ink-faint mb-2">Intensité des gages</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "soft" as const, label: "Soft", sub: "Défis rap tout public" },
                  { id: "hard" as const, label: "Corsé", sub: "Plus embarrassant" },
                ]).map((o) => {
                  const active = gagesIntensity === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => {
                        sfx.click();
                        setGagesIntensity(o.id);
                      }}
                      className={`tap-press rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color] ${
                        active ? "border-gold bg-gold/10" : "border-white/10 hover:border-white/25"
                      }`}
                    >
                      <span className={`block text-xs font-semibold ${active ? "text-gold" : ""}`}>{o.label}</span>
                      <span className="block text-[10px] text-ink-faint mt-0.5">{o.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <p className="text-[10px] text-ink-faint mt-3">
            Jamais d&apos;alcool suggéré par le jeu — les gages restent au choix du groupe.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-riseNeg text-center">{error}</p>}

      <div
        className="fixed bottom-0 inset-x-0 z-30 px-4 pt-4 pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/90 to-transparent -z-10" aria-hidden="true" />
        <div className="max-w-lg mx-auto pointer-events-auto glass-strong rounded-2xl p-3 space-y-2.5">
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Code à 5 lettres"
              maxLength={5}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-center font-mono tracking-[0.2em] uppercase focus:outline-none focus:border-gold/50 min-h-[44px]"
            />
            <button
              onClick={onJoin}
              disabled={busy || joinCode.trim().length < 5}
              className="tap-press bg-white/8 hover:bg-white/12 disabled:opacity-40 text-ink rounded-lg px-5 text-sm font-medium min-h-[44px] transition-colors"
            >
              Rejoindre
            </button>
          </div>
          <Magnetic strength={0.15} className="block w-full">
            <button
              onClick={handleCreate}
              disabled={busy}
              className={`tap-press w-full text-white rounded-full min-h-[48px] font-semibold text-sm transition-colors ${
                answerMode ? "cta-glow bg-gold hover:bg-glow" : "bg-gold/50 hover:bg-gold/70"
              } disabled:opacity-60 disabled:animate-none`}
            >
              {party ? "Lancer la soirée" : "Créer une partie privée"}
            </button>
          </Magnetic>
        </div>
      </div>
    </div>
  );
}

function QcmChoicesRoom({
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
