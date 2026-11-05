import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";
import { sendPushToUsers } from "@/lib/push";
import { friendIds } from "@/lib/friends";

export const dynamic = "force-dynamic";

// POST { friendId, code } — invite un ami (accepté) dans mon salon : notification push
// avec le lien qui le fait entrer directement. Renvoie { pushed: true|false }.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { friendId?: string; code?: string } | null;
  const friendId = body?.friendId;
  const code = (body?.code ?? "").toUpperCase();
  if (!friendId || !/^[A-Z0-9]{4,8}$/.test(code)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = adminClient();
  const [friends, { data: me }, { data: room }] = await Promise.all([
    friendIds(db, user.id),
    db.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    db.from("rooms").select("id, code, status, theme").eq("code", code).maybeSingle(),
  ]);
  if (!friends.includes(friendId)) return NextResponse.json({ error: "not_friend" }, { status: 403 });
  if (!room) return NextResponse.json({ error: "no_room" }, { status: 404 });

  const name = me?.display_name ?? "Un pote";
  const sent = await sendPushToUsers([friendId], {
    title: `${name} t'invite dans son salon`,
    body: room.status === "lobby" ? "Blind test en ligne — ça démarre dès que vous êtes prêts." : "La partie a commencé, tu peux regarder et jouer la suivante.",
    url: `/jouer?mode=online&room=${room.code}`,
    tag: `invite-${room.code}`,
  });
  return NextResponse.json({ pushed: sent > 0 });
}
