/*
 * Chiffrement de bout en bout de la messagerie — Web Crypto uniquement, rien de custom.
 *
 *  · Identité d'appareil : une paire ECDH P-256 générée ici, clé privée stockée sur
 *    l'appareil (IndexedDB + localStorage, jamais envoyée), clé publique publiée dans user_keys.
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

/*
 * Identité de cet appareil (créée au premier appel, puis réutilisée).
 * La clé privée est gardée au format JWK dans IndexedDB ET dans localStorage : Safari iPhone
 * ne conserve pas de façon fiable un objet CryptoKey d'un chargement à l'autre, ce qui
 * recréait une identité à chaque visite — et rendait illisibles tous les messages précédents,
 * même ceux envoyés depuis ce téléphone. Elle ne quitte jamais l'appareil pour autant.
 */
type Stored = { deviceId: string; publicJwk: JsonWebKey; privateJwk: JsonWebKey };
const LS_KEY = "drf-e2e-identity";
const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;

function readLocal(): Stored | null { try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "null"); } catch { return null; } }
function writeLocal(s: Stored) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} }

async function importIdentity(st: Stored): Promise<DeviceIdentity> {
  const privateKey = await crypto.subtle.importKey("jwk", st.privateJwk, ECDH, false, ["deriveKey", "deriveBits"]);
  return { deviceId: st.deviceId, publicJwk: st.publicJwk, privateKey };
}

let identityPromise: Promise<DeviceIdentity> | null = null;
export function deviceIdentity(): Promise<DeviceIdentity> {
  if (!identityPromise) identityPromise = (async () => {
    let st = await idbGet<Stored>("identity-v2").catch(() => undefined) ?? readLocal();
    if (st?.privateJwk) {
      try { const id = await importIdentity(st); writeLocal(st); return id; } catch { /* corrompu : on régénère */ }
    }
    const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveKey", "deriveBits"]);
    const [publicJwk, privateJwk] = await Promise.all([crypto.subtle.exportKey("jwk", pair.publicKey), crypto.subtle.exportKey("jwk", pair.privateKey)]);
    st = { deviceId: crypto.randomUUID(), publicJwk, privateJwk };
    await idbSet("identity-v2", st).catch(() => {});
    writeLocal(st);
    return importIdentity(st);
  })();
  return identityPromise;
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

/* ── Fichiers (photos) : chiffrés une fois avec une clé jetable, la clé voyage dans le message ── */
export async function encryptBlob(data: ArrayBuffer): Promise<{ blob: Blob; key: string; iv: string }> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const raw = await crypto.subtle.exportKey("raw", key);
  return { blob: new Blob([ct], { type: "application/octet-stream" }), key: b64(raw), iv: b64(iv) };
}

export async function decryptBlob(ct: ArrayBuffer, keyB64: string, ivB64: string, type = "image/jpeg"): Promise<Blob | null> {
  try {
    const key = await crypto.subtle.importKey("raw", unb64(keyB64), { name: "AES-GCM" }, false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(ivB64) }, key, ct);
    return new Blob([pt], { type });
  } catch {
    return null;
  }
}
