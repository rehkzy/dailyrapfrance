"use client";

import { useEffect, useState } from "react";

/*
 * Détection "installable" partagée par la pop-up, la section d'accueil et la bannière :
 *  - plateforme (iOS / Android / ordinateur) et mode standalone (déjà installé)
 *  - sur Chromium Android/desktop : capture de `beforeinstallprompt` pour déclencher la
 *    boîte de dialogue native d'installation en un tap.
 */

export type Platform = "ios" | "android" | "desktop";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let capturedEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    capturedEvent = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    capturedEvent = null;
    listeners.forEach((l) => l());
  });
}

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios"; // iPadOS
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useInstall() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setStandalone(isStandalone());
    const sync = () => setCanPrompt(!!capturedEvent);
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  async function install(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!capturedEvent) return "unavailable";
    await capturedEvent.prompt();
    const { outcome } = await capturedEvent.userChoice;
    if (outcome === "accepted") capturedEvent = null;
    setCanPrompt(!!capturedEvent);
    return outcome;
  }

  return { platform, standalone, canPrompt, install };
}
