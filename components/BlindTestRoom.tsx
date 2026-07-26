"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Users, Copy, Check, Crown, ArrowLeft, SkipForward, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateRoomCode } from "@/lib/roomCode";
import { checkGuess } from "@/lib/blindtest-match";
import { sfx } from "@/lib/sfx";
import Magnetic from "@/components/Magnetic";
import type { User } from "@supabase/supabase-js";

type Track = { id: string; title: string; artistName: string; previewUrl: string; coverUrl: string | null; feats: string[] };
type FieldKey = "title" | "artist" | "feat";
const ROUND_SECONDS = 25;
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
};
type PlayerRow = { room_id: string; user_id: string; display_name: string };
type SolveRow = { room_id: string; round_index: number; field: FieldKey; user_id: string };

export default function BlindTestRoom({
  user,
  onExit,
  initialCode,
}: {
  user: User;
  onExit?: () => void;
  initialCode?: string;
}) {
  const supabase = createClient();
  const [screen, setScreen] = useState<"menu" | "lobby" | "playing" | "final">("menu");
  const [joinCode, setJoinCode] = useState(initialCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [solves, setSolves] = useState<SolveRow[]>([]);

  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [guess, setGuess] = useState({ title: "", artist: "", feat: "" });
  const [flash, setFlash] = useState<"ok" | "taken" | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomRef = useRef<RoomRow | null>(null);
  roomRef.current = room;

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || "Joueur";
  const isHost = room?.host_id === user.id;
  const track: Track | undefined = room?.tracks?.[room.current_round];

  // ── Abonnements Realtime ────────────────────────────────────────────────
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room:${room.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` }, () => {
        // On relit la ligne complète depuis la base plutôt que de faire confiance au message
        // temps réel tel quel : la liste des morceaux (colonne "tracks") est volumineuse, et
        // rien ne garantit qu'elle arrive intacte dans le message de diffusion.
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
        setPlayers((prev) => [...prev, payload.new as PlayerRow]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_round_solves", filter: `room_id=eq.${room.id}` }, (payload) => {
        setSolves((prev) => [...prev, payload.new as SolveRow]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  // Filet de sécurité — tant qu'on est dans le lobby, on relit aussi la liste des joueurs
  // toutes les 3s, en plus du temps réel. Ça garantit que l'hôte voit toujours les arrivées,
  // même si un message temps réel est manqué. Effet séparé pour ne pas faire tomber/reprendre
  // l'abonnement principal à chaque changement d'écran.
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

  // Réagit aux changements de statut/manche envoyés par l'hôte
  useEffect(() => {
    if (!room) return;
    if (room.status === "playing") {
      setScreen("playing");
      setStarted(false);
      setGuess({ title: "", artist: "", feat: "" });
      setFlash(null);
      if (room.round_started_at) {
        const elapsed = (Date.now() - new Date(room.round_started_at).getTime()) / 1000;
        setTimeLeft(Math.max(0, Math.round(ROUND_SECONDS - elapsed)));
      }
    } else if (room.status === "finished") {
      sfx.victory();
      setScreen("final");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, room?.current_round]);

  // Chrono local, aligné sur round_started_at (même échéance pour tout le monde)
  useEffect(() => {
    if (screen !== "playing" || !started) return;
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          if (isHost) advanceRound();
          return 0;
        }
        if (t <= 6) sfx.tick();
        return t - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, started]);

  // L'hôte fait avancer la manche quand tous les champs applicables sont trouvés
  useEffect(() => {
    if (!isHost || !room || screen !== "playing" || !track) return;
    const roundSolves = solves.filter((s) => s.round_index === room.current_round);
    const applicable: FieldKey[] = track.feats.length ? ["title", "artist", "feat"] : ["title", "artist"];
    if (applicable.every((f) => roundSolves.some((s) => s.field === f))) {
      advanceRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solves, isHost]);

  const advanceRound = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    if (tickRef.current) clearInterval(tickRef.current);
    const next = r.current_round + 1;
    if (next >= r.tracks.length) {
      await supabase.from("rooms").update({ status: "finished" }).eq("id", r.id);
    } else {
      await supabase.from("rooms").update({ current_round: next, round_started_at: new Date().toISOString() }).eq("id", r.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Créer / rejoindre ────────────────────────────────────────────────────
  async function createRoom(theme: string, rounds: number) {
    setBusy(true);
    setError(null);
    const code = generateRoomCode();
    const { data, error: err } = await supabase
      .from("rooms")
      .insert({ code, host_id: user.id, theme, rounds })
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

  // Rejoint automatiquement si on arrive via un lien d'invitation partagé (?room=CODE) —
  // on ne redemande pas de retaper le code, c'est tout l'intérêt du bouton "Partager".
  const autoJoinedRef = useRef(false);
  useEffect(() => {
    if (!initialCode || autoJoinedRef.current) return;
    autoJoinedRef.current = true;
    joinRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

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
    setStarted(true);
    audioRef.current?.play().catch(() => {});
  }

  async function submitGuess() {
    if (!room || !track) return;
    const applicable: FieldKey[] = track.feats.length ? ["title", "artist", "feat"] : ["title", "artist"];
    const alreadySolved = new Set(solves.filter((s) => s.round_index === room.current_round).map((s) => s.field));
    let anyOk = false;

    for (const field of applicable) {
      if (alreadySolved.has(field)) continue;
      const value = guess[field];
      if (!value.trim()) continue;
      const match =
        field === "feat"
          ? track.feats.some((f) => checkGuess(value, f, ""))
          : field === "title"
          ? checkGuess(value, "", track.title)
          : checkGuess(value, track.artistName, "");
      if (!match) continue;

      const { error: insertErr } = await supabase
        .from("room_round_solves")
        .insert({ room_id: room.id, round_index: room.current_round, field, user_id: user.id });
      if (!insertErr) {
        anyOk = true;
        if (field === "feat") sfx.bonus();
        else sfx.correct();
      }
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

  function scoreFor(userId: string) {
    return solves.filter((s) => s.user_id === userId).reduce((sum, s) => sum + POINTS[s.field], 0);
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
        // l'utilisateur a annulé le partage — rien à faire
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

  // ── Rendu ──────────────────────────────────────────────────────────────

  if (screen === "menu") {
    return <RoomMenu busy={busy} error={error} joinCode={joinCode} setJoinCode={setJoinCode} onCreate={createRoom} onJoin={joinRoom} onExit={onExit} />;
  }

  if (screen === "lobby" && room) {
    return (
      <div className="max-w-lg mx-auto">
        <button onClick={leaveToMenu} className="flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink mb-6 font-mono uppercase tracking-wide">
          <ArrowLeft size={14} /> Retour
        </button>
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
            <p className="text-sm text-ink-faint font-mono">En attente que l'hôte démarre...</p>
          )}
        </div>
      </div>
    );
  }

  if (screen === "final" && room) {
    const ranked = [...players].sort((a, b) => scoreFor(b.user_id) - scoreFor(a.user_id));
    return (
      <div className="max-w-lg mx-auto text-center">
        <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Terminé</p>
        <h2 className="font-display text-3xl md:text-4xl font-semibold mb-8">Résultats</h2>
        <div className="card divide-y divide-white/8 overflow-hidden mb-8 text-left">
          {ranked.map((p, i) => (
            <div key={p.user_id} className="flex items-center gap-4 py-3.5 px-5">
              <span className="font-display text-lg w-6 text-center text-ink-faint">{i + 1}</span>
              <span className="flex-1 text-sm font-medium">{p.display_name}</span>
              <span className="font-mono text-gold">{scoreFor(p.user_id)} pts</span>
            </div>
          ))}
        </div>
        <button onClick={leaveToMenu} className="inline-flex items-center gap-2 bg-gold hover:bg-glow text-white rounded-full px-6 py-3 font-medium transition-colors">
          Nouveau salon
        </button>
      </div>
    );
  }

  // playing
  if (!room) return null;
  if (!track) {
    // Ne devrait plus arriver grâce à la relecture forcée ci-dessus, mais si jamais les
    // données ne sont vraiment pas encore là, on le montre au lieu de faire disparaître le
    // jeu sans explication — et on retente une lecture.
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
  const applicable: FieldKey[] = track.feats.length ? ["title", "artist", "feat"] : ["title", "artist"];
  const roundSolves = solves.filter((s) => s.round_index === room.current_round);
  const isSolved = (f: FieldKey) => roundSolves.some((s) => s.field === f);

  return (
    <div className="max-w-lg mx-auto">
      <audio key={track.id} ref={audioRef} src={track.previewUrl} preload="auto" />
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs text-ink-faint uppercase">
          Manche {room.current_round + 1} / {room.tracks.length}
        </span>
        <span className="font-mono text-xs text-ink-muted">Salon {room.code}</span>
      </div>

      <div className="card p-6 md:p-8 text-center mb-4 min-h-[320px] flex flex-col justify-center">
        {!started ? (
          <Magnetic strength={0.2}>
            <button onClick={launchExtract} className="mx-auto flex items-center gap-3 bg-gold hover:bg-glow text-white rounded-full px-8 py-4 font-medium transition-colors">
              <Play size={20} /> Lancer l'extrait
            </button>
          </Magnetic>
        ) : (
          <>
            <span className={`font-display text-2xl text-gold block mb-4 ${timeLeft <= 5 ? "urgent-pulse" : ""}`}>{timeLeft}</span>
            {isHost && (
              <button
                type="button"
                onClick={advanceRound}
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-ink-faint hover:text-ink glass rounded-full px-4 py-2 transition-colors"
              >
                <SkipForward size={13} />
                Personne ne trouve — passer
              </button>
            )}
            <div className={`space-y-2.5 max-w-sm mx-auto ${flash === "taken" ? "shake-wrong" : ""}`}>
              {(["title", "artist", "feat"] as FieldKey[])
                .filter((f) => applicable.includes(f))
                .map((f) => (
                  <div key={f}>
                    {isSolved(f) ? (
                      <div className="solved-pop w-full bg-gold/10 border border-gold/30 rounded-lg px-3 py-2 text-sm text-gold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Check size={14} />
                          {f === "title" ? "Titre" : f === "artist" ? "Artiste" : "Featuring"} trouvé
                        </span>
                        <span className="text-xs text-ink-faint">
                          {players.find((p) => p.user_id === roundSolves.find((s) => s.field === f)?.user_id)?.display_name}
                        </span>
                      </div>
                    ) : (
                      <input
                        value={guess[f]}
                        onChange={(e) => setGuess((g) => ({ ...g, [f]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && submitGuess()}
                        placeholder={f === "title" ? "Titre (1 pt)" : f === "artist" ? "Artiste (1 pt)" : "Featuring (+2 pts)"}
                        className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
                          f === "feat" ? "border-gold/30 focus:border-gold/60" : "border-white/10 focus:border-gold/50"
                        }`}
                      />
                    )}
                  </div>
                ))}
              <button onClick={submitGuess} className="w-full bg-gold hover:bg-glow text-white rounded-lg py-2.5 text-sm font-medium">
                Valider
              </button>
            </div>
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

