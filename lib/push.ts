import "server-only";
import webpush from "web-push";
import { adminClient } from "@/lib/adminAuth";

/*
 * Notifications push (Web Push, VAPID). Clés dans l'environnement :
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)
 * Sans clés : no-op silencieux. Les abonnements expirés (410/404) sont supprimés.
 */
export function pushConfigured() {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function setup() {
  if (configured || !pushConfigured()) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contact@dailyrapfrance.best", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  configured = true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  if (!pushConfigured() || userIds.length === 0) return 0;
  setup();
  const db = adminClient();
  const { data: subs } = await db.from("push_subscriptions").select("id, user_id, endpoint, keys").in("user_id", userIds);
  let sent = 0;
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } }, JSON.stringify(payload), { TTL: 60, urgency: "high" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
    }
  }));
  return sent;
}
