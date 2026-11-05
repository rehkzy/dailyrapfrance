import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// POST { code } — entrer dans le salon privé d'un hôte vous rend amis (accepté) : la page
// Amis se remplit de ceux avec qui on a vraiment joué. Idempotent, salons publics ignorés.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = (body?.code ?? "").toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(code)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const db = adminClient();
  const { data: room } = await db.from("rooms").select("host_id, is_public").eq("code", code).maybeSingle();
  if (!room || room.is_public || room.host_id === user.id) return NextResponse.json({ ok: true, friends: false });
  const { data: existing } = await db
    .from("friendships")
    .select("id")
    .or(`and(requester_id.eq.${room.host_id},addressee_id.eq.${user.id}),and(requester_id.eq.${user.id},addressee_id.eq.${room.host_id})`)
    .limit(1);
  if (!existing?.length) {
    await db.from("friendships").insert({ requester_id: room.host_id, addressee_id: user.id, status: "accepted" });
  }
  return NextResponse.json({ ok: true, friends: true });
}
