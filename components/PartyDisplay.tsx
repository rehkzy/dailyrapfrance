"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Crown, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DRMark3D } from "@/components/BlindTestLogo";
import { randomGage } from "@/lib/gages";

/*
 * Écran partagé du "mode soirée" — à ouvrir sur une TV, un laptop posé au milieu du salon,
 * ou un iPad. Vue en LECTURE SEULE, sans le moindre input : le code du salon en gros, un QR
 * qui rejoint direct (chacun scanne avec son téléphone, qui devient sa manette), puis en
 * partie le numéro de manche + un décompte + le classement en direct.
 *
 * Le son continue de jouer sur le téléphone de CHAQUE joueur (comportement déjà existant
 * des salons en ligne) — l'écran partagé n'a donc rien à jouer lui-même, ce qui est même
 * préférable : ça marche même avec de mauvais haut-parleurs de TV, et chacun peut mettre
 * un casque sans perturber les autres.
 */

const POINTS: Record<string, number> = { title: 1, artist: 1, feat: 2 };

type RoomRow = {
  id: string;
  code: string;
  host_id: string;
  theme: string;
  rounds: number;
  status: "lobby" | "playing" | "finished";
  current_round: number;
  round_started_at: string | null;
  gages_enabled: boolean;
  gages_intensity: "soft" | "hard";
};
type PlayerRow = { room_id: string; user_id: string; display_name: string };
type SolveRow = { user_id: string; field: "title" | "artist" | "feat"; bonus?: number | null };

export default function PartyDisplay({ code }: { code: string }) {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [solves, setSolves] = useState<SolveRow[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

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

  // Décompte visuel — purement indicatif (les téléphones font foi pour le vrai chrono).
  useEffect(() => {
    if (room?.status !== "playing" || !room.round_started_at) return;
    const ROUND_SECONDS = 25;
    const tick = () => {
      const elapsed = (Date.now() - new Date(room.round_started_at as string).getTime()) / 1000;
      setRemaining(Math.max(0, Math.ceil(ROUND_SECONDS - elapsed)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room?.status, room?.round_started_at]);

  function scoreFor(userId: string) {
    return solves.filter((s) => s.user_id === userId).reduce((sum, s) => sum + (POINTS[s.field] ?? 0) + (s.bonus ?? 0), 0);
  }

  // ⚠️ Hook déclaré AVANT les retours anticipés (notFound / !room) : un hook appelé après
  // un return conditionnel change d'ordre entre les rendus → crash React côté client
  // ("Rendered more hooks than during the previous render") dès que le salon se charge.
  const gageText = useMemo(() => {
    if (!room?.gages_enabled) return "";
    return randomGage(room.gages_intensity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, room?.gages_enabled]);

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
    <div className="min-h-screen flex flex-col items-center justify-center px-8 py-10 text-center">
      <span className="block w-20 h-20 mb-6">
        <DRMark3D size="100%" />
      </span>

      {room.status === "lobby" && (
        <>
          <p className="font-mono text-sm text-ink-faint uppercase tracking-[0.2em] mb-3">Scanne pour rejoindre</p>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR code pour rejoindre le salon" className="w-64 h-64 sm:w-80 sm:h-80 mb-6" />
          )}
          <p className="font-mono text-5xl sm:text-6xl font-bold tracking-[0.2em] text-gold mb-8">{room.code}</p>
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

      {room.status === "playing" && (
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
