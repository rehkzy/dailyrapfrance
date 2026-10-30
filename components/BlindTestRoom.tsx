"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Users, Copy, Check, ArrowLeft, SkipForward, Share2, VolumeX, RotateCcw, LogOut, Tv, ChevronRight } from "lucide-react";
import { THEME_OPTIONS } from "@/lib/themes";
import { fieldsFor, fieldPrompt, guessableFeats } from "@/lib/fields";
import { Icon } from "@iconify/react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { createClient } from "@/lib/supabase/client";
import { generateRoomCode } from "@/lib/roomCode";
import { checkGuess } from "@/lib/blindtest-match";
import { sfx } from "@/lib/sfx";
import { randomGage } from "@/lib/gages";
import { speedBonus } from "@/lib/scoring";
import { trackEvent } from "@/lib/track";
import { qcmStageOrder, qcmStageOptions, qcmIsCorrect, type QcmField } from "@/lib/qcmStages";
import ThemePicker from "@/components/ThemePicker";
import BrandLoader from "@/components/BrandLoader";
import RoomFriendInvites from "@/components/RoomFriendInvites";
import { DRMark3D } from "@/components/BlindTestLogo";
import type { User } from "@supabase/supabase-js";

type Track = { id: string; title: string; artistName: string; previewUrl: string; coverUrl: string | null; feats: string[] };
type FieldKey = "title" | "artist" | "feat";

function applicableFieldsFor(theme: string | undefined, track: { artistName: string; feats: string[] }): FieldKey[] {
  return fieldsFor(theme, track);
}
const ROUND_SECONDS = 25;
// Durée d'affichage du résultat avant que la manche suivante démarre — alignée avec le
// même correctif fait sur BlindTest.tsx (3.2s → 3.8s, jugé trop court par l'audit).
const REVEAL_SECONDS = 3.8;
// Petit sas de "Prépare-toi" avant que le décompte visible ne démarre. Le VRAI chrono
// serveur (round_started_at) ne bouge pas — indispensable pour que le bonus de rapidité
// reste juste et identique pour tout le monde — seule la couche d'affichage patiente un
// instant, pour adoucir l'effet "le compteur tourne déjà, ça met la pression" remonté à
// l'audit. Assez court pour ne pas donner l'impression d'un round plus long.
const PRE_ROUND_GRACE_SECONDS = 1.5;
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
  is_public?: boolean;
  starts_at?: string | null;
  created_at?: string;
  custom_ids?: number[] | null;
  custom_title?: string | null;
};
type PlayerRow = { room_id: string; user_id: string; display_name: string; ready?: boolean; done_round?: number | null };
type SolveRow = { room_id: string; round_index: number; field: FieldKey; user_id: string; bonus?: number | null };

export type RoomCustom = { title: string; ids: number[]; secs?: number; answer?: "qcm" | "text" };
export default function BlindTestRoomWrapper(props: {
  user: User;
  onExit?: () => void;
  initialCode?: string;
  party?: boolean;
  custom?: RoomCustom | null;
}) {
  return <BlindTestRoom {...props} />;
}

