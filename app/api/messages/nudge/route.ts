import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";
import { friendIds } from "@/lib/friends";
import { notify } from "@/lib/notify";
import { sendPushToUsers } from "@/lib/push";

/* « X t'a écrit » quand l'ami n'a pas encore de clé : on le fait venir, sa clé se publie, le message part. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const { to } = (await req.json().catch(() => ({}))) as { to?: string };
  if (!to || !/^[0-9a-f-]{36}$/.test(to)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const db = adminClient();
  const [friends, me] = await Promise.all([friendIds(db, user.id), db.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle().then((r) => r.data)]);
  if (!friends.includes(to)) return NextResponse.json({ error: "not_friend" }, { status: 403 });
  const name = me?.display_name ?? me?.username ?? "Un pote";
  const url = `/messages/${me?.username ?? user.id}`;
  const day = new Date().toISOString().slice(0, 10);
  await notify([to], { kind: "message", actorId: user.id, title: `${name} t'a écrit`, body: "Ouvre tes messages pour le recevoir (chiffré de bout en bout).", url, dedupe: `dm-nudge:${user.id}:${day}` });
  const sent = await sendPushToUsers([to], { title: `${name} t'a écrit`, body: "Ouvre DailyRap pour lire son message.", url, tag: `dm-${user.id}` });
  return NextResponse.json({ ok: true, pushed: sent > 0 });
}
