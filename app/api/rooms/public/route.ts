import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";
import { generateRoomCode } from "@/lib/roomCode";
import { THEME_OPTIONS } from "@/lib/themes";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/*
 * Matchmaking côté serveur — un seul arbitre, pour que rien ne dépende du navigateur de
 * l'hôte (c'est ce qui bloquait : l'hôte parti ou sur un autre écran, le salon ne
 * démarrait jamais, et des lignes de joueurs fantômes remplissaient les salons).
 *
 *  POST { action: "find", format, custom? }   → rejoint un salon public ouvert du format, sinon en crée un
 *  POST { action: "tick", roomId }            → heartbeat du joueur + ménage des fantômes + compte à rebours + départ
 *  POST { action: "leave", roomId }           → je quitte (sendBeacon à la fermeture de l'onglet)
 *
 * Un joueur est « vivant » s'il a tické depuis moins de 25 s. Seuls les vivants comptent.
 */
type Format = "1v1" | "2v2" | "royale";
const CAPACITY: Record<Format, number> = { "1v1": 2, "2v2": 4, royale: 8 };
const MIN_START: Record<Format, number> = { "1v1": 2, "2v2": 4, royale: 2 };
const ALIVE_MS = 25_000;
const ROYALE_COUNTDOWN_MS = 20_000;
const FULL_COUNTDOWN_MS = 3_000;

type Player = { room_id: string; user_id: string; display_name: string; team: number | null; last_seen_at: string | null; joined_at?: string };

function alive(p: Player, now: number) {
  return !p.last_seen_at || now - new Date(p.last_seen_at).getTime() < ALIVE_MS;
}

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, name: (user.user_metadata?.full_name || user.user_metadata?.name || "Joueur") as string };
}

async function snapshot(roomId: string) {
  const db = adminClient();
  const [{ data: room }, { data: players }] = await Promise.all([
    db.from("rooms").select("*").eq("id", roomId).maybeSingle(),
    db.from("room_players").select("room_id, user_id, display_name, team, last_seen_at, joined_at").eq("room_id", roomId).order("joined_at", { ascending: true }),
  ]);
  return { room, players: (players ?? []) as Player[] };
}

async function startRoom(req: NextRequest, roomId: string) {
  const db = adminClient();
  const { data: room } = await db.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room || room.status !== "lobby") return;
  const ids: number[] | null = room.custom_ids?.length ? room.custom_ids : null;
  const url = new URL(ids ? `/api/blindtest/pool?ids=${ids.join(",")}&count=${ids.length}` : `/api/blindtest/pool?theme=${encodeURIComponent(room.theme)}&count=${room.rounds}`, req.nextUrl.origin);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  const tracks = data.tracks ?? [];
  if (tracks.length < 3) return;
  // Idempotent : seul le premier passage fait basculer le salon.
  await db.from("rooms").update({ tracks, status: "playing", current_round: 0, round_started_at: new Date().toISOString(), starts_at: null }).eq("id", roomId).eq("status", "lobby");
  await db.from("room_players").update({ ready: false, done_round: null }).eq("room_id", roomId);
}

