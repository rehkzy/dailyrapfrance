"use client";

/*
 * Envoi chiffré + boîte d'attente (outbox).
 *  · sendEncrypted : un chiffré par appareil du destinataire + par appareil de l'expéditeur.
 *  · Si le destinataire n'a encore aucune clé (jamais venu depuis la mise à jour), le message
 *    est gardé EN CLAIR SUR CET APPAREIL SEULEMENT (IndexedDB), et on prévient l'ami (notif +
 *    push). Dès qu'une clé apparaît pour lui, l'outbox part toute seule (temps réel sur user_keys,
 *    ou au prochain passage sur le site).
 *  · ensureDeviceKey : publie la clé de cet appareil — appelé sur TOUTES les pages, pas
 *    seulement dans la messagerie, pour que chacun soit joignable dès sa première visite.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { deviceIdentity, sharedKey, encryptFor, e2eSupported, type DeviceIdentity } from "@/lib/e2e";

export type KeyRow = { user_id: string; device_id: string; public_jwk: JsonWebKey };
export type Outgoing = { id: string; to: string; body: string; at: string };

const OUTBOX_KEY = "drf-dm-outbox";

export function readOutbox(): Outgoing[] {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]") as Outgoing[]; } catch { return []; }
}
function writeOutbox(list: Outgoing[]) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); } catch {}
  window.dispatchEvent(new CustomEvent("drf:outbox"));
}
export function queueOutgoing(to: string, body: string): Outgoing {
  const o = { id: crypto.randomUUID(), to, body, at: new Date().toISOString() };
  writeOutbox([...readOutbox(), o]);
  return o;
}
export function dropOutgoing(id: string) { writeOutbox(readOutbox().filter((o) => o.id !== id)); }

export async function keysOf(supabase: SupabaseClient, uid: string): Promise<KeyRow[]> {
  const { data } = await supabase.from("user_keys").select("user_id, device_id, public_jwk").eq("user_id", uid);
  return (data ?? []) as KeyRow[];
}

/** Chiffre et insère. Renvoie le msg_id, ou null si aucune clé côté destinataire (→ outbox). */
export async function sendEncrypted(supabase: SupabaseClient, me: DeviceIdentity, userId: string, toUserId: string, text: string, msgId = crypto.randomUUID()): Promise<string | null> {
  const clean = text.trim().slice(0, 4000);
  if (!clean) return null;
  const [theirs, mine] = await Promise.all([keysOf(supabase, toUserId), keysOf(supabase, userId)]);
  if (theirs.length === 0) return null;
  const rows: Record<string, string>[] = [];
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
}

let keyPromise: Promise<DeviceIdentity | null> | null = null;
/** Publie la clé de cet appareil pour `userId` (une fois par chargement). */
export function ensureDeviceKey(supabase: SupabaseClient, userId: string): Promise<DeviceIdentity | null> {
  if (!e2eSupported()) return Promise.resolve(null);
  if (!keyPromise) {
    keyPromise = (async () => {
      const id = await deviceIdentity();
      await supabase.from("user_keys").upsert({ user_id: userId, device_id: id.deviceId, public_jwk: id.publicJwk, last_seen: new Date().toISOString() }, { onConflict: "user_id,device_id" });
      return id;
    })().catch(() => null);
  }
  return keyPromise;
}

/** Tente d'envoyer tout ce qui attend. Renvoie le nombre de messages partis. */
export async function flushOutbox(supabase: SupabaseClient, me: DeviceIdentity, userId: string, onlyTo?: string): Promise<number> {
  let n = 0;
  for (const o of readOutbox()) {
    if (onlyTo && o.to !== onlyTo) continue;
    const ok = await sendEncrypted(supabase, me, userId, o.to, o.body).catch(() => null);
    if (ok) { dropOutgoing(o.id); n++; }
  }
  return n;
}

/** Prévenir l'ami qu'un message l'attend (notif + push), au plus une fois par jour et par ami. */
export async function nudgeRecipient(toUserId: string) {
  const k = `drf-dm-nudge:${toUserId}`;
  try { if (localStorage.getItem(k) === new Date().toISOString().slice(0, 10)) return; localStorage.setItem(k, new Date().toISOString().slice(0, 10)); } catch {}
  await fetch("/api/messages/nudge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: toUserId }) }).catch(() => {});
}
