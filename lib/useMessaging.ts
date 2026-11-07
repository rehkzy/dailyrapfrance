"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deviceIdentity, sharedKey, encryptFor, decryptWith, e2eSupported, type DeviceIdentity } from "@/lib/e2e";

/*
 * Messagerie chiffrée : tout se passe ici côté appareil.
 *  · au montage : identité d'appareil + publication de la clé publique ;
 *  · envoi : un chiffré par appareil du destinataire + un par appareil à moi (pour relire) ;
 *  · lecture : on ne reçoit que les lignes chiffrées pour CET appareil, on déchiffre ici.
 */
export type DM = { id: number; msgId: string; from: string; peer: string; text: string | null; at: string; mine: boolean; read: boolean };
type Row = { id: number; msg_id: string; sender_id: string; recipient_id: string; peer_id: string; device_id: string; sender_device: string; ciphertext: string; iv: string; created_at: string; read_at: string | null };
type KeyRow = { user_id: string; device_id: string; public_jwk: JsonWebKey };

export function useMessaging(userId: string | null) {
  const supabase = createClient();
  const [me, setMe] = useState<DeviceIdentity | null>(null);
  const [ready, setReady] = useState(false);
  const keyCache = useRef(new Map<string, KeyRow[]>()); // user_id → appareils

  useEffect(() => {
    if (!userId || !e2eSupported()) { setReady(true); return; }
    let alive = true;
    (async () => {
      const id = await deviceIdentity();
      await supabase.from("user_keys").upsert({ user_id: userId, device_id: id.deviceId, public_jwk: id.publicJwk, last_seen: new Date().toISOString() }, { onConflict: "user_id,device_id" });
      if (alive) { setMe(id); setReady(true); }
    })().catch(() => setReady(true));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const keysOf = useCallback(async (uid: string, fresh = false): Promise<KeyRow[]> => {
    if (!fresh && keyCache.current.has(uid)) return keyCache.current.get(uid)!;
    const { data } = await supabase.from("user_keys").select("user_id, device_id, public_jwk").eq("user_id", uid);
    const rows = (data ?? []) as KeyRow[];
    keyCache.current.set(uid, rows);
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decryptRow = useCallback(async (r: Row): Promise<DM> => {
    const base = { id: r.id, msgId: r.msg_id, from: r.sender_id, peer: r.peer_id, at: r.created_at, mine: r.sender_id === userId, read: !!r.read_at };
    if (!me) return { ...base, text: null };
    const senderKeys = await keysOf(r.sender_id);
    let k = senderKeys.find((x) => x.device_id === r.sender_device);
    if (!k) k = (await keysOf(r.sender_id, true)).find((x) => x.device_id === r.sender_device);
    if (!k) return { ...base, text: null };
    const key = await sharedKey(me, k.device_id, k.public_jwk);
    return { ...base, text: await decryptWith(key, r.ciphertext, r.iv) };
  }, [me, userId, keysOf]);

  /** Envoie `text` à `toUserId` : chiffré pour chacun de ses appareils et chacun des miens. */
  const send = useCallback(async (toUserId: string, text: string): Promise<string | null> => {
    if (!me || !userId) return null;
    const clean = text.trim().slice(0, 4000);
    if (!clean) return null;
    const [theirs, mine] = await Promise.all([keysOf(toUserId, true), keysOf(userId, true)]);
    if (theirs.length === 0) return null; // il n'a encore jamais ouvert la messagerie
    const msgId = crypto.randomUUID();
    const rows: Omit<Row, "id" | "created_at" | "read_at">[] = [];
    for (const d of theirs) {
      const key = await sharedKey(me, d.device_id, d.public_jwk);
      const { ciphertext, iv } = await encryptFor(key, clean);
      rows.push({ msg_id: msgId, sender_id: userId, recipient_id: toUserId, peer_id: userId, device_id: d.device_id, sender_device: me.deviceId, ciphertext, iv });
    }
    for (const d of mine) {
      const key = await sharedKey(me, d.device_id, d.public_jwk);
      const { ciphertext, iv } = await encryptFor(key, clean);
      rows.push({ msg_id: msgId, sender_id: userId, recipient_id: userId, peer_id: toUserId, device_id: d.device_id, sender_device: me.deviceId, ciphertext, iv });
    }
    const { error } = await supabase.from("direct_messages").insert(rows);
    return error ? null : msgId;
  }, [me, userId, keysOf]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Fil avec `peerId`, déchiffré, du plus ancien au plus récent. */
  const loadThread = useCallback(async (peerId: string, limit = 200): Promise<DM[]> => {
    if (!me || !userId) return [];
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("recipient_id", userId)
      .eq("device_id", me.deviceId)
      .eq("peer_id", peerId)
      .order("created_at", { ascending: false })
      .limit(limit);
    const rows = ((data ?? []) as Row[]).reverse();
    return Promise.all(rows.map(decryptRow));
  }, [me, userId, decryptRow]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Conversations : dernier message par correspondant + non-lus. */
  const loadInbox = useCallback(async (): Promise<{ peer: string; last: DM; unread: number }[]> => {
    if (!me || !userId) return [];
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("recipient_id", userId)
      .eq("device_id", me.deviceId)
      .order("created_at", { ascending: false })
      .limit(400);
    const byPeer = new Map<string, { rows: Row[]; unread: number }>();
    for (const r of (data ?? []) as Row[]) {
      const cur = byPeer.get(r.peer_id) ?? { rows: [], unread: 0 };
      cur.rows.push(r);
      if (!r.read_at && r.sender_id !== userId) cur.unread++;
      byPeer.set(r.peer_id, cur);
    }
    const out = await Promise.all([...byPeer.entries()].map(async ([peer, v]) => ({ peer, last: await decryptRow(v.rows[0]), unread: v.unread })));
    return out.sort((a, b) => (a.last.at < b.last.at ? 1 : -1));
  }, [me, userId, decryptRow]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Mes messages à `peerId` que l'autre a lus (msg_id). */
  const loadReads = useCallback(async (peerId: string): Promise<Set<string>> => {
    if (!userId) return new Set();
    const { data } = await supabase.from("direct_messages").select("msg_id").eq("sender_id", userId).eq("recipient_id", peerId).not("read_at", "is", null).limit(400);
    return new Set((data ?? []).map((r) => r.msg_id as string));
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Indicateur « écrit… » : canal de diffusion éphémère, rien n'est stocké. */
  const typingChannel = useCallback((peerId: string, onTyping: () => void) => {
    if (!userId) return { ping: () => {}, off: () => {} };
    const name = `dm-typing:${[userId, peerId].sort().join("|")}`;
    const ch = supabase.channel(name).on("broadcast", { event: "typing" }, (p) => { if ((p.payload as { from?: string })?.from !== userId) onTyping(); }).subscribe();
    let last = 0;
    return {
      ping: () => { const now = Date.now(); if (now - last > 2500) { last = now; void ch.send({ type: "broadcast", event: "typing", payload: { from: userId } }); } },
      off: () => { supabase.removeChannel(ch); },
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = useCallback(async (peerId: string) => {
    if (!me || !userId) return;
    await supabase.from("direct_messages").update({ read_at: new Date().toISOString() }).eq("recipient_id", userId).eq("device_id", me.deviceId).eq("peer_id", peerId).is("read_at", null).neq("sender_id", userId);
  }, [me, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Abonnement temps réel aux nouveaux messages pour cet appareil. */
  const subscribe = useCallback((onRow: (m: DM) => void, onRead?: (msgId: string, peerId: string) => void) => {
    if (!me || !userId) return () => {};
    const ch = supabase
      .channel(`dm:${userId}:${me.deviceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` }, async (payload) => {
        const r = payload.new as Row;
        if (r.device_id !== me.deviceId) return;
        onRow(await decryptRow(r));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages", filter: `sender_id=eq.${userId}` }, (payload) => {
        const r = payload.new as Row;
        if (r.read_at && r.recipient_id !== userId) onRead?.(r.msg_id, r.recipient_id);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me, userId, decryptRow]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ready, supported: e2eSupported(), deviceId: me?.deviceId ?? null, send, loadThread, loadInbox, loadReads, typingChannel, markRead, subscribe };
}
