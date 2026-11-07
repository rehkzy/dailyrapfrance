"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Notif = { id: number; kind: string; actor_id: string | null; title: string; body: string | null; url: string | null; created_at: string; read_at: string | null };

/** Compteur de non-lus (cloche), mis à jour en temps réel. */
export function useUnreadNotifications(userId: string | null | undefined): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let alive = true;
    const count = async () => {
      const { count: c } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
      if (alive) setN(c ?? 0);
    };
    void count();
    const ch = supabase.channel(`notif-count:${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => void count()).subscribe();
    const onVis = () => { if (document.visibilityState === "visible") void count(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; supabase.removeChannel(ch); document.removeEventListener("visibilitychange", onVis); };
  }, [userId]);
  return n;
}

/** Liste + actions (page Notifications). */
export function useNotifications(userId: string | null | undefined) {
  const [items, setItems] = useState<Notif[] | null>(null);
  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await createClient().from("notifications").select("id,kind,actor_id,title,body,url,created_at,read_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as Notif[]);
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    void load();
    const supabase = createClient();
    const ch = supabase.channel(`notif-list:${userId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => void load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, load]);
  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    setItems((prev) => prev?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? prev);
  }, [userId]);
  const remove = useCallback(async (id: number) => {
    await createClient().from("notifications").delete().eq("id", id);
    setItems((prev) => prev?.filter((n) => n.id !== id) ?? prev);
  }, []);
  return { items, reload: load, markAllRead, remove };
}