const ROOM_THEMES = [
  { id: "mix", label: "Mix" },
  { id: "old", label: "À l'ancienne" },
  { id: "2010s", label: "Années 2010" },
  { id: "recent", label: "Sons récents" },
  { id: "pop", label: "Pop" },
  { id: "cloud", label: "Cloud rap" },
  { id: "lagui-sadek", label: "Lagui & Sadek" },
  { id: "93", label: "93" },
  { id: "91", label: "91" },
  { id: "92", label: "92" },
  { id: "77", label: "77" },
  { id: "78", label: "78" },
  { id: "13", label: "Marseille" },
  { id: "59", label: "59" },
  { id: "idf", label: "Île-de-France" },
];

function RoomMenu({
  busy,
  error,
  joinCode,
  setJoinCode,
  onCreate,
  onJoin,
  onExit,
}: {
  busy: boolean;
  error: string | null;
  joinCode: string;
  setJoinCode: (v: string) => void;
  onCreate: (theme: string, rounds: number) => void;
  onJoin: () => void;
  onExit?: () => void;
}) {
  const [rounds, setRounds] = useState(10);
  const [theme, setTheme] = useState("mix");

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {onExit && (
        <button onClick={onExit} className="flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide">
          <ArrowLeft size={14} /> Solo / local
        </button>
      )}
      <div className="card p-6">
        <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Créer un salon</p>

        <p className="text-xs text-ink-faint mb-2">Thème</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {ROOM_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                theme === t.id ? "bg-gold text-white" : "glass text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
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
        <Magnetic strength={0.15} className="block w-full">
          <button
            onClick={() => onCreate(theme, rounds)}
            disabled={busy}
            className="w-full bg-gold hover:bg-glow disabled:opacity-60 text-white rounded-full py-3 font-medium transition-colors"
          >
            Créer une partie privée
          </button>
        </Magnetic>
      </div>

      <div className="card p-6">
        <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Rejoindre un salon</p>
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
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-center font-mono tracking-[0.2em] uppercase focus:outline-none focus:border-gold/50"
          />
          <button
            onClick={onJoin}
            disabled={busy || joinCode.trim().length < 5}
            className="bg-gold hover:bg-glow disabled:opacity-40 text-white rounded-lg px-5 text-sm font-medium"
          >
            Rejoindre
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-riseNeg text-center">{error}</p>}
    </div>
  );
}
