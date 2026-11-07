"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sharedKey, decryptWith, e2eSupported, type DeviceIdentity } from "@/lib/e2e";
import { ensureDeviceKey, sendEncrypted, queueOutgoing, nudgeRecipient, flushOutbox } from "@/lib/dmTransport";

/*
 * Messagerie chiffrée : tout se passe ici côté appareil.
 *  · au montage : identité d'appareil + publication de la clé publique ;
 *  · envoi : un chiffré par appareil du destinataire + un par appareil à moi (pour relire) ;
 *  · lecture : on ne reçoit que les lignes chiffrées pour CET appareil, on déchiffre ici.
 */
export type DM = { id: number; msgId: string; from: string; peer: string; text: string | null; at: string; mine: boolean; read: boolean };
type Row = { id: number; msg_id: string; sender_id: string; recipient_id: string; peer_id: string; device_id: string; sender_device: string; ciphertext: string; iv: string; created_at: string; read_at: string | null };
type KeyRow = { user_id: string; device_id: string; public_jwk: JsonWebKey };

/** Un message = une ligne par appareil ; on garde celle de CET appareil, sinon n'importe laquelle (illisible ici, mais le message existe). */
function collapse(rows: Row[], deviceId: string): Row[] {
  const by = new Map<string, Row>();
  for (const r of rows) {
    const cur = by.get(r.msg_id);
    if (!cur || (r.device_id === deviceId && cur.device_id !== deviceId)) by.set(r.msg_id, r);
  }
  return [...by.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}

export function useMessaging(userId: string | null) {
  const supabase = createClient();
  const [me, setMe] = useState<DeviceIdentity | null>(null);
  const [ready, setReady] = useState(false);
  const keyCache = useRef(new Map<string, KeyRow[]>()); // user_id → appareils

  useEffect(() => {
    // « prêt » = identité d'appareil chargée pour CET utilisateur (ou chiffrement impossible).
    // Tant que l'utilisateur n'est pas connu, on n'est pas prêt : sinon les écrans chargent
    // à vide avant que la clé existe, et ne rechargent jamais.
    if (!userId) { setReady(false); setMe(null); return; }
    if (!e2eSupported()) { setReady(true); return; }
    setReady(false);
    let alive = true;
    ensureDeviceKey(supabase, userId).then((id) => { if (alive) { setMe(id); setReady(true); if (id) void flushOutbox(supabase, id, userId); } });
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

  /**
   * Envoie `text` à `toUserId`. Renvoie { msgId } si parti, { pending } si l'ami n'a pas encore
   * de clé : le message attend sur cet appareil et partira tout seul ; on le prévient entre-temps.
   */
  const send = useCallback(async (toUserId: string, text: string): Promise<{ msgId: string | null; pending: boolean }> => {
    if (!me || !userId) return { msgId: null, pending: false };
    const clean = text.trim().slice(0, 4000);
    if (!clean) return { msgId: null, pending: false };
    const msgId = await sendEncrypted(supabase, me, userId, toUserId, clean);
    if (msgId) return { msgId, pending: false };
    queueOutgoing(toUserId, clean);
    void nudgeRecipient(toUserId);
    return { msgId: null, pending: true };
  }, [me, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Fil avec `peerId`, déchiffré, du plus ancien au plus récent. */
  const loadThread = useCallback(async (peerId: string, limit = 200): Promise<DM[]> => {
    if (!me || !userId) return [];
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("recipient_id", userId)
      .eq("peer_id", peerId)
      .order("created_at", { ascending: false })
      .limit(limit * 3);
    const rows = collapse((data ?? []) as Row[], me.deviceId).reverse().slice(-limit);
    return Promise.all(rows.map(decryptRow));
  }, [me, userId, decryptRow]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Conversations : dernier message par correspondant + non-lus. */
  const loadInbox = useCallback(async (): Promise<{ peer: string; last: DM; unread: number }[]> => {
    if (!me || !userId) return [];
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(800);
    const byPeer = new Map<string, { rows: Row[]; unread: number }>();
    for (const r of collapse((data ?? []) as Row[], me.deviceId)) {
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
    const name = `dm-typing:${[userId, peerId].sort().join("|")}`; // même nom des deux côtés : c'est le sujet de diffusion
    for (const old of supabase.getChannels()) if (old.topic === `realtime:${name}`) supabase.removeChannel(old);
    const ch = supabase.channel(name).on("broadcast", { event: "typing" }, (p) => { if ((p.payload as { from?: string })?.from !== userId) onTyping(); }).subscribe();
    let last = 0;
    return {
      ping: () => { const now = Date.now(); if (now - last > 2500) { last = now; void ch.send({ type: "broadcast", event: "typing", payload: { from: userId } }); } },
      off: () => { supabase.removeChannel(ch); },
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = useCallback(async (peerId: string) => {
    if (!me || !userId) return;
    await supabase.from("direct_messages").update({ read_at: new Date().toISOString() }).eq("recipient_id", userId).eq("peer_id", peerId).is("read_at", null).neq("sender_id", userId);
  }, [me, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Abonnement temps réel aux nouveaux messages pour cet appareil. */
  const subscribe = useCallback((onRow: (m: DM) => void, onRead?: (msgId: string, peerId: string) => void) => {
    if (!me || !userId) return () => {};
    const seen = new Set<string>(), gotMine = new Set<string>();
    const ch = supabase
      .channel(`dm:${userId}:${me.deviceId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` }, async (payload) => {
        const r = payload.new as Row;
        // Plusieurs lignes par message (une par appareil) : on ne remonte que celle de cet appareil,
        // ou la première vue si aucune ne lui est destinée (identité changée).
        if (r.device_id !== me.deviceId) { if (seen.has(r.msg_id)) return; seen.add(r.msg_id); setTimeout(async () => { if (!gotMine.has(r.msg_id)) onRow(await decryptRow(r)); }, 1500); return; }
        gotMine.add(r.msg_id); seen.add(r.msg_id);
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
