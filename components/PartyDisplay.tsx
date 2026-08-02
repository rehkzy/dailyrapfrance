"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Crown, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DRMark3D } from "@/components/BlindTestLogo";
import Confetti from "@/components/Confetti";
import { randomGage } from "@/lib/gages";
import { THEME_OPTIONS } from "@/lib/themes";

/*
 * Écran partagé du "mode soirée" — à ouvrir sur une TV, un laptop posé au milieu du salon,
 * ou un iPad. Vue en LECTURE SEULE, sans le moindre input : le code du salon en gros, un QR
 * qui rejoint direct (chacun scanne avec son téléphone, qui devient sa manette), puis en
 * partie le numéro de manche + un décompte + le classement en direct — et maintenant, la
 * RÉVÉLATION du morceau à la fin de chaque manche (pochette, titre, artiste, qui a trouvé
 * quoi), qui manquait totalement : le décompte tombait à 0 et l'écran ne montrait jamais
 * la réponse ni qui l'avait trouvée — pourtant le moment le plus fun d'un blind test entre
 * potes, et le seul qui mérite vraiment le grand écran.
 *
 * Le son continue de jouer sur le téléphone de CHAQUE joueur (comportement déjà existant
 * des salons en ligne) — l'écran partagé n'a donc rien à jouer lui-même, ce qui est même
 * préférable : ça marche même avec de mauvais haut-parleurs de TV, et chacun peut mettre
 * un casque sans perturber les autres.
 */

const ROUND_SECONDS = 25;
const REVEAL_SECONDS = 3.2;
const POINTS: Record<string, number> = { title: 1, artist: 1, feat: 2 };

type FieldKey = "title" | "artist" | "feat";
type Track = { id: string; title: string; artistName: string; previewUrl: string; coverUrl: string | null; feats: string[] };

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
type SolveRow = { round_index: number; user_id: string; field: FieldKey; bonus?: number | null };

function applicableFieldsFor(theme: string | undefined, track: { feats: string[] }): FieldKey[] {
  const base: FieldKey[] = theme?.startsWith("artist-") ? ["title"] : ["title", "artist"];
  return track.feats.length ? [...base, "feat"] : base;
}

