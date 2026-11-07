"use client";

/*
 * Quand proposer les notifications : jamais à l'arrivée (tout le monde dit non), mais au
 * moment où ça a un sens — une demande d'ami envoyée, une partie finie, une notif reçue.
 * `requestPushNudge(reason)` est écouté par <LiveNotifier>, qui décide d'afficher ou non
 * (déjà activé, refusé, ou « plus tard » il y a moins de 7 jours → rien).
 */
export const PUSH_SNOOZE_KEY = "drf-push-snooze";

export function requestPushNudge(reason: "friend" | "game" | "notif" | "message") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("drf:push-nudge", { detail: { reason } }));
}

export function pushSnoozed(): boolean {
  try { return Number(localStorage.getItem(PUSH_SNOOZE_KEY) ?? 0) > Date.now(); } catch { return false; }
}
export function snoozePush(days = 7) {
  try { localStorage.setItem(PUSH_SNOOZE_KEY, String(Date.now() + days * 86400000)); } catch {}
}