function BlindTestRoom({
  user,
  onExit,
  initialCode,
  party = false,
  custom = null,
}: {
  user: User;
  onExit?: () => void;
  initialCode?: string;
  party?: boolean;
  custom?: RoomCustom | null;
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
  // Comptes certifiés parmi les joueurs (badge à côté du pseudo, comme partout ailleurs)
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const ids = players.map((p) => p.user_id).filter((id) => !verifiedIds.has(id));
    if (!ids.length) return;
    supabase.from("profiles").select("id").eq("verified", true).in("id", ids).then(({ data }) => {
      if (data?.length) setVerifiedIds((prev) => new Set([...prev, ...data.map((d) => d.id as string)]));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);
  const [solves, setSolves] = useState<SolveRow[]>([]);

  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false);
  const [showIntro, setShowIntro] = useState(true);
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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "room_players", filter: `room_id=eq.${room.id}` }, (payload) => {
        const row = payload.new as PlayerRow;
        setPlayers((prev) => prev.map((p) => (p.user_id === row.user_id ? { ...p, ...row } : p)));
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
      setShowIntro(true);
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
      // Sas "Prépare-toi" — purement visuel, le vrai chrono (ci-dessous) tourne déjà
      // pareil pour tout le monde en arrière-plan, donc le bonus de rapidité reste juste.
      setShowIntro(elapsed < PRE_ROUND_GRACE_SECONDS);
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

  // « Je suis prêt » (lobby) et « J'ai fini / Passer » (manche) — chacun sur sa ligne room_players.
  const me = players.find((p) => p.user_id === user.id);
  async function toggleReady() {
    const r = roomRef.current;
    if (!r) return;
    const next = !me?.ready;
    setPlayers((prev) => prev.map((p) => (p.user_id === user.id ? { ...p, ready: next } : p)));
    sfx.click();
    await supabase.from("room_players").update({ ready: next }).eq("room_id", r.id).eq("user_id", user.id);
  }
  async function markDone() {
    const r = roomRef.current;
    if (!r) return;
    const round = r.current_round;
    setPlayers((prev) => prev.map((p) => (p.user_id === user.id ? { ...p, done_round: round } : p)));
    sfx.click();
    await supabase.from("room_players").update({ done_round: round }).eq("room_id", r.id).eq("user_id", user.id);
  }
  const readyCount = players.filter((p) => p.ready).length;
  const allReady = players.length > 0 && readyCount === players.length;

  /*
   * Matchmaking — compte à rebours partagé. L'hôte pose `starts_at` dans le salon dès qu'il
   * y a 2 joueurs (20 s ; une arrivée tardive garantit au moins 8 s), l'enlève s'il
   * redevient seul, et lance la partie quand le compte arrive à zéro. Tout le monde lit la
   * même horloge (la ligne du salon est synchronisée en temps réel).
   */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (screen !== "lobby" || !room?.is_public) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [screen, room?.is_public]);
  const startsIn = room?.starts_at ? Math.max(0, Math.ceil((new Date(room.starts_at).getTime() - now) / 1000)) : null;
  useEffect(() => {
    if (!isHost || !room?.is_public || screen !== "lobby" || room.status !== "lobby") return;
    if (players.length >= 2 && players.length < 8) {
      const target = room.starts_at ? new Date(room.starts_at).getTime() : 0;
      const minTarget = Date.now() + 8_000;
      if (!room.starts_at) void supabase.from("rooms").update({ starts_at: new Date(Date.now() + 20_000).toISOString() }).eq("id", room.id);
      else if (target < minTarget && players.length > (lastCountRef.current ?? 0)) void supabase.from("rooms").update({ starts_at: new Date(minTarget).toISOString() }).eq("id", room.id);
    } else if (players.length >= 8 && !room.starts_at) {
      void supabase.from("rooms").update({ starts_at: new Date(Date.now() + 3_000).toISOString() }).eq("id", room.id);
    } else if (players.length < 2 && room.starts_at) {
      void supabase.from("rooms").update({ starts_at: null }).eq("id", room.id);
    }
    lastCountRef.current = players.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length, room?.starts_at, room?.is_public, screen, isHost]);
  const lastCountRef = useRef<number | null>(null);
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!isHost || !room?.is_public || screen !== "lobby" || startsIn === null || startsIn > 0 || autoStartedRef.current || busy) return;
    if (players.length < 2) return;
    autoStartedRef.current = true;
    void startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startsIn, isHost, screen, players.length, busy]);

  const endRoundEarly = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    const past = new Date(Date.now() - ROUND_SECONDS * 1000).toISOString();
    await supabase.from("rooms").update({ round_started_at: past }).eq("id", r.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quand TOUS les joueurs ont fini la manche (tout trouvé, ou « Passer »), l'hôte l'écourte
  // automatiquement : on ne fait plus attendre la fin du chrono pour rien.
  const doneAllRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isHost || !room || screen !== "playing" || revealed || showIntro || players.length === 0) return;
    const t = room.tracks[room.current_round];
    if (!t) return;
    const fields = applicableFieldsFor(room.theme, t);
    const rs = solves.filter((sv) => sv.round_index === room.current_round);
    const everyoneDone = players.every((p) => p.done_round === room.current_round || fields.every((f) => rs.some((sv) => sv.field === f && sv.user_id === p.user_id)));
    const key = `${room.id}:${room.current_round}`;
    if (everyoneDone && doneAllRef.current !== key) {
      doneAllRef.current = key;
      const id = setTimeout(() => void endRoundEarly(), 700);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, solves, room?.current_round, screen, revealed, showIntro, isHost]);

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
    gagesIntensity: "soft" | "hard",
    isPublic = false
  ) {
    unlockAudio();
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
    // Interrupteurs de fonctionnalités pilotés depuis le back-office (Pilotage) — plus
    // ciblés que le mode maintenance global : coupent juste les salons, ou juste le mode
    // Soirée, sans bloquer le reste du site.
    try {
      const { data: rooms } = await supabase.from("site_settings").select("value").eq("key", "online_rooms").maybeSingle();
      const roomsValue = rooms?.value as { enabled?: boolean } | undefined;
      if (roomsValue && roomsValue.enabled === false) {
        setError("Les salons en ligne sont temporairement désactivés.");
        setBusy(false);
        return;
      }
    } catch {
      // en cas de doute, on laisse créer
    }
    if (party) {
      try {
        const { data: pm } = await supabase.from("site_settings").select("value").eq("key", "party_mode").maybeSingle();
        const partyValue = pm?.value as { enabled?: boolean } | undefined;
        if (partyValue && partyValue.enabled === false) {
          setError("🎉 Le mode Soirée est temporairement désactivé.");
          setBusy(false);
          return;
        }
      } catch {
        // en cas de doute, on laisse créer
      }
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
        is_public: isPublic,
        ...(custom ? { custom_ids: custom.ids, custom_title: custom.title } : {}),
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

  /*
   * Matchmaking — « Trouver des joueurs » : on cherche un salon PUBLIC en attente (créé il y a
   * moins de 15 min, moins de 8 joueurs, le plus ancien d'abord pour remplir les files) et on
   * le rejoint ; sinon on en ouvre un, thème au hasard, 10 manches, QCM. Le salon démarre tout
   * seul : dès 2 joueurs, un compte à rebours de 20 s (prolongé à chaque arrivée, 8 max).
   */
  async function quickMatch() {
    unlockAudio();
    setBusy(true);
    setError(null);
    try {
      const since = new Date(Date.now() - 15 * 60_000).toISOString();
      const { data: open } = await supabase
        .from("rooms")
        .select("*, room_players(user_id)")
        .eq("is_public", true)
        .eq("status", "lobby")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(10);
      const candidate = (open ?? []).find((r) => {
        const n = (r.room_players as { user_id: string }[] | null)?.length ?? 0;
        return n >= 1 && n < 8 && r.host_id !== user.id;
      });
      if (candidate) {
        const { error: joinErr } = await supabase.from("room_players").upsert({ room_id: candidate.id, user_id: user.id, display_name: displayName });
        if (!joinErr) {
          const { data: existing } = await supabase.from("room_players").select("*").eq("room_id", candidate.id);
          const { room_players: _rp, ...roomRow } = candidate as RoomRow & { room_players: unknown };
          setRoom(roomRow as RoomRow);
          setPlayers([...(existing ?? []).filter((p) => p.user_id !== user.id), { room_id: candidate.id, user_id: user.id, display_name: displayName }]);
          setScreen("lobby");
          setBusy(false);
          return;
        }
      }
    } catch {
      // on retombe sur la création
    }
    const pool = THEME_OPTIONS.filter((t) => t.id !== "mix" && t.id !== "custom");
    const theme = pool[Math.floor(Math.random() * pool.length)]?.id ?? "mix";
    await createRoom(theme, 10, "qcm", false, "soft", true);
  }

  async function joinRoom() {
    unlockAudio();
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
    unlockAudio();
    if (roomRef.current) void supabase.from("room_players").update({ ready: false, done_round: null }).eq("room_id", roomRef.current.id);
    if (!room) return;
    setBusy(true);
    try {
      const res = await fetch(room.custom_ids?.length ? `/api/blindtest/pool?ids=${room.custom_ids.join(",")}&count=${room.custom_ids.length}` : `/api/blindtest/pool?theme=${room.theme}&count=${room.rounds}`);
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

  // Lecture automatique : le navigateur exige UN geste pour autoriser le son. On le prend
  // sur les clics qui existent déjà (Créer / Rejoindre / Démarrer) en jouant un silence ;
  // ensuite chaque manche démarre toute seule, sans bouton. Si malgré tout le navigateur
  // refuse (page rechargée en pleine partie…), le bouton « Lancer le son » réapparaît.
  const audioUnlockedRef = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);
  const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
  function unlockAudio() {
    const a = unlockRef.current;
    if (!a || audioUnlockedRef.current) return;
    try {
      a.src = SILENT_WAV;
      a.play().then(() => { a.pause(); audioUnlockedRef.current = true; }).catch(() => {});
    } catch {}
    // (la source du vrai extrait est posée par l'effet ci-dessous dès que la manche arrive)
  }
  // UN SEUL élément audio pour toute la vie du salon : débloqué par le premier geste
  // (Créer / Rejoindre / Démarrer), il garde ce droit de lecture ; on ne change ensuite que
  // sa source à chaque manche. Avant, un nouvel élément <audio> était créé à chaque manche
  // — et iOS refuse parfois la lecture automatique sur un élément jamais touché : c'était
  // le « parfois ça se lance, parfois il faut cliquer ».
  const unlockRef = audioRef;
  const sharedAudio = (
    <audio
      ref={audioRef}
      preload="auto"
      loop
      onError={() => {
        if (screen !== "playing") return;
        if (started && !revealed) void recoverAudio(true);
        else setAudioError(true);
      }}
    />
  );

  function launchExtract(auto = false, attempt = 0) {
    if (revealedRef.current) return;
    setStarted(true);
    setAudioError(false);
    setNeedsTap(false);
    const a = audioRef.current;
    if (!a) return;
    a.play()
      .then(() => { audioUnlockedRef.current = true; })
      .catch((err: unknown) => {
        const name = (err as { name?: string })?.name ?? "";
        if (auto) {
          // Pas une interdiction du navigateur (NotAllowed) mais un « pas encore chargé » /
          // « interrompu par un nouveau chargement » : on réessaie dès que le fichier est prêt,
          // sans jamais redemander un tap — c'était ça, le « parfois il faut cliquer ».
          if (name !== "NotAllowedError" && attempt < 4) {
            const retry = () => { a.removeEventListener("canplay", retry); launchExtract(true, attempt + 1); };
            a.addEventListener("canplay", retry, { once: true });
            setTimeout(() => { a.removeEventListener("canplay", retry); if (!revealedRef.current && a.paused) launchExtract(true, attempt + 1); }, 500);
            return;
          }
          setStarted(false);
          setNeedsTap(true); // lecture auto refusée par le navigateur : on redemande un tap
        } else void recoverAudio(true);
      });
  }
  const [previewOverride, setPreviewOverride] = useState<Record<string, string>>({});
  // La source de l'extrait suit la manche (même élément, nouvelle URL)
  const previewUrlNow = track ? (previewOverride[track.id] ?? track.previewUrl) : null;
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !previewUrlNow) return;
    if (a.src !== previewUrlNow) {
      a.src = previewUrlNow;
      a.load();
    }
  }, [previewUrlNow]);
  // Fin du sas « Prépare-toi » → le son part tout seul
  useEffect(() => {
    if (screen !== "playing" || showIntro || revealed || started) return;
    const t = setTimeout(() => launchExtract(true), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, showIntro, room?.current_round]);

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
  // à son propre rythme, sur ses propres bonnes réponses uniquement. Depuis la migration
  // "solves par joueur", CHAQUE joueur qui trouve un champ marque ses points (la clé en
  // base est par joueur) — trouver après quelqu'un d'autre rapporte autant, seul le bonus
  // de rapidité récompense les plus vifs.
  const [myCorrectFields, setMyCorrectFields] = useState<Set<FieldKey>>(new Set());
  useEffect(() => {
    setMyCorrectFields(new Set());
  }, [room?.current_round, track?.id]);
  const currentQcmField = roomQcmStages.find((f) => !myCorrectFields.has(f)) ?? null;
  const qcmOptions = useMemo(() => {
    if (!track || room?.answer_mode !== "qcm" || !currentQcmField) return [];
    return qcmStageOptions(currentQcmField, currentQcmField === "feat" ? { ...track, feats: guessableFeats(room?.theme, track) } : track, (room?.tracks ?? []).filter((t) => t.id !== track.id));
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
    if (!qcmIsCorrect(currentQcmField, { ...track, feats: guessableFeats(room.theme, track) }, chosenLabel)) {
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
          ? guessableFeats(room.theme, track).some((f) => checkGuess(value, f, ""))
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
    const url = `${window.location.origin}/jouer?room=${room.code}`;
    const text = `Rejoins ma partie de Blind Test DailyRapFrance ! Code : ${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Blind Test DailyRapFrance", text, url });
        trackEvent("share_room", { method: "native_share" });
      } catch {
        // l'utilisateur a annulé le partage
      }
    } else {
      await navigator.clipboard.writeText(url);
      trackEvent("share_room", { method: "clipboard" });
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
    return (
      <>
        {sharedAudio}
        <RoomMenu busy={busy} error={error} joinCode={joinCode} setJoinCode={setJoinCode} onCreate={createRoom} onJoin={joinRoom} onQuickMatch={party || custom ? undefined : quickMatch} onExit={onExit} party={party} custom={custom} />
      </>
    );
  }

  if (screen === "lobby" && room) {
    return (
      <div className="max-w-lg mx-auto">
        {sharedAudio}
        <div className="fixed top-4 inset-x-0 z-40 pointer-events-none flex flex-col items-center gap-2">
          {notices.map((n) => (
            <span key={n.id} className="solved-pop ticket rounded-full px-4 py-2 text-xs font-medium text-ink-muted shadow-lg">
              {n.text}
            </span>
          ))}
        </div>
        {confirmingQuit ? (
          <div className="flex items-center gap-2 mb-6 text-sm">
            <span className="text-ink-muted">{isHost ? "Fermer le salon pour tout le monde ?" : "Quitter le salon ?"}</span>
            <button onClick={() => (isHost ? leaveRoom() : leaveIndividually())} disabled={busy} className="sticker sticker-sm">Confirmer</button>
            <button onClick={() => setConfirmingQuit(false)} className="sticker sticker-ghost sticker-sm">Annuler</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingQuit(true)}
            className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-6 min-h-[40px]"
          >
            <ArrowLeft size={16} /> Quitter le salon
          </button>
        )}
        {room.is_public && (
          <div className="ticket p-5 mb-4 text-center" aria-live="polite">
            <p className="stage-kicker mb-1 inline-flex items-center gap-1.5"><Icon icon="game-icons:crossed-swords" width={13} /> Partie publique</p>
            {players.length < 2 ? (
              <>
                <p className="font-display text-2xl font-extrabold leading-tight">Recherche de joueurs…</p>
                <p className="text-sm text-ink-muted mt-1">Tu es seul pour l&apos;instant. Dès qu&apos;un joueur arrive, le compte à rebours démarre. Tu peux aussi partager le code à un pote.</p>
                <div className="flex justify-center gap-1.5 mt-3" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full bg-gold animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
              </>
            ) : (
              <>
                <p className="font-display text-2xl font-extrabold leading-tight">{startsIn !== null && startsIn > 0 ? `Départ dans ${startsIn} s` : "C'est parti !"}</p>
                <p className="text-sm text-ink-muted mt-1">{players.length} / 8 joueurs · {room.custom_title ?? THEME_OPTIONS.find((t) => t.id === room.theme)?.label.replace(/^Blind Test /i, "") ?? room.theme} · {room.rounds} manches · {room.answer_mode === "qcm" ? "Facile" : "Difficile"}</p>
              </>
            )}
          </div>
        )}
        <div className="ticket p-6 md:p-8 text-center">
          <p className="text-sm font-semibold text-ink-muted mb-2">Code du salon — touche pour copier</p>
          <button onClick={copyCode} className="inline-flex items-center gap-3 mb-4 group" aria-label={`Copier le code ${room.code}`}>
            <span className="room-code text-ink">{room.code}</span>
            {copied ? <Check size={20} className="text-gold" /> : <Copy size={18} className="text-ink-faint group-hover:text-ink" />}
          </button>

          <div className="mb-6">
            <button onClick={shareRoom} className="sticker h-12 px-6">
              <Share2 size={15} />
              {shared ? "Lien envoyé !" : "Partager l'invitation"}
            </button>
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
              className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6"
            >
              <Tv size={13} /> Ouvrir l&apos;écran salon (TV / laptop)
            </a>
          )}

          <RoomFriendInvites userId={user.id} roomCode={room.code} />

          <div className="ticket p-4 mb-6">
            <p className="text-xs font-semibold text-ink-faint mb-3 flex items-center justify-center gap-1.5">
              <Users size={13} /> {players.length} joueur{players.length > 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((p) => (
                <span key={p.user_id} className={`rounded-full px-3 py-1.5 text-sm flex items-center gap-1.5 border ${p.ready ? "bg-gold/15 border-gold/50 text-ink" : "bg-white/6 border-white/10 text-ink-muted"}`}>
                  {p.user_id === room.host_id && <Icon icon="game-icons:crown" width={12} className="text-gold" />}
                  {p.display_name}
                  {verifiedIds.has(p.user_id) && <VerifiedBadge size={13} />}
                  {p.ready ? <Check size={13} strokeWidth={3} className="text-gold" /> : <span className="w-2 h-2 rounded-full bg-white/20" aria-label="pas encore prêt" />}
                </span>
              ))}
            </div>
            <p className="text-xs text-ink-faint mt-3">{readyCount} / {players.length} prêt{readyCount > 1 ? "s" : ""}</p>
          </div>

          <button type="button" onClick={toggleReady} aria-pressed={!!me?.ready} className={`w-full h-14 mb-3 ${me?.ready ? "sticker sticker-ghost" : "sticker"}`}>
            {me?.ready ? <><Check size={18} strokeWidth={3} /> Prêt — en attente des autres</> : <><Icon icon="game-icons:thumb-up" width={18} /> Je suis prêt</>}
          </button>

          {error && <p className="text-sm text-riseNeg mb-4">{error}</p>}

          {isHost ? (
            <button type="button" onClick={startGame} disabled={busy || players.length < 1} className={`sticker w-full h-16 text-lg disabled:opacity-50 ${allReady ? "cta-glow" : ""}`}>
              <Icon icon="game-icons:play-button" width={20} /> {busy ? "Chargement…" : allReady ? "Tout le monde est prêt — Démarrer" : `Démarrer (${readyCount}/${players.length} prêts)`}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-3 py-1">
              <BrandLoader size="sm" />
              <p className="text-sm text-ink-faint">{allReady ? "Tout le monde est prêt — l'hôte lance la partie." : "L'hôte lance la partie quand tout le monde est prêt."}</p>
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
        <p className="stage-kicker mb-4">Terminé</p>
        <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8">Résultats</h2>

        {room.gages_enabled && lastPlace && (
          <div className="rounded-2xl p-5 mb-8 border border-gold/40 bg-gold/10 text-left">
            <p className="stage-kicker mb-2">
              🎉 Gage pour {lastPlace.display_name}
            </p>
            <p className="text-sm font-medium">{gageText}</p>
          </div>
        )}

        {/* Podium — avant, la fin de salon en ligne n'avait qu'une liste plate, contrairement
            au mode local qui a déjà ce traitement. Même vocabulaire visuel (médaille +
            colonnes de hauteurs différentes) pour les 3 premiers ; le reste du classement
            garde la liste compacte en dessous. */}
        <div className="flex items-end justify-center gap-3 mb-10">
          {[ranked[1], ranked[0], ranked[2]].map((p, i) =>
            p ? (
              <div key={p.user_id} className={`flex flex-col items-center ${i === 1 ? "order-2" : i === 0 ? "order-1" : "order-3"}`}>
                <Icon
                  icon={i === 1 ? "game-icons:trophy" : "game-icons:podium-winner"}
                  width={i === 1 ? 28 : 20}
                  className={i === 1 ? "text-gold" : "text-ink-faint"}
                />
                <div
                  className={`rounded-t-xl w-20 sm:w-24 flex flex-col items-center justify-end pb-3 mt-2 border border-white/10 ${
                    i === 1 ? "h-28 bg-gold/20 border-gold/50" : i === 0 ? "h-20 bg-white/8" : "h-14 bg-white/5"
                  }`}
                >
                  <p className="text-xs font-medium truncate px-1 max-w-full">{p.display_name}</p>
                  <p className="stage-kicker">{scoreFor(p.user_id)}</p>
                </div>
              </div>
            ) : null
          )}
        </div>

        {ranked.length > 3 && (
          <div className="ticket divide-y divide-white/8 overflow-hidden mb-8 text-left">
            {ranked.slice(3).map((p, i) => (
              <div key={p.user_id} className="flex items-center gap-4 py-3 px-5">
                <span className="font-mono text-sm text-ink-faint w-6">{i + 4}</span>
                <span className="flex-1 text-sm font-medium">{p.display_name}</span>
                <span className="font-mono text-sm text-gold">{scoreFor(p.user_id)}</span>
              </div>
            ))}
          </div>
        )}

        <p className="stage-kicker mb-3 text-left">Récap de la partie</p>
        <div data-lenis-prevent className="ticket divide-y divide-white/8 overflow-x-hidden overflow-y-auto overscroll-contain mb-8 text-left max-h-96">
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
            <button type="button" onClick={() => setReplaying(true)} className="sticker h-14 px-7">
              <RotateCcw size={16} /> Rejouer — même salon
            </button>
          )}
          {confirmingQuit ? (
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="text-ink-muted">{isHost ? "Fermer le salon ?" : "Quitter le salon ?"}</span>
              <button onClick={() => (isHost ? leaveRoom() : leaveIndividually())} className="sticker sticker-sm">Confirmer</button>
              <button onClick={() => setConfirmingQuit(false)} className="sticker sticker-ghost sticker-sm">Annuler</button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmingQuit(true)}
              className="sticker sticker-ghost h-14 px-7"
            >
              <LogOut size={16} />
              Quitter le salon
            </button>
          )}
        </div>
        {!isHost && (
          <p className="text-xs text-ink-faint mt-4">
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
        <div className="ticket p-8">
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
            className="sticker sticker-ghost sticker-sm"
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
  // Plusieurs joueurs peuvent désormais avoir trouvé le même champ (chacun avec son propre
  // bonus de rapidité) — on liste tout le monde, pas juste le premier trouvé en base.
  const finders = (f: FieldKey) =>
    roundSolves
      .filter((s) => s.field === f)
      .map((s) => players.find((p) => p.user_id === s.user_id)?.display_name)
      .filter((n): n is string => !!n);
  const otherFinders = (f: FieldKey) =>
    roundSolves
      .filter((s) => s.field === f && s.user_id !== user.id)
      .map((s) => players.find((p) => p.user_id === s.user_id)?.display_name)
      .filter((n): n is string => !!n);

  return (
    <div className="feed" data-lenis-prevent>
      {sharedAudio}
      {track.coverUrl && <div className="round-bg feed-bg" data-revealed={revealed} data-playing={started && !revealed} style={{ backgroundImage: `url(${track.coverUrl})` }} aria-hidden="true" />}
      <div className="reel-shade" aria-hidden="true" />

      {/* Notifications (arrivées, départs…) et réactions des autres */}
      <div className="fixed top-[calc(env(safe-area-inset-top)+64px)] inset-x-0 z-40 pointer-events-none flex flex-col items-center gap-2">
        {notices.map((n) => (
          <span key={n.id} className="solved-pop rounded-full bg-black/60 border border-white/10 backdrop-blur px-4 py-2 text-xs font-medium text-ink">{n.text}</span>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-[40%] z-40 pointer-events-none flex justify-center">
        <div className="relative w-full max-w-lg h-0">
          {reactions.map((r) => (
            <span key={r.id} className="reaction-float absolute left-1/2 bottom-0 -translate-x-1/2 text-4xl" title={r.from}>{r.emoji}</span>
          ))}
        </div>
      </div>

      <div key={room.current_round} className="feed-slide">
        {/* Haut : quitter · progression · code du salon */}
        <div className="feed-top">
          {confirmingQuit ? (
            <div className="flex items-center gap-1 text-xs font-semibold shrink-0">
              <span className="text-ink-muted">{isHost ? "Fermer ?" : "Quitter ?"}</span>
              <button onClick={leaveRoom} className="text-riseNeg px-2 py-1 min-h-[36px]">Oui</button>
              <button onClick={() => setConfirmingQuit(false)} className="text-ink-faint px-2 py-1 min-h-[36px]">Non</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmingQuit(true)} aria-label={isHost ? "Quitter le salon (le ferme pour tout le monde)" : "Quitter le salon"} className="feed-icon"><LogOut size={15} /></button>
          )}
          <div className="flex-1 min-w-0">
            <div className="seg-progress" aria-hidden="true">
              {room.tracks.map((_, i) => (
                <span key={i} className="seg" data-state={i < room.current_round ? "done" : i === room.current_round ? "current" : undefined} />
              ))}
            </div>
            <p className="text-[11px] font-semibold text-ink-muted mt-1.5 truncate">Manche {room.current_round + 1} / {room.tracks.length} · {players.length} joueur{players.length > 1 ? "s" : ""}</p>
          </div>
          <button type="button" onClick={copyCode} aria-label="Copier le code du salon" className="h-10 px-3 rounded-full bg-black/45 border border-white/12 backdrop-blur font-mono text-xs font-bold tracking-[0.15em] text-glow inline-flex items-center gap-1.5 shrink-0">
            {room.code} {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>

        {/* Joueurs et scores */}
        <div className="feed-players">
          {[...players].sort((a, b) => scoreFor(b.user_id) - scoreFor(a.user_id)).map((p) => (
            <span key={p.user_id} className="player-chip" data-buzzed={p.user_id === user.id}>
              <span className="avatar">{(p.display_name ?? "?").slice(0, 2).toUpperCase()}</span>
              {p.display_name}
              {verifiedIds.has(p.user_id) && <VerifiedBadge size={12} />}
              <b>{scoreFor(p.user_id)}</b>
            </span>
          ))}
        </div>

        {/* Scène */}
        <div className="feed-scene">
          {revealed ? (
            <div className="feed-reveal solved-pop">
              {track.coverUrl && <img src={track.coverUrl} alt="" className="w-36 h-36 rounded-2xl object-cover mx-auto mb-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]" />}
              <p className="font-display text-3xl font-extrabold tracking-tight leading-tight">{track.title}</p>
              <p className="text-ink-muted text-lg mt-1">{track.artistName}</p>
              {track.feats.length > 0 && <p className="text-sm text-ink-faint mt-1">feat. {track.feats.join(", ")}</p>}
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                {applicable.map((f) => (
                  <span key={f} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${isSolved(f) ? "bg-gold text-white" : "bg-white/8 text-ink-faint line-through"}`}>
                    {isSolved(f) && <Check size={11} strokeWidth={3} />}
                    {f === "title" ? "Titre" : f === "artist" ? "Artiste" : "Feat"}
                    {isSolved(f) && ` · ${finders(f).join(", ")}`}
                  </span>
                ))}
              </div>
              {roundSolves.length === 0 && <p className="mt-4 text-sm text-ink-faint">Personne ne l&apos;a reconnu — il était dur celui-là.</p>}
              <p className="mt-4 text-xs text-ink-faint">Manche suivante dans un instant…</p>
            </div>
          ) : showIntro ? (
            <div className="text-center">
              <span className="feed-launch-ring mx-auto" style={{ animation: "none" }}><Icon icon="game-icons:headphones" width={34} /></span>
              <p className="stage-kicker mt-5">Manche {room.current_round + 1}</p>
              <p className="font-display text-2xl font-extrabold tracking-tight animate-pulse">Prépare-toi…</p>
            </div>
          ) : !started && needsTap ? (
            <button type="button" onClick={() => launchExtract()} className="feed-launch">
              <span className="feed-launch-ring"><Icon icon="game-icons:play-button" width={34} /></span>
              <span className="stage-kicker mt-5">Manche {room.current_round + 1}</span>
              <span className="font-display text-2xl font-extrabold tracking-tight">Touche pour lancer le son</span>
              <span className="text-xs text-ink-faint mt-1">Le chrono tourne pour tout le monde : {timeLeft} s</span>
            </button>
          ) : (
            <>
              {audioError && (
                <div className="solved-pop mb-4 flex items-center gap-2.5 bg-riseNeg/15 border border-riseNeg/40 rounded-xl px-3.5 py-2.5 text-left">
                  <VolumeX size={16} className="text-riseNeg shrink-0" />
                  <p className="text-xs flex-1">Le son n&apos;a pas pu se charger.</p>
                  <button type="button" onClick={retryAudio} className="text-xs font-semibold text-riseNeg inline-flex items-center gap-1"><RotateCcw size={12} /> Réessayer</button>
                </div>
              )}
              <div className="feed-disc" aria-hidden="true">
                <div className="feed-disc-inner vinyl-spin"><DRMark3D size="46%" /></div>
              </div>
              <div className="big-timer feed-timer" data-urgent={timeLeft <= 5} style={{ "--pct": Math.max(0, Math.min(100, (timeLeft / ROUND_SECONDS) * 100)) } as CSSProperties} role="timer" aria-label={`${timeLeft} secondes restantes`}>
                <span className={`score-num text-5xl ${timeLeft <= 5 ? "text-[#ffd166] urgent-pulse" : "text-ink"}`}>{timeLeft}</span>
              </div>
            </>
          )}
        </div>

        {/* Rail : réactions + passer (hôte) */}
        {!revealed && !showIntro && (
          <div className="feed-rail">
            {["🔥", "😭", "💀", "🎯", "👀"].map((e) => (
              <button key={e} type="button" onClick={() => sendReaction(e)} aria-label={`Réagir ${e}`} className="feed-rail-btn">
                <span className="feed-rail-icon text-xl">{e}</span>
              </button>
            ))}
            {isHost && (
              <button type="button" onClick={endRoundEarly} className="feed-rail-btn">
                <span className="feed-rail-icon"><SkipForward size={20} /></span>
                <span>Passer</span>
              </button>
            )}
          </div>
        )}

        {/* Bas : réponses — dès le début de la manche, clic ou pas */}
        <div className="feed-bottom">
          {!revealed && !showIntro && (() => {
            const rsNow = solves.filter((sv) => sv.round_index === room.current_round);
            const isDone = (p: PlayerRow) => p.done_round === room.current_round || applicable.every((f) => rsNow.some((sv) => sv.field === f && sv.user_id === p.user_id));
            const doneCount = players.filter(isDone).length;
            const meDone = me ? isDone(me) : false;
            return (
              <div className="flex items-center justify-between gap-3 mb-2 px-1">
                <span className="text-[11px] text-ink-faint">{doneCount} / {players.length} ont fini{doneCount === players.length && players.length > 0 ? " — on passe" : ""}</span>
                {!meDone ? (
                  <button type="button" onClick={markDone} className="text-xs font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-1 min-h-[36px] px-2"><SkipForward size={13} /> J&apos;ai fini / Passer</button>
                ) : (
                  <span className="text-xs font-semibold text-gold inline-flex items-center gap-1"><Check size={13} strokeWidth={3} /> Fini — on attend les autres</span>
                )}
              </div>
            );
          })()}
          {!revealed && !showIntro && (
            room.answer_mode === "qcm" ? (
              <QcmChoicesRoom
                options={qcmOptions}
                onPick={(label) => void submitRoomQcmChoice(label)}
                disabled={qcmChoiceLocked}
                lockedNote={qcmChoiceLocked ? "Raté pour cette manche — la réponse arrive à la fin du chrono." : null}
                wrongId={qcmWrongId}
                prompt={currentQcmField ? fieldPrompt(currentQcmField, room.theme, track) : ""}
                stageIndex={currentQcmField ? roomQcmStages.indexOf(currentQcmField) : 0}
                stageCount={roomQcmStages.length}
              />
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); void submitGuess(); }}
                className={`space-y-2 ${flash === "taken" ? "shake-wrong" : ""}`}
              >
                {applicable.map((f) =>
                  myCorrectFields.has(f) ? (
                    <div key={f} className="solved-pop answer !min-h-[52px] !bg-gold/15 !border-gold/40 text-glow text-sm">
                      <Check size={16} strokeWidth={3} />
                      {f === "title" ? "Titre" : f === "artist" ? "Artiste" : "Featuring"} trouvé
                      <span className="ml-auto text-xs text-ink-faint">toi{otherFinders(f).length > 0 ? ` + ${otherFinders(f).join(", ")}` : ""}</span>
                    </div>
                  ) : (
                    <div key={f}>
                      <input
                        value={guess[f]}
                        onChange={(e) => setGuess((g) => ({ ...g, [f]: e.target.value }))}
                        placeholder={fieldPrompt(f, room.theme, track, "placeholder")}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        className="answer-input"
                        style={f === "feat" ? { borderColor: "rgba(240,0,28,0.45)" } : undefined}
                      />
                      {isSolved(f) && <p className="text-[11px] text-ink-faint mt-1 ml-1">Déjà trouvé par {otherFinders(f).join(", ")} — tente ta chance quand même.</p>}
                    </div>
                  )
                )}
                <button type="submit" className="sticker w-full h-14"><Check size={18} strokeWidth={3} /> Valider</button>
              </form>
            )
          )}
        </div>
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
      <button onClick={onCancel} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink min-h-[40px]">
        <ArrowLeft size={16} /> Annuler
      </button>
      <div className="px-0.5">
        <p className="stage-kicker mb-1">Rejouer — même salon</p>
        <p className="text-xs text-ink-faint mb-4">Même code, mêmes joueurs — change juste le thème ou le nombre de manches.</p>

        <div className="mb-6 -mx-1 px-1">
          <ThemePicker themeId={theme} onSelect={(id) => { sfx.click(); setTheme(id); }} />
        </div>

        <p className="text-xs font-semibold text-ink-faint mb-2">Nombre de manches</p>
        <div className="segmented mb-6">
          {[10, 15, 20].map((n) => (
            <button key={n} type="button" aria-pressed={rounds === n} onClick={() => { sfx.click(); setRounds(n); }}>{n}</button>
          ))}
        </div>

        <p className="text-xs font-semibold text-ink-faint mb-2 flex items-center gap-2">
          Mode de réponse
          {!answerMode && (
            <span className="inline-flex items-center rounded-full bg-gold/15 text-gold px-2 py-0.5 text-[10px] font-bold">
              À choisir
            </span>
          )}
        </p>
        <div className="segmented">
          {([
            { id: "qcm" as const, label: "Facile (QCM)" },
            { id: "text" as const, label: "Difficile (écrire)" },
          ]).map((o) => (
            <button key={o.id} type="button" aria-pressed={answerMode === o.id} onClick={() => { sfx.click(); setAnswerMode(o.id); }}>{o.label}</button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-riseNeg text-center">{error}</p>}

      <button type="button" onClick={() => onConfirm(theme, rounds, answerMode)} disabled={busy} className="sticker w-full h-16 text-lg disabled:opacity-50">
        <Icon icon="game-icons:play-button" width={20} /> {busy ? "Lancement…" : "Relancer la partie"}
      </button>
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
  onQuickMatch,
  custom = null,
}: {
  busy: boolean;
  error: string | null;
  joinCode: string;
  setJoinCode: (v: string) => void;
  onCreate: (theme: string, rounds: number, answerMode: "text" | "qcm", gagesEnabled: boolean, gagesIntensity: "soft" | "hard") => void;
  onJoin: () => void;
  onQuickMatch?: () => void;
  onExit?: () => void;
  party?: boolean;
  custom?: RoomCustom | null;
}) {
  const [rounds, setRounds] = useState(custom ? custom.ids.length : 10);
  const [theme, setTheme] = useState(custom ? "custom" : "mix");
  const [surprise, setSurprise] = useState<string | null>(null);
  // 🎲 Un thème au hasard parmi les 80 (jamais « mix ») ; « tout au hasard » tire aussi les règles.
  function randomTheme() {
    const pool = THEME_OPTIONS.filter((t) => t.id !== "mix" && t.id !== "custom" && t.id !== theme);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function pickRandomTheme() {
    sfx.click();
    const t = randomTheme();
    setTheme(t.id);
    setSurprise(`🎲 ${t.label.replace(/^Blind Test /i, "")}`);
  }
  function pickRandomAll() {
    sfx.click();
    const t = randomTheme();
    const r = [10, 15, 20][Math.floor(Math.random() * 3)];
    const a = Math.random() < 0.6 ? "qcm" : "text";
    setTheme(t.id); setRounds(r); setAnswerMode(a); setNeedAnswerMode(false);
    setSurprise(`🎲 ${t.label.replace(/^Blind Test /i, "")} · ${r} manches · ${a === "qcm" ? "Facile" : "Difficile"}`);
  }
  const [answerMode, setAnswerMode] = useState<"text" | "qcm" | null>(custom?.answer ?? null);
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
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mt-3 min-h-[40px]"
        >
          <ArrowLeft size={16} /> Retour
        </button>
      )}
      <div className="px-0.5">
        {party ? (
          <div className="mb-4">
            <h2 className="font-display text-3xl font-extrabold tracking-tight leading-tight flex items-center gap-2.5">
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
            <h2 className="font-display text-3xl font-extrabold tracking-tight leading-tight">Créer un salon</h2>
            <p className="text-sm text-ink-faint mt-1.5 leading-snug">
              Choisis un thème et les règles — tes potes rejoignent avec un code à 5 lettres.
            </p>
          </div>
        )}

        {onQuickMatch && (
          <button type="button" onClick={onQuickMatch} disabled={busy} className="w-full action-row mb-5" data-primary="true">
            <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0 bg-white/15 text-white"><Icon icon="game-icons:crossed-swords" width={22} /></span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-semibold">Trouver des joueurs</span>
              <span className="block text-xs text-white/80">On te met avec des joueurs qui attendent — thème au hasard, 10 manches, ça démarre dès 2 joueurs.</span>
            </span>
            <ChevronRight size={18} className="shrink-0" />
          </button>
        )}

        {custom ? (
          <div className="ticket p-4 mb-6 flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0"><Icon icon="game-icons:music-spell" width={22} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold truncate">{custom.title}</span>
              <span className="block text-xs text-ink-faint">Blind test perso · {custom.ids.length} titres — les mêmes morceaux pour tout le salon, dans le même ordre.</span>
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button type="button" onClick={pickRandomTheme} className="sticker sticker-ghost sticker-sm"><Icon icon="game-icons:perspective-dice-six-faces-random" width={16} /> Thème au hasard</button>
              <button type="button" onClick={pickRandomAll} className="sticker sticker-ghost sticker-sm"><Icon icon="game-icons:rolling-dices" width={16} /> Tout au hasard</button>
            </div>
            {surprise && <p className="text-xs font-semibold text-gold mb-3 solved-pop">{surprise}</p>}

            <div className="mb-6 -mx-1 px-1">
              <ThemePicker themeId={theme} onSelect={(id) => { sfx.click(); setTheme(id); setSurprise(null); }} />
            </div>

            <p className="text-xs font-semibold text-ink-faint mb-2">Nombre de manches</p>
            <div className="segmented mb-4">
              {[10, 15, 20].map((n) => (
                <button key={n} type="button" aria-pressed={rounds === n} onClick={() => { sfx.click(); setRounds(n); }}>{n}</button>
              ))}
            </div>
          </>
        )}

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
                  className={`tap-press ticket !rounded-2xl px-3 py-3.5 text-left transition-[border-color,box-shadow,background-color] ${
                    active ? "!border-gold shadow-[0_0_0_1px_rgba(240,0,28,0.35)]" : "hover:!border-white/25"
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
                className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: gagesEnabled ? "translateX(20px)" : "translateX(0px)" }}
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
        className="stage-fixed bottom-0 inset-x-0 px-4 pt-4 pointer-events-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/90 to-transparent -z-10" aria-hidden="true" />
        <div className="max-w-lg mx-auto pointer-events-auto ticket p-3 space-y-2.5">
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
              className="answer-input flex-1 !min-h-[48px] text-center font-mono tracking-[0.25em] uppercase"
            />
            <button type="button" onClick={onJoin} disabled={busy || joinCode.trim().length < 5} className="sticker sticker-ghost sticker-sm shrink-0 disabled:opacity-40">
              Rejoindre
            </button>
          </div>
          <button type="button" onClick={handleCreate} disabled={busy} className="sticker w-full h-16 text-lg cta-glow disabled:opacity-50">
            <Icon icon="game-icons:play-button" width={20} /> {party ? "Lancer la soirée" : "Créer une partie privée"}
          </button>
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
  lockedNote,
}: {
  options: string[];
  onPick: (label: string) => void;
  disabled: boolean;
  wrongId: string | null;
  prompt: string;
  stageIndex: number;
  stageCount: number;
  lockedNote?: string | null;
}) {
  const keys = ["A", "B", "C", "D"];
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5 px-1">
        <p className="text-sm font-bold">{prompt}</p>
        {stageCount > 1 && (
          <span className="flex items-center gap-1" aria-label={`Étape ${stageIndex + 1} sur ${stageCount}`}>
            {Array.from({ length: stageCount }).map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i < stageIndex ? "w-1.5 bg-gold" : i === stageIndex ? "w-5 bg-gold" : "w-1.5 bg-white/20"}`} />
            ))}
          </span>
        )}
      </div>
      {lockedNote && <p className="text-xs font-semibold text-riseNeg mb-2 px-1 solved-pop">{lockedNote}</p>}
      <div className="feed-answers" key={prompt}>
        {options.map((label, i) => (
          <button key={label} type="button" onClick={() => onPick(label)} disabled={disabled} className="answer solved-pop" data-wrong={wrongId === label} style={disabled && lockedNote ? { opacity: 0.45 } : undefined}>
            <span className="answer-key">{keys[i]}</span>
            <span className="flex-1 truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