export async function POST(req: NextRequest) {
  const user = await me();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { action?: string; format?: string; roomId?: string; custom?: { title: string; ids: number[]; answer?: "qcm" | "text" } } | null;
  if (!body?.action) return NextResponse.json({ error: "action manquante" }, { status: 400 });
  const db = adminClient();
  const now = Date.now();

  if (body.action === "find") {
    const format: Format = body.format === "1v1" || body.format === "2v2" ? body.format : "royale";
    const capacity = CAPACITY[format];
    const since = new Date(now - 15 * 60_000).toISOString();
    const { data: open } = await db
      .from("rooms")
      .select("*, room_players(user_id, team, last_seen_at)")
      .eq("is_public", true)
      .eq("status", "lobby")
      .eq("format", format)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(20);
    for (const r of open ?? []) {
      const rows = ((r.room_players as Player[] | null) ?? []).filter((p) => alive(p, now));
      if (rows.some((p) => p.user_id === user.id)) {
        // Je suis déjà dans ce salon (double clic, rechargement) : on y retourne.
        return NextResponse.json(await snapshot(r.id));
      }
      if (rows.length >= 1 && rows.length < capacity) {
        const t1 = rows.filter((x) => x.team === 1).length, t2 = rows.filter((x) => x.team === 2).length;
        const team = format === "2v2" ? (t1 <= t2 ? 1 : 2) : null;
        const { error } = await db.from("room_players").upsert({ room_id: r.id, user_id: user.id, display_name: user.name, team, last_seen_at: new Date().toISOString() });
        if (!error) return NextResponse.json(await snapshot(r.id));
      }
    }
    // Rien d'ouvert : on crée. (On ferme d'abord mes salons publics restés en attente.)
    await db.from("rooms").delete().eq("host_id", user.id).eq("is_public", true).eq("status", "lobby");
    const custom = body.custom && Array.isArray(body.custom.ids) && body.custom.ids.length >= 3 ? body.custom : null;
    const pool = THEME_OPTIONS.filter((t) => t.id !== "mix" && t.id !== "custom");
    const theme = custom ? "custom" : pool[Math.floor(Math.random() * pool.length)]?.id ?? "mix";
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: room, error } = await db
        .from("rooms")
        .insert({
          code: generateRoomCode(), host_id: user.id, theme, rounds: custom ? custom.ids.length : 10, answer_mode: custom?.answer ?? "qcm",
          gages_enabled: false, gages_intensity: "soft", is_public: true, format,
          ...(custom ? { custom_ids: custom.ids, custom_title: String(custom.title).slice(0, 60) } : {}),
        })
        .select("*")
        .single();
      if (error) { if (/duplicate|unique/i.test(error.message)) continue; return NextResponse.json({ error: error.message }, { status: 500 }); }
      await db.from("room_players").insert({ room_id: room.id, user_id: user.id, display_name: user.name, team: format === "2v2" ? 1 : null, last_seen_at: new Date().toISOString() });
      return NextResponse.json(await snapshot(room.id));
    }
    return NextResponse.json({ error: "code" }, { status: 500 });
  }

  if (!body.roomId) return NextResponse.json({ error: "roomId manquant" }, { status: 400 });

  if (body.action === "leave") {
    await db.from("room_players").delete().eq("room_id", body.roomId).eq("user_id", user.id);
    const { players, room } = await snapshot(body.roomId);
    if (room?.is_public && room.status === "lobby") {
      if (players.length === 0) await db.from("rooms").delete().eq("id", body.roomId);
      else if (room.host_id === user.id) await db.from("rooms").update({ host_id: players[0].user_id }).eq("id", body.roomId);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "tick") {
    // 1. heartbeat
    await db.from("room_players").update({ last_seen_at: new Date().toISOString() }).eq("room_id", body.roomId).eq("user_id", user.id);
    let { room, players } = await snapshot(body.roomId);
    if (!room) return NextResponse.json({ gone: true });
    if (!players.some((p) => p.user_id === user.id)) return NextResponse.json({ error: "not_member" }, { status: 403 });
    if (!room.is_public || room.status !== "lobby") return NextResponse.json({ room, players });

    // 2. fantômes (onglet fermé sans prévenir)
    const ghosts = players.filter((p) => !alive(p, now));
    if (ghosts.length) {
      await db.from("room_players").delete().eq("room_id", room.id).in("user_id", ghosts.map((g) => g.user_id));
      players = players.filter((p) => alive(p, now));
      if (ghosts.some((g) => g.user_id === room.host_id) && players.length) {
        await db.from("rooms").update({ host_id: players[0].user_id }).eq("id", room.id);
        room = { ...room, host_id: players[0].user_id };
      }
    }

    // 3. compte à rebours
    const format: Format = room.format === "1v1" || room.format === "2v2" ? room.format : "royale";
    const n = players.length;
    const target = room.starts_at ? new Date(room.starts_at).getTime() : null;
    let next: string | null | undefined = undefined; // undefined = inchangé
    if (n >= CAPACITY[format]) {
      if (target === null || target > now + FULL_COUNTDOWN_MS + 500) next = new Date(now + FULL_COUNTDOWN_MS).toISOString();
    } else if (format === "royale" && n >= 2) {
      if (target === null) next = new Date(now + ROYALE_COUNTDOWN_MS).toISOString();
      else if (target < now + 8_000 && target > now) { /* on laisse filer */ }
    } else if (target !== null) {
      next = null; // plus assez de joueurs
    }
    if (next !== undefined) {
      await db.from("rooms").update({ starts_at: next }).eq("id", room.id).eq("status", "lobby");
      room = { ...room, starts_at: next };
    }

    // 4. départ (n'importe quel membre peut le déclencher ; idempotent)
    const due = room.starts_at ? new Date(room.starts_at).getTime() <= now : false;
    if (due && n >= MIN_START[format]) {
      await startRoom(req, room.id);
      return NextResponse.json(await snapshot(room.id));
    }
    return NextResponse.json({ room, players });
  }

  return NextResponse.json({ error: "action inconnue" }, { status: 400 });
}
