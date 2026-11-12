"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Crown, Volume2, VolumeX, Maximize2, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DRMark3D } from "@/components/BlindTestLogo";
import BrandMark from "@/components/BrandMark";
import Confetti from "@/components/Confetti";
import { randomGage } from "@/lib/gages";
import { THEME_OPTIONS } from "@/lib/themes";
import { sfx } from "@/lib/sfx";
import { isSoundbiteTheme } from "@/lib/gimmicks";
import { fieldsFor } from "@/lib/fields";

/*
 * L'ÉCRAN DE LA SOIRÉE — à ouvrir sur la TV (navigateur de la TV, ordi en HDMI, Chromecast).
 *
 *  · C'est LUI qui joue le son : fort, pour toute la pièce, une seule source. Les téléphones
 *    des joueurs sont muets (bascule « casque » sur chacun pour ceux qui préfèrent).
 *    Le navigateur exige un geste avant de jouer : d'où l'écran « Appuie pour démarrer ».
 *  · Lecture seule : aucun bouton de jeu ici, le téléphone de l'hôte est la télécommande.
 *  · Lobby : QR géant + code + joueurs qui arrivent. Manche : disque, décompte, classement.
 *    Révélation : pochette, titre, qui a trouvé. Final : podium, gage, QR pour rejouer.
 *  · Les réactions emoji et le chat des téléphones s'affichent ici, en direct.
 */

const REVEAL_SECONDS = 3.2;
const POINTS: Record<string, number> = { title: 1, artist: 1, feat: 2 };

type FieldKey = "title" | "artist" | "feat";
type Track = { id: string; title: string; artistName: string; previewUrl: string; coverUrl: string | null; feats: string[] };
type RoomRow = {
  id: string; code: string; host_id: string; theme: string; rounds: number; tracks: Track[];
  status: "lobby" | "playing" | "finished"; current_round: number; round_started_at: string | null;
  answer_mode: "text" | "qcm"; gages_enabled: boolean; gages_intensity: "soft" | "hard"; round_seconds?: number | null; custom_title?: string | null;
};
type PlayerRow = { room_id: string; user_id: string; display_name: string; ready?: boolean; spectator?: boolean };
type SolveRow = { round_index: number; user_id: string; field: FieldKey; bonus?: number | null };
type Msg = { id: number; name: string; text: string };

function initials(n: string) { return n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join(""); }
const HUES = [0, 350, 12, 345, 8, 355, 20, 340];
function avatarStyle(name: string) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; const hue = HUES[h % HUES.length]; return { background: `linear-gradient(135deg, hsl(${hue} 95% 52%), hsl(${hue} 90% 28%))` }; }

