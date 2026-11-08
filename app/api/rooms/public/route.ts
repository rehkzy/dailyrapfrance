import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";
import { generateRoomCode } from "@/lib/roomCode";
import { THEME_OPTIONS } from "@/lib/themes";
import { sendPushToUsers } from "@/lib/push";
import { botIds, planFor, bonusAt } from "@/lib/bots";

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
// Un joueur qui a verrouillé son téléphone ne tique plus : on lui laisse 90 s (le temps de
// recevoir la notification et de revenir) avant de le considérer parti.
const ALIVE_MS = 90_000;
const ROYALE_COUNTDOWN_MS = 20_000;
const FULL_COUNTDOWN_MS = 3_000;
// Personne au bout de 10 s → des IA comblent le salon (1 en 1v1, le reste en 2v2, 2-3 en royale).
const BOT_WAIT_MS = 10_000;
const ROUND_SECS_DEFAULT = 25;

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
    const bots = await botIds();
    for (const r of open ?? []) {
      const rows = ((r.room_players as Player[] | null) ?? []).filter((p) => alive(p, now));
      if (rows.some((p) => p.user_id === user.id)) {
        // Je suis déjà dans ce salon (double clic, rechargement) : on y retourne.
        return NextResponse.json(await snapshot(r.id));
      }
      // Un humain vaut toujours mieux qu'une IA : la capacité se compte en humains, et une IA
      // cède sa place s'il le faut.
      const humans = rows.filter((p) => !bots.has(p.user_id));
      const ias = rows.filter((p) => bots.has(p.user_id));
      if (humans.length >= 1 && humans.length < capacity) {
        if (rows.length >= capacity && ias.length) {
          const victim = format === "2v2" ? (ias.find((x) => x.team === (humans.filter((h) => h.team === 1).length <= humans.filter((h) => h.team === 2).length ? 1 : 2)) ?? ias[0]) : ias[0];
          await db.from("room_players").delete().eq("room_id", r.id).eq("user_id", victim.user_id);
          rows.splice(rows.indexOf(victim), 1);
        }
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
    // Valable pour TOUS les salons (privés compris, en partie ou non) : on se retire ; si
    // on était l'hôte, le rôle passe au joueur suivant ; si plus personne, le salon est fermé.
    // Fait côté serveur pour ne pas dépendre des droits RLS du joueur (sur téléphone, la
    // suppression de sa propre ligne échouait en silence).
    await db.from("room_players").delete().eq("room_id", body.roomId).eq("user_id", user.id);
    const { players, room } = await snapshot(body.roomId);
    if (!room) return NextResponse.json({ ok: true });
    const bots = await botIds();
    const humans = players.filter((p) => !bots.has(p.user_id));
    // Un salon où il ne reste que des IA est un salon vide.
    if (humans.length === 0) await db.from("rooms").delete().eq("id", body.roomId);
    else if (room.host_id === user.id) await db.from("rooms").update({ host_id: humans[0].user_id }).eq("id", body.roomId);
    return NextResponse.json({ ok: true, remaining: humans.length });
  }

  if (body.action === "tick") {
    // 1. heartbeat
    await db.from("room_players").update({ last_seen_at: new Date().toISOString() }).eq("room_id", body.roomId).eq("user_id", user.id);
    let { room, players } = await snapshot(body.roomId);
    if (!room) return NextResponse.json({ gone: true });
    if (!players.some((p) => p.user_id === user.id)) return NextResponse.json({ error: "not_member" }, { status: 403 });
    if (room.status === "finished") return NextResponse.json({ room, players });

    // 2. fantômes (onglet fermé sans prévenir) — dans TOUS les salons, en attente ou en partie :
    //    le joueur disparu est retiré (les autres voient « X a quitté »), l'hôte réattribué.
    const ghosts = players.filter((p) => !alive(p, now));
    if (ghosts.length) {
      await db.from("room_players").delete().eq("room_id", room.id).in("user_id", ghosts.map((g) => g.user_id));
      players = players.filter((p) => alive(p, now));
      const botsNow = await botIds();
      const humansLeft = players.filter((p) => !botsNow.has(p.user_id));
      if (ghosts.some((g) => g.user_id === room.host_id) && humansLeft.length) {
        await db.from("rooms").update({ host_id: humansLeft[0].user_id }).eq("id", room.id);
        room = { ...room, host_id: humansLeft[0].user_id };
      }
    }

    if (!room.is_public || room.status !== "lobby") return NextResponse.json({ room, players });

    // 3. compte à rebours (salons publics en attente seulement)
    const format: Format = room.format === "1v1" || room.format === "2v2" ? room.format : "royale";
    // 3a. IA : personne depuis BOT_WAIT_MS → on comble
    const bots = await botIds();
    const humansNow = players.filter((p) => !bots.has(p.user_id));
    const iasNow = players.filter((p) => bots.has(p.user_id));
    const waitedSince = Math.max(new Date(room.created_at).getTime(), ...humansNow.map((p) => new Date(p.joined_at ?? room.created_at).getTime()));
    if (iasNow.length === 0 && humansNow.length < CAPACITY[format] && humansNow.length < (format === "royale" ? 2 : CAPACITY[format]) && now - waitedSince >= BOT_WAIT_MS && bots.size) {
      const want = format === "1v1" ? 1 : format === "2v2" ? CAPACITY[format] - humansNow.length : 2 + Math.floor(Math.random() * 2);
      const picks = [...bots.entries()].sort(() => Math.random() - 0.5).slice(0, want);
      let t1 = humansNow.filter((h) => h.team === 1).length, t2 = humansNow.filter((h) => h.team === 2).length;
      const rows = picks.map(([id, def]) => {
        let team: number | null = null;
        if (format === "2v2") { team = t1 <= t2 ? 1 : 2; if (team === 1) t1++; else t2++; }
        return { room_id: room.id, user_id: id, display_name: def.name, team, ready: true, last_seen_at: null as string | null };
      });
      const { error } = await db.from("room_players").upsert(rows, { onConflict: "room_id,user_id" });
      if (error) await db.from("room_players").upsert(rows.map(({ ready: _r, ...x }) => x), { onConflict: "room_id,user_id" }); // colonne ready absente
      ({ room, players } = await snapshot(room.id));
      if (!room) return NextResponse.json({ gone: true });
    }
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
    // Joueurs trouvés → on prévient ceux qui ne sont plus sur la page (téléphone verrouillé,
    // Safari fermé…) : une seule fois par salon.
    if (room.starts_at && n >= MIN_START[format] && room.notified_phase !== "found") {
      const { data: claimed } = await db.from("rooms").update({ notified_phase: "found" }).eq("id", room.id).is("notified_phase", null).select("id");
      if (claimed && claimed.length) {
        const away = players.filter((p) => !p.last_seen_at || now - new Date(p.last_seen_at).getTime() > 6_000).map((p) => p.user_id);
        const secs = Math.max(1, Math.round((new Date(room.starts_at).getTime() - now) / 1000));
        const label = format === "1v1" ? "Adversaire trouvé !" : format === "2v2" ? "Les 4 joueurs sont là !" : "Des joueurs sont là !";
        void sendPushToUsers(away, { title: label, body: `Ta partie démarre dans ${secs} s — reviens vite.`, url: `/jouer?room=${room.code}`, tag: `room-${room.id}` });
      }
    }

    // 4. départ (n'importe quel membre peut le déclencher ; idempotent)
    const due = room.starts_at ? new Date(room.starts_at).getTime() <= now : false;
    if (due && n >= MIN_START[format]) {
      await startRoom(req, room.id);
      return NextResponse.json(await snapshot(room.id));
    }
    return NextResponse.json({ room, players });
  }

  if (body.action === "bot-ids") {
    const bots = await botIds();
    return NextResponse.json({ ids: [...bots.keys()] });
  }

  /* ── IA en partie ──
   *  bot-plan { roomId, round } → la partition de chaque IA pour cette manche (déterministe)
   *  bot-act  { roomId, round, botId, i } → le serveur revérifie la partition (étape i) et
   *            l'horloge, puis insère la bonne réponse (ou marque « fini »). Idempotent.
   */
  if (body.action === "bot-plan" || body.action === "bot-act") {
    const b = body as unknown as { round?: number; botId?: string; field?: string | null };
    const { room, players } = await snapshot(body.roomId);
    if (!room || room.status !== "playing") return NextResponse.json({ error: "not_playing" }, { status: 409 });
    if (!players.some((p) => p.user_id === user.id)) return NextResponse.json({ error: "not_member" }, { status: 403 });
    const round = Number(b.round);
    if (!Number.isInteger(round) || round !== room.current_round) return NextResponse.json({ error: "stale_round" }, { status: 409 });
    const track = (room.tracks as { artistName: string; feats: string[] }[])[round];
    if (!track) return NextResponse.json({ error: "no_track" }, { status: 409 });
    const bots = await botIds();
    const inRoom = players.filter((p) => bots.has(p.user_id));
    const secs = Number(room.round_seconds) || ROUND_SECS_DEFAULT;
    const prev = round > 0 ? ((room.tracks as { title: string; artistName: string }[])[round - 1] ?? null) : null;
    const plans = inRoom.map((p) => ({ botId: p.user_id, steps: planFor(room.id, round, { id: p.user_id, def: bots.get(p.user_id)! }, room.theme, track, room.answer_mode ?? "qcm", secs, prev) }));
    // Les clients ne reçoivent que les instants et les types, jamais le contenu (réponses, textes).
    if (body.action === "bot-plan") return NextResponse.json({ round, startedAt: room.round_started_at, plans: plans.map((pl) => ({ botId: pl.botId, steps: pl.steps.map((st, i) => ({ i, atMs: st.atMs })) })) });

    const plan = plans.find((x) => x.botId === b.botId);
    if (!plan) return NextResponse.json({ error: "unknown_bot" }, { status: 400 });
    const idx = Number((b as { i?: number }).i);
    const step = plan.steps[idx];
    if (!step) return NextResponse.json({ ok: false, reason: "not_planned" });
    const startedAt = room.round_started_at ? new Date(room.round_started_at).getTime() : now;
    if (now < startedAt + step.atMs - 1500) return NextResponse.json({ ok: false, reason: "too_early" });
    const def = bots.get(plan.botId)!;
    if (step.kind === "solve") {
      const { error } = await db.from("room_round_solves").insert({ room_id: room.id, round_index: round, field: step.field, user_id: plan.botId, bonus: bonusAt(step.atMs) });
      if (error && !/duplicate|unique/i.test(error.message)) await db.from("room_round_solves").insert({ room_id: room.id, round_index: round, field: step.field, user_id: plan.botId });
    } else if (step.kind === "done") {
      await db.from("room_players").update({ done_round: round }).eq("room_id", room.id).eq("user_id", plan.botId);
    } else if (step.kind === "chat") {
      // Idempotent : pas deux fois la même ligne dans la même manche
      const { data: dup } = await db.from("room_messages").select("id").eq("room_id", room.id).eq("user_id", plan.botId).eq("text", step.text).gte("created_at", new Date(startedAt).toISOString()).limit(1);
      if (!dup?.length) await db.from("room_messages").insert({ room_id: room.id, user_id: plan.botId, name: def.name, avatar_url: null, text: step.text });
    } else if (step.kind === "react") {
      // Diffusé par le client hôte (canal temps réel) : on lui rend juste l'emoji et le nom
      return NextResponse.json({ ok: true, react: { emoji: step.emoji, from: def.name } });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action inconnue" }, { status: 400 });
}
