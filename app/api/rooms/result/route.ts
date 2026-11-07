import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const POINTS: Record<string, number> = { title: 1, artist: 1, feat: 2 };

/*
 * POST { roomId } — enregistre le résultat d'une partie terminée (idempotent : la première
 * écriture gagne). Appelé par chaque client à l'écran de fin ; le serveur recalcule tout
 * depuis la base, rien n'est pris du client. Un membre du salon seulement.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { roomId?: string } | null;
  const roomId = body?.roomId;
  if (!roomId || !/^[0-9a-f-]{36}$/.test(roomId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = adminClient();
  const [{ data: room }, { data: players }, { data: solves }, { data: existing }] = await Promise.all([
    db.from("rooms").select("id, code, theme, format, is_public, rounds, status").eq("id", roomId).maybeSingle(),
    db.from("room_players").select("user_id, display_name, team, spectator").eq("room_id", roomId),
    db.from("room_round_solves").select("user_id, field, bonus").eq("room_id", roomId),
    db.from("room_results").select("room_id").eq("room_id", roomId).maybeSingle(),
  ]);
  if (existing) return NextResponse.json({ ok: true, already: true });
  if (!room || room.status !== "finished") return NextResponse.json({ error: "not_finished" }, { status: 409 });
  const active = (players ?? []).filter((p) => !p.spectator);
  if (!active.some((p) => p.user_id === user.id)) return NextResponse.json({ error: "not_member" }, { status: 403 });
  if (active.length < 2) return NextResponse.json({ ok: true, skipped: "solo" });

  const score = new Map<string, number>();
  for (const s of solves ?? []) score.set(s.user_id, (score.get(s.user_id) ?? 0) + (POINTS[s.field] ?? 0) + (s.bonus ?? 0));
  const rows = active.map((p) => ({ user_id: p.user_id, name: p.display_name, score: score.get(p.user_id) ?? 0, team: p.team ?? null }));

  let winners: string[] = [];
  if (room.format === "2v2") {
    const t1 = rows.filter((r) => (r.team === 2 ? 2 : 1) === 1).reduce((a, r) => a + r.score, 0);
    const t2 = rows.filter((r) => (r.team === 2 ? 2 : 1) === 2).reduce((a, r) => a + r.score, 0);
    if (t1 !== t2) winners = rows.filter((r) => (r.team === 2 ? 2 : 1) === (t1 > t2 ? 1 : 2)).map((r) => r.user_id);
  } else {
    const best = Math.max(...rows.map((r) => r.score));
    const top = rows.filter((r) => r.score === best);
    if (top.length === 1 && best > 0) winners = [top[0].user_id];
  }

  const { error } = await db.from("room_results").insert({
    room_id: room.id, code: room.code, theme: room.theme, format: room.format ?? null, is_public: !!room.is_public,
    rounds: room.rounds ?? 0, players: rows, winner_ids: winners,
  });
  if (error && !/duplicate/i.test(error.message)) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