export default function PartyDisplay({ code }: { code: string }) {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [solves, setSolves] = useState<SolveRow[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [armed, setArmed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; from: string }[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const idRef = useRef(0);
  const audio = useRef<HTMLAudioElement>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const joinUrl = useMemo(() => (typeof window !== "undefined" ? `${window.location.origin}/jouer?mode=online&room=${code}` : ""), [code]);
  useEffect(() => { if (joinUrl) QRCode.toDataURL(joinUrl, { width: 640, margin: 1, color: { dark: "#0a0707", light: "#ffffff" } }).then(setQr).catch(() => setQr(null)); }, [joinUrl]);

  /* ── Données ── */
  useEffect(() => {
    const supabase = createClient();
    supabase.from("rooms").select("*").eq("code", code.toUpperCase()).maybeSingle().then(({ data }) => { if (!data) setNotFound(true); else setRoom(data as RoomRow); });
    const ch = supabase.channel(`display:${code}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${code.toUpperCase()}` }, (p) => setRoom(p.new as RoomRow))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "rooms" }, () => { setRoom(null); setNotFound(true); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [code]);

  useEffect(() => {
    if (!room?.id) return;
    const supabase = createClient();
    const loadPlayers = () => supabase.from("room_players").select("*").eq("room_id", room.id).then(({ data }) => setPlayers(((data as PlayerRow[]) ?? []).filter((p) => !p.spectator)));
    void loadPlayers();
    supabase.from("room_round_solves").select("*").eq("room_id", room.id).then(({ data }) => setSolves((data as SolveRow[]) ?? []));
    const ch = supabase.channel(`display-detail:${room.id}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${room.id}` }, () => void loadPlayers())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_round_solves", filter: `room_id=eq.${room.id}` }, (p) => { setSolves((prev) => [...prev, p.new as SolveRow]); sfx.click(); })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "room_round_solves", filter: `room_id=eq.${room.id}` }, () => setSolves([]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${room.id}` }, (p) => {
        const m = p.new as { name: string; text: string };
        const id = idRef.current++;
        setMsgs((prev) => [...prev.slice(-3), { id, name: m.name, text: m.text }]);
        setTimeout(() => setMsgs((prev) => prev.filter((x) => x.id !== id)), 7000);
      })
      .subscribe();
    const rx = supabase.channel(`room:${room.id}`).on("broadcast", { event: "reaction" }, ({ payload }) => {
      const id = idRef.current++;
      setReactions((prev) => [...prev, { id, emoji: payload.emoji, from: payload.from }]);
      setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2600);
    }).subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(rx); };
  }, [room?.id]);

  /* ── Chrono ── */
  const roundSecs = Number(room?.round_seconds) || 25;
  useEffect(() => {
    if (room?.status !== "playing" || !room.round_started_at) { setRevealed(false); return; }
    const startedAt = new Date(room.round_started_at).getTime();
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setRemaining(Math.max(0, Math.ceil(roundSecs - elapsed)));
      setRevealed(elapsed >= roundSecs && elapsed < roundSecs + REVEAL_SECONDS + 12);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [room?.status, room?.round_started_at, room?.current_round, roundSecs]);

  /* ── Son : la TV joue l'extrait de la manche ── */
  const track = room?.tracks?.[room.current_round];
  const soundbite = isSoundbiteTheme(room?.theme);
  const stopFade = useCallback(() => { if (fadeRef.current) { clearInterval(fadeRef.current); fadeRef.current = null; } }, []);
  useEffect(() => {
    const a = audio.current;
    if (!a || !armed) return;
    if (room?.status !== "playing" || !track || revealed) {
      // fondu puis pause
      if (!a.paused) { stopFade(); let v = a.volume; fadeRef.current = setInterval(() => { v = Math.max(0, v - 0.08); a.volume = v; if (v <= 0) { stopFade(); a.pause(); a.volume = 1; } }, 60); }
      return;
    }
    let cancelled = false;
    (async () => {
      stopFade(); a.volume = 1; a.loop = !soundbite;
      let src = track.previewUrl;
      try { const r = await fetch(`/api/blindtest/preview?id=${track.id}`, { cache: "no-store" }); if (r.ok) src = ((await r.json()) as { previewUrl?: string }).previewUrl || src; } catch {}
      if (cancelled) return;
      if (a.src !== src) { a.src = src; a.load(); }
      // on se cale sur l'horloge de la manche si on arrive en cours
      const startedAt = room.round_started_at ? new Date(room.round_started_at).getTime() : Date.now();
      const offset = Math.max(0, (Date.now() - startedAt) / 1000) % 30;
      const go = () => { try { a.currentTime = offset; } catch {} void a.play().catch(() => {}); };
      if (a.readyState >= 2) go(); else a.addEventListener("canplay", go, { once: true });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, room?.status, room?.current_round, room?.round_started_at, revealed, track?.id]);
  useEffect(() => { if (audio.current) audio.current.muted = muted; }, [muted]);

  /* ── Signature sonore ── */
  const prevStatus = useRef<string | null>(null);
  useEffect(() => {
    const st = room?.status ?? null, prev = prevStatus.current; prevStatus.current = st;
    if (!prev || prev === st || !armed) return;
    if (st === "playing" && prev === "lobby") sfx.tag(0.9);
    if (st === "finished") { sfx.tag(0.9); if (room?.gages_enabled && !soundbite) setTimeout(() => sfx.gimmick("lose", 1, { force: true }), 2300); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, armed]);

  function arm() {
    setArmed(true);
    const a = audio.current;
    if (a) { a.muted = false; a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="; void a.play().then(() => a.pause()).catch(() => {}); }
    sfx.click();
    try { void document.documentElement.requestFullscreen?.(); } catch {}
  }
  function fullscreen() { try { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen(); } catch {} }

  /* ── Dérivés ── */
  const scoreFor = (uid: string) => solves.filter((s) => s.user_id === uid).reduce((sum, s) => sum + (POINTS[s.field] ?? 0) + (s.bonus ?? 0), 0);
  const ranked = [...players].sort((a, b) => scoreFor(b.user_id) - scoreFor(a.user_id));
  const themeOption = useMemo(() => THEME_OPTIONS.find((t) => t.id === room?.theme), [room?.theme]);
  const themeLabel = room?.custom_title ?? themeOption?.label.replace(/^Blind Test /i, "") ?? room?.theme ?? "";
  const roundSolves = useMemo(() => solves.filter((s) => s.round_index === room?.current_round), [solves, room?.current_round]);
  const applicable = track ? fieldsFor(room?.theme, track) : [];
  const findersFor = (f: FieldKey) => roundSolves.filter((s) => s.field === f).map((s) => players.find((p) => p.user_id === s.user_id)?.display_name).filter((n): n is string => !!n);
  const gageText = useMemo(() => (room?.gages_enabled ? randomGage(room.gages_intensity) : ""), [room?.status, room?.gages_enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const progress = room?.status === "playing" ? Math.max(0, Math.min(1, 1 - remaining / roundSecs)) : 0;

  /* ── Rendus ── */
  if (notFound) return <div className="tv tv-center"><p className="tv-h2">Salon <span className="text-gold">{code}</span> introuvable ou fermé.</p><p className="tv-sub">Demande le nouveau code à l&apos;hôte.</p></div>;
  if (!room) return <div className="tv tv-center"><span className="w-24 h-24"><DRMark3D size="100%" /></span></div>;

  if (!armed) {
    return (
      <div className="tv tv-center">
        <span className="w-28 h-28 mb-6"><DRMark3D size="100%" /></span>
        <h1 className="tv-h1">Soirée <span className="text-gold">{room.code}</span></h1>
        <p className="tv-sub mb-10">{themeLabel} · {room.rounds} manches</p>
        <button type="button" onClick={arm} className="tv-arm"><Play size={34} fill="currentColor" className="ml-1" /><span>Appuie pour démarrer l&apos;écran</span></button>
        <p className="tv-sub mt-6">Le son de la soirée sortira d&apos;ici. Monte le volume de la TV.</p>
      </div>
    );
  }

  return (
    <div className="tv">
      <audio ref={audio} preload="auto" />
      {room.status === "finished" && ranked.length > 0 && <Confetti />}

      {/* Barre haute */}
      <header className="tv-top">
        <span className="flex items-center gap-3"><BrandMark size={22} /><span className="tv-brand">dailyrap</span></span>
        <span className="tv-pill">{themeOption && <themeOption.Icon size={16} className="text-gold" />}{themeLabel}</span>
        <span className="tv-pill tv-code">{room.code}</span>
        <span className="flex items-center gap-2 ml-auto">
          <button type="button" onClick={() => setMuted((m) => !m)} className="tv-icon" aria-label={muted ? "Remettre le son" : "Couper le son"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <button type="button" onClick={fullscreen} className="tv-icon" aria-label="Plein écran"><Maximize2 size={18} /></button>
        </span>
      </header>

      {/* Réactions + chat */}
      <div className="tv-reactions" aria-hidden="true">{reactions.map((r) => <span key={r.id} className="reaction-float absolute left-1/2 bottom-0 -translate-x-1/2" style={{ fontSize: 72 }}>{r.emoji}</span>)}</div>
      <div className="tv-chat">{msgs.map((m) => <div key={m.id} className="tv-msg"><b>{m.name}</b> {m.text}</div>)}</div>

      {/* LOBBY */}
      {room.status === "lobby" && (
        <main className="tv-lobby">
          <section className="tv-qr-card">
            {qr && <img src={qr} alt="QR code pour rejoindre" className="tv-qr" />}
            <p className="tv-qr-title">Scanne pour jouer</p>
            <p className="tv-qr-sub">ou va sur <b>dailyrapfrance.best/jouer</b> et tape</p>
            <p className="tv-bigcode">{room.code}</p>
          </section>
          <section className="tv-lobby-right">
            <p className="tv-kicker">La soirée</p>
            <h1 className="tv-h1">{themeLabel}</h1>
            <p className="tv-sub">{room.rounds} manches · {roundSecs} s par extrait · {room.answer_mode === "qcm" ? "QCM" : "réponse écrite"}{room.gages_enabled ? ` · gages ${room.gages_intensity === "hard" ? "corsés" : "soft"}` : ""}</p>
            <ol className="tv-steps">
              <li><b>1</b> Scanne le QR avec ton téléphone</li>
              <li><b>2</b> Mets ton pseudo, appuie sur Prêt</li>
              <li><b>3</b> Le son part d&apos;ici, tu réponds sur ton téléphone</li>
            </ol>
            <div className="tv-players">
              {players.map((p) => (
                <span key={p.user_id} className="tv-player solved-pop" data-ready={!!p.ready}>
                  <span className="tv-avatar" style={avatarStyle(p.display_name)}>{initials(p.display_name)}</span>
                  <span className="truncate">{p.display_name}</span>
                  {p.user_id === room.host_id && <Crown size={14} className="text-gold shrink-0" />}
                </span>
              ))}
              {players.length === 0 && <span className="tv-sub">En attente des premiers joueurs…</span>}
            </div>
            <p className="tv-sub mt-auto">{players.length} joueur{players.length > 1 ? "s" : ""} · l&apos;hôte lance depuis son téléphone</p>
          </section>
        </main>
      )}

      {/* MANCHE */}
      {room.status === "playing" && !revealed && (
        <main className="tv-round">
          <section className="tv-stage">
            <p className="tv-kicker">Manche {room.current_round + 1} / {room.rounds}</p>
            <div className="tv-disc-wrap">
              <div className="tv-ring" style={{ background: `conic-gradient(var(--red) ${progress * 360}deg, rgba(255,255,255,0.08) 0)` }}>
                <div className="tv-disc"><span className="tv-disc-label" /></div>
              </div>
              <p className={`tv-count ${remaining <= 5 ? "urgent-pulse" : ""}`}>{remaining}</p>
            </div>
            <p className="tv-h2">{applicable.includes("feat") ? "Titre, artiste… et le feat ?" : applicable.includes("artist") ? "C'est qui ? C'est quoi ?" : "Quel titre ?"}</p>
            <p className="tv-sub">{roundSolves.length === 0 ? "Personne n'a encore trouvé" : (() => { const n = new Set(roundSolves.map((s) => s.user_id)).size; return `${n} joueur${n > 1 ? "s ont" : " a"} déjà trouvé`; })()}</p>
          </section>
          <aside className="tv-board">
            <p className="tv-kicker">Classement</p>
            <ol>
              {ranked.slice(0, 10).map((p, i) => {
                const sc = scoreFor(p.user_id); const top = scoreFor(ranked[0]?.user_id ?? "") || 1;
                const foundNow = roundSolves.some((s) => s.user_id === p.user_id);
                return (
                  <li key={p.user_id} data-top={i === 0} data-found={foundNow}>
                    <span className="tv-rank">{i + 1}</span>
                    <span className="tv-avatar sm" style={avatarStyle(p.display_name)}>{initials(p.display_name)}</span>
                    <span className="tv-name">{p.display_name}</span>
                    <span className="tv-bar"><span style={{ width: `${(sc / top) * 100}%` }} /></span>
                    <span className="tv-score">{sc}</span>
                  </li>
                );
              })}
            </ol>
          </aside>
        </main>
      )}

      {/* RÉVÉLATION */}
      {room.status === "playing" && revealed && track && (
        <main className="tv-reveal solved-pop">
          {track.coverUrl && <img src={track.coverUrl} alt="" className="tv-cover" />}
          <div className="tv-reveal-text">
            <p className="tv-kicker">Manche {room.current_round + 1} / {room.rounds} · c&apos;était</p>
            <h2 className="tv-h1">{track.title}</h2>
            <p className="tv-h2 text-ink-muted">{track.artistName}{track.feats.length ? ` feat. ${track.feats.join(", ")}` : ""}</p>
            <div className="tv-finders">
              {applicable.map((f) => { const names = findersFor(f); return <span key={f} className="tv-pill" data-on={names.length > 0}>{f === "title" ? "Titre" : f === "artist" ? "Artiste" : "Feat"}{names.length ? ` · ${names.join(", ")}` : " · personne"}</span>; })}
            </div>
            {roundSolves.length === 0 && <p className="tv-sub">Dur celle-là. Personne.</p>}
          </div>
        </main>
      )}

      {/* FINAL */}
      {room.status === "finished" && (
        <main className="tv-final">
          <p className="tv-kicker">Résultats · {themeLabel}</p>
          <div className="tv-podium">
            {[1, 0, 2].map((pos) => { const p = ranked[pos]; if (!p) return <div key={pos} className="tv-podium-slot" data-pos={pos} />; return (
              <div key={p.user_id} className="tv-podium-slot" data-pos={pos}>
                <span className="tv-avatar lg" style={avatarStyle(p.display_name)}>{initials(p.display_name)}</span>
                <span className="tv-podium-name">{pos === 0 && <Crown size={20} className="text-gold inline mr-1" />}{p.display_name}</span>
                <span className="tv-podium-score">{scoreFor(p.user_id)} pt{scoreFor(p.user_id) > 1 ? "s" : ""}</span>
                <span className="tv-podium-step">{pos + 1}</span>
              </div>
            ); })}
          </div>
          <div className="tv-final-row">
            {ranked.length > 3 && (
              <ol className="tv-rest">{ranked.slice(3).map((p, i) => <li key={p.user_id}><span className="tv-rank">{i + 4}</span><span className="tv-name">{p.display_name}</span><span className="tv-score">{scoreFor(p.user_id)}</span></li>)}</ol>
            )}
            {room.gages_enabled && last && gageText && (
              <div className="tv-gage"><p className="tv-kicker">Gage pour {last.display_name}</p><p className="tv-gage-text">{gageText}</p></div>
            )}
            {qr && <div className="tv-replay"><img src={qr} alt="" /><span>Nouveaux joueurs ? Scannez. L&apos;hôte relance depuis son téléphone.</span></div>}
          </div>
        </main>
      )}
    </div>
  );
}
