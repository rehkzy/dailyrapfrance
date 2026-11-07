"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Nombre de messages non lus pour CET appareil (léger : une requête count + temps réel). */
export function useUnreadMessages(userId: string | null | undefined): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!userId || typeof indexedDB === "undefined") return;
    const supabase = createClient();
    let alive = true;
    let deviceId: string | null = null;
    const count = async () => {
      if (!deviceId) return;
      const { count: c } = await supabase.from("direct_messages").select("id", { count: "exact", head: true }).eq("recipient_id", userId).eq("device_id", deviceId).is("read_at", null).neq("sender_id", userId);
      if (alive) setN(c ?? 0);
    };
    (async () => {
      const { deviceIdentity } = await import("@/lib/e2e");
      deviceId = (await deviceIdentity()).deviceId;
      await count();
    })().catch(() => {});
    const ch = supabase.channel(`dm-unread:${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` }, () => void count()).subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [userId]);
  return n;
}
