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
      const { data } = await supabase.from("direct_messages").select("msg_id").eq("recipient_id", userId).is("read_at", null).neq("sender_id", userId).limit(500);
      if (alive) setN(new Set((data ?? []).map((r) => r.msg_id as string)).size);
    };
    (async () => {
      const { deviceIdentity } = await import("@/lib/e2e");
      deviceId = (await deviceIdentity()).deviceId;
      await count();
    })().catch(() => {});
    const ch = supabase.channel(`dm-unread:${userId}:${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` }, () => void count()).subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [userId]);
  return n;
}
