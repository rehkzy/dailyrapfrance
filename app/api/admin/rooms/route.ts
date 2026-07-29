import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/rooms — salons en cours (lobby + partie), avec joueurs et réglages.
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const db = adminClient();
  const { data: rooms, error } = await db
    .from("rooms")
    .select("id, code, theme, rounds, status, current_round, answer_mode, gages_enabled, created_at, host_id")
    .neq("status", "finished")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (rooms ?? []).map((r) => r.id);
  const { data: players } = ids.length
    ? await db.from("room_players").select("room_id, display_name").in("room_id", ids)
    : { data: [] as { room_id: string; display_name: string }[] };

  const byRoom = new Map<string, string[]>();
  for (const p of players ?? []) {
    byRoom.set(p.room_id, [...(byRoom.get(p.room_id) ?? []), p.display_name]);
  }

  return NextResponse.json({
    rooms: (rooms ?? []).map((r) => ({ ...r, players: byRoom.get(r.id) ?? [] })),
  });
}

// DELETE /api/admin/rooms?id= — ferme un salon (cascade : joueurs, réponses). Les clients
// connectés reçoivent le DELETE en temps réel et repassent au menu.
export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

  const db = adminClient();
  const { error } = await db.from("rooms").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