export default function PartyDisplay({ code }: { code: string }) {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [solves, setSolves] = useState<SolveRow[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Réactions emoji envoyées depuis les téléphones (BlindTestRoom.tsx) — même canal
  // temps réel, jamais affiché ici avant : la TV ne montrait aucune vie du salon entre
  // deux infos de score.
  const [reactions, setReactions] = useState<{ id: number; emoji: string; from: string }[]>([]);
  const reactionIdRef = useRef(0);

  const joinUrl = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/blindtest?room=${code}` : ""),
    [code]
  );

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, {
      width: 320,
      margin: 1,
      color: { dark: "#F5E8E8", light: "#00000000" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [joinUrl]);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setNotFound(true);
          return;
        }
        setRoom(data as RoomRow);
      });

    const channel = supabase
      .channel(`display:${code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${code.toUpperCase()}` }, (payload) => {
        setRoom(payload.new as RoomRow);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "rooms" }, () => {
        setRoom(null);
        setNotFound(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code]);

  useEffect(() => {
    if (!room) return;
    const supabase = createClient();

    supabase
      .from("room_players")
      .select("*")
      .eq("room_id", room.id)
      .then(({ data }) => setPlayers((data as PlayerRow[]) ?? []));
    supabase
      .from("room_round_solves")
      .select("*")
      .eq("room_id", room.id)
      .then(({ data }) => setSolves((data as SolveRow[]) ?? []));

    const channel = supabase
      .channel(`display-detail:${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${room.id}` }, () => {
        supabase
          .from("room_players")
          .select("*")
          .eq("room_id", room.id)
          .then(({ data }) => setPlayers((data as PlayerRow[]) ?? []));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_round_solves", filter: `room_id=eq.${room.id}` }, (payload) => {
        setSolves((prev) => [...prev, payload.new as SolveRow]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "room_round_solves", filter: `room_id=eq.${room.id}` }, () => {
        setSolves([]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  // Réactions emoji en direct — même nom de canal que côté téléphone (BlindTestRoom.tsx),
  // donc reçoit automatiquement tout ce qui est envoyé par n'importe quel joueur du salon.
  useEffect(() => {
    if (!room?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${room.id}`)
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        const id = reactionIdRef.current++;
        setReactions((prev) => [...prev, { id, emoji: payload.emoji, from: payload.from }]);
        setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2500);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  // Décompte + bascule vers la révélation — indicatif (les téléphones font foi pour le
  // vrai chrono), mais désormais on affiche vraiment la réponse une fois le temps écoulé,
  // au lieu de laisser l'écran figé sur "0" jusqu'à la manche suivante.
  useEffect(() => {
    if (room?.status !== "playing" || !room.round_started_at) {
      setRevealed(false);
      return;
    }
    const startedAt = new Date(room.round_started_at).getTime();
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setRemaining(Math.max(0, Math.ceil(ROUND_SECONDS - elapsed)));
      setRevealed(elapsed >= ROUND_SECONDS && elapsed < ROUND_SECONDS + REVEAL_SECONDS + 10);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room?.status, room?.round_started_at, room?.current_round]);

  function scoreFor(userId: string) {
    return solves.filter((s) => s.user_id === userId).reduce((sum, s) => sum + (POINTS[s.field] ?? 0) + (s.bonus ?? 0), 0);
  }

  // ⚠️ Hooks déclarés AVANT les retours anticipés (notFound / !room) : un hook appelé après
  // un return conditionnel change d'ordre entre les rendus → crash React côté client
  // ("Rendered more hooks than during the previous render") dès que le salon se charge.
  const gageText = useMemo(() => {
    if (!room?.gages_enabled) return "";
    return randomGage(room.gages_intensity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, room?.gages_enabled]);

  const themeOption = useMemo(() => THEME_OPTIONS.find((t) => t.id === room?.theme), [room?.theme]);
  const track = room?.tracks?.[room.current_round];
  const roundSolves = useMemo(
    () => solves.filter((s) => s.round_index === room?.current_round),
    [solves, room?.current_round]
  );
  const applicable = track ? applicableFieldsFor(room?.theme, track) : [];
  function findersFor(f: FieldKey) {
    return roundSolves
      .filter((s) => s.field === f)
      .map((s) => players.find((p) => p.user_id === s.user_id)?.display_name)
      .filter((n): n is string => !!n);
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <p className="text-ink-muted">
          Salon <span className="font-mono text-gold">{code}</span> introuvable ou fermé.
        </p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-16 h-16">
          <DRMark3D size="100%" />
        </span>
      </div>
    );
  }

  const ranked = [...players].sort((a, b) => scoreFor(b.user_id) - scoreFor(a.user_id));
  const lastPlace = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 py-10 text-center relative">
      {room.status === "finished" && ranked.length > 0 && <Confetti />}

      {/* Réactions emoji flottantes — envoyées depuis n'importe quel téléphone du salon */}
      <div className="fixed inset-x-0 bottom-10 z-40 pointer-events-none flex justify-center">
        <div className="relative w-full max-w-2xl h-0">
          {reactions.map((r) => (
            <span key={r.id} className="reaction-float absolute left-1/2 bottom-0 -translate-x-1/2 text-6xl" title={r.from}>
              {r.emoji}
            </span>
          ))}
        </div>
      </div>

      <span className="block w-20 h-20 mb-6">
        <DRMark3D size="100%" />
      </span>

      {room.status === "lobby" && (
        <>
          <p className="font-mono text-sm text-ink-faint uppercase tracking-[0.2em] mb-3">Scanne pour rejoindre</p>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR code pour rejoindre le salon" className="w-64 h-64 sm:w-80 sm:h-80 mb-6" />
          )}
          <p className="font-mono text-5xl sm:text-6xl font-bold tracking-[0.2em] text-gold mb-6">{room.code}</p>

          {/* Contexte de la partie — avant, personne devant la TV ne savait sur quoi on
              allait jouer tant que la première manche ne démarrait pas. */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
            {themeOption && (
              <span className="glass rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2">
                <themeOption.Icon size={15} className="text-gold" /> {themeOption.label}
              </span>
            )}
            <span className="glass rounded-full px-4 py-2 text-sm font-mono">{room.rounds} manches</span>
            <span className="glass rounded-full px-4 py-2 text-sm font-mono">
              {room.answer_mode === "qcm" ? "Facile" : "Difficile"}
            </span>
            {room.gages_enabled && (
              <span className="glass rounded-full px-4 py-2 text-sm font-mono text-gold">
                🎉 Gages {room.gages_intensity === "hard" ? "corsés" : "soft"}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {players.map((p) => (
              <span key={p.user_id} className="glass rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2">
                {p.user_id === room.host_id && <Crown size={14} className="text-gold" />}
                {p.display_name}
              </span>
            ))}
            {players.length === 0 && (
              <span className="text-ink-faint text-sm flex items-center gap-2">
                <Users size={16} /> En attente des premiers joueurs...
              </span>
            )}
          </div>
        </>
      )}

      {room.status === "playing" && !revealed && (
        <>
          <p className="font-mono text-sm text-ink-faint uppercase tracking-[0.2em] mb-2">
            Manche {room.current_round + 1} / {room.rounds}
          </p>
          <p className="font-display text-8xl sm:text-9xl font-extrabold text-gold mb-10 tabular-nums">{remaining}</p>
          <div className="w-full max-w-md space-y-2">
            {ranked.map((p, i) => (
              <div key={p.user_id} className="flex items-center justify-between glass rounded-xl px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="font-mono text-ink-faint w-5">{i + 1}</span>
                  {p.display_name}
                </span>
                <span className="font-mono font-bold text-gold">{scoreFor(p.user_id)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Révélation — LE moment qui manquait totalement : la réponse, et qui l'a trouvée,
          affichés en grand pendant que les téléphones font défiler leur propre révélation. */}
      {room.status === "playing" && revealed && track && (
        <div className="solved-pop max-w-xl">
          <p className="font-mono text-sm text-ink-faint uppercase tracking-[0.2em] mb-6">
            Manche {room.current_round + 1} / {room.rounds}
          </p>
          {track.coverUrl && (
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl object-cover mx-auto mb-6 shadow-2xl"
            />
          )}
          <p className="font-display text-4xl sm:text-5xl font-bold">{track.title}</p>
          <p className="text-lg sm:text-xl text-ink-muted mt-1.5">{track.artistName}</p>
          {track.feats.length > 0 && <p className="text-sm text-ink-faint mt-1">feat. {track.feats.join(", ")}</p>}

          <div className="flex items-center justify-center gap-2.5 flex-wrap mt-6">
            {applicable.map((f) => {
              const names = findersFor(f);
              return (
                <span
                  key={f}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-mono ${
                    names.length > 0 ? "bg-gold/15 text-gold" : "bg-white/5 text-ink-faint"
                  }`}
                >
                  {f === "title" ? "Titre" : f === "artist" ? "Artiste" : "Featuring"}
                  {names.length > 0 ? ` — ${names.join(", ")}` : ""}
                </span>
              );
            })}
          </div>
          {roundSolves.length === 0 && (
            <p className="mt-4 font-mono text-sm text-ink-faint">Personne n&apos;a trouvé — dur celui-là.</p>
          )}
        </div>
      )}

      {room.status === "finished" && (
        <>
          <p className="font-mono text-sm text-gold uppercase tracking-[0.2em] mb-6">Résultats</p>
          {room.gages_enabled && lastPlace && gageText && (
            <div className="rounded-2xl px-6 py-5 mb-8 border border-gold/40 bg-gold/10 max-w-md">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-2">
                🎉 Gage pour {lastPlace.display_name}
              </p>
              <p className="text-lg font-semibold">{gageText}</p>
            </div>
          )}
          <div className="w-full max-w-md space-y-2.5">
            {ranked.map((p, i) => (
              <div
                key={p.user_id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  i === 0 ? "bg-gold/15 border border-gold/40" : "glass"
                }`}
              >
                <span className="flex items-center gap-2.5 text-base font-semibold">
                  {i === 0 && <Crown size={18} className="text-gold" />}
                  <span className="font-mono text-ink-faint w-6">{i + 1}</span>
                  {p.display_name}
                </span>
                <span className="font-mono font-bold text-lg text-gold">{scoreFor(p.user_id)}</span>
              </div>
            ))}
          </div>
          {qrDataUrl && (
            <div className="mt-10">
              <p className="font-mono text-xs text-ink-faint uppercase tracking-[0.2em] mb-3">Rejouer — même salon</p>
              <img src={qrDataUrl} alt="QR code pour rejoindre le salon" className="w-40 h-40 mx-auto" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
