"use client";

/*
 * Côté navigateur : activer les notifications (il faut un geste de l'utilisateur) et
 * s'abonner. Sur iPhone, les notifications ne marchent que si le site est installé sur
 * l'écran d'accueil (iOS 16.4+) — `pushSupport()` le dit pour adapter le message.
 */
export type PushSupport = "ok" | "ios-needs-install" | "unsupported" | "denied";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return ios && !standalone ? "ios-needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

export function pushEnabled(): boolean {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && localStorage.getItem("drf-push") === "1";
}

function b64ToU8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** À appeler depuis un clic. Renvoie true si l'abonnement est enregistré. */
export async function enablePush(): Promise<boolean> {
  try {
    if (pushSupport() !== "ok") return false;
    const { publicKey } = await fetch("/api/push").then((r) => r.json());
    if (!publicKey) return false;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return false;
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(publicKey) }));
    const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
    if (!res.ok) return false;
    localStorage.setItem("drf-push", "1");
    return true;
  } catch {
    return false;
  }
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
  } catch {}
  localStorage.removeItem("drf-push");
}
