import "server-only";
import { adminClient } from "@/lib/adminAuth";

export type NotifyKind = "friend_request" | "friend_accepted" | "room_invite" | "beaten" | "message" | "referral" | "system";

/** Crée une notification (cloche) pour chaque destinataire. `dedupe` évite les doublons. */
export async function notify(userIds: string[], n: { kind: NotifyKind; title: string; body?: string; url?: string; actorId?: string | null; dedupe?: string }) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return;
  const rows = ids.map((user_id) => ({ user_id, kind: n.kind, actor_id: n.actorId ?? null, title: n.title, body: n.body ?? null, url: n.url ?? null, dedupe: n.dedupe ?? null }));
  const { error } = await adminClient().from("notifications").upsert(rows, { onConflict: "user_id,dedupe", ignoreDuplicates: true });
  if (error && !/notifications/.test(error.message)) console.error("[notify] —", error.message);
}
