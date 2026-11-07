/*
 * Chiffrement de bout en bout de la messagerie — Web Crypto uniquement, rien de custom.
 *
 *  · Identité d'appareil : une paire ECDH P-256 générée ici, clé privée stockée dans
 *    IndexedDB (non extractible : le navigateur refuse de l'exporter, même à notre code),
 *    clé publique publiée dans user_keys.
 *  · Secret partagé : ECDH(ma privée, sa publique) → HKDF-SHA256 (info = les deux ids
 *    d'appareils triés) → clé AES-256-GCM. Même secret des deux côtés, jamais transmis.
 *  · Message : AES-GCM, IV aléatoire de 12 octets, texte UTF-8. Un chiffré par appareil
 *    destinataire (et par appareil de l'expéditeur, pour relire ses propres messages).
 *
 * Conséquence assumée (comme WhatsApp sans sauvegarde) : un message ne se lit que sur les
 * appareils qui existaient quand il a été envoyé.
 */

const DB = "drf-e2e";
const STORE = "keys";

export type DeviceIdentity = { deviceId: string; publicJwk: JsonWebKey; privateKey: CryptoKey };

function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet<T>(k: string): Promise<T | undefined> {
  const db = await idb();
  return new Promise((res, rej) => { const t = db.transaction(STORE).objectStore(STORE).get(k); t.onsuccess = () => res(t.result as T); t.onerror = () => rej(t.error); });
}
async function idbSet(k: string, v: unknown): Promise<void> {
  const db = await idb();
  return new Promise((res, rej) => { const t = db.transaction(STORE, "readwrite").objectStore(STORE).put(v, k); t.onsuccess = () => res(); t.onerror = () => rej(t.error); });
}

export function e2eSupported(): boolean {
  return typeof window !== "undefined" && !!window.crypto?.subtle && !!window.indexedDB;
}

/** Identité de cet appareil (créée au premier appel, puis réutilisée). */
export async function deviceIdentity(): Promise<DeviceIdentity> {
  const existing = await idbGet<{ deviceId: string; publicJwk: JsonWebKey; privateKey: CryptoKey }>("identity");
  if (existing?.privateKey) return existing;
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey", "deriveBits"]);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const deviceId = crypto.randomUUID();
  const identity = { deviceId, publicJwk, privateKey: pair.privateKey };
  await idbSet("identity", identity);
  return identity;
}

const sharedCache = new Map<string, Promise<CryptoKey>>();

/** Clé AES partagée entre cet appareil et l'appareil distant (mise en cache). */
export function sharedKey(me: DeviceIdentity, theirDeviceId: string, theirPublicJwk: JsonWebKey): Promise<CryptoKey> {
  const k = `${me.deviceId}|${theirDeviceId}`;
  let p = sharedCache.get(k);
  if (!p) {
    p = (async () => {
      const theirPub = await crypto.subtle.importKey("jwk", theirPublicJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
      const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: theirPub }, me.privateKey, 256);
      const hk = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
      const info = new TextEncoder().encode(["drf-dm-v1", ...[me.deviceId, theirDeviceId].sort()].join("|"));
      return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info }, hk, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    })();
    sharedCache.set(k, p);
  }
  return p;
}

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf))));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptFor(key: CryptoKey, text: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { ciphertext: b64(ct), iv: b64(iv) };
}

export async function decryptWith(key: CryptoKey, ciphertext: string, iv: string): Promise<string | null> {
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ciphertext));
    return new TextDecoder().decode(pt);
  } catch {
    return null; // clé d'un autre appareil, ou message altéré
  }
}
