"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus, X, Smartphone, Download } from "lucide-react";
import { BlindTestMark } from "@/components/BlindTestLogo";

/*
 * Invite d'installation "comme une app" — détecte l'appareil et adapte le parcours :
 *
 * · Android (Chrome & navigateurs Chromium) : on capture l'événement `beforeinstallprompt`
 *   et on affiche un bouton "Installer" qui déclenche la boîte de dialogue NATIVE du
 *   système — un tap et l'icône est posée.
 * · iPhone / iPad (Safari) : Apple n'expose aucune API d'installation. On affiche donc
 *   un tutoriel visuel pas-à-pas : Partager → « Sur l'écran d'accueil ».
 * · Déjà installé (mode standalone) : on ne montre rien.
 * · Refusé : on mémorise en localStorage et on ne re-propose pas avant 14 jours.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "drf-install-dismissed-at";
const DISMISS_DAYS = 14;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS expose navigator.standalone
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectPlatform(): "ios" | "android" | "other" {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  // iPadOS 13+ se présente comme macOS mais a le tactile
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [visible, setVisible] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return; // déjà installé
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400_000) return;

    const p = detectPlatform();
    setPlatform(p);
    if (p === "ios") {
      // Pas d'API côté Apple : on propose le tutoriel directement (mais seulement sur iOS,
      // jamais sur desktop où ça n'aurait pas de sens).
      setVisible(true);
    }

    // Android/Chromium : on n'affiche l'invite QUE si le navigateur confirme que
    // l'installation est possible (l'événement ne se déclenche pas si déjà installé).
    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setShowIosSteps(false);
  }

  async function installAndroid() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setVisible(false);
    else dismiss();
  }

  if (!visible) return null;

  return (
    <>
      {/* Bannière compacte */}
      <div className="fixed bottom-24 lg:bottom-6 inset-x-0 z-40 px-4 flex justify-center pointer-events-none">
        <div className="glass rounded-3xl p-4 pr-3 flex items-center gap-3.5 max-w-md w-full pointer-events-auto shadow-[0_16px_50px_rgba(0,0,0,0.6)]">
          <BlindTestMark size={44} />
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-sm leading-tight">Le Blind Test en app</p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              {platform === "ios"
                ? "Ajoute-le à ton écran d'accueil, plein écran comme une vraie app."
                : "Installe-le sur ton écran d'accueil en un tap."}
            </p>
          </div>
          {platform === "android" && installEvent ? (
            <button onClick={installAndroid} className="press btn-primary rounded-2xl px-4 py-2.5 text-xs font-bold text-white flex items-center gap-1.5 shrink-0">
              <Download size={14} /> Installer
            </button>
          ) : (
            <button onClick={() => setShowIosSteps(true)} className="press btn-primary rounded-2xl px-4 py-2.5 text-xs font-bold text-white shrink-0">
              Voir comment
            </button>
          )}
          <button onClick={dismiss} aria-label="Fermer" className="press w-8 h-8 rounded-full flex items-center justify-center text-ink-faint hover:text-ink shrink-0">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Tutoriel iOS pas-à-pas */}
      {showIosSteps && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Installer sur iPhone">
          <div className="glass rounded-[28px] p-6 max-w-sm w-full bg-bg/95">
            <div className="flex items-center gap-3 mb-5">
              <BlindTestMark size={40} />
              <div>
                <p className="font-display font-bold leading-tight">Sur ton écran d'accueil</p>
                <p className="text-[11px] text-ink-muted">30 secondes, depuis Safari</p>
              </div>
              <button onClick={dismiss} aria-label="Fermer" className="press ml-auto w-9 h-9 rounded-full glass flex items-center justify-center text-ink-muted">
                <X size={16} />
              </button>
            </div>

            <ol className="space-y-3">
              {[
                {
                  Icon: Share,
                  text: (
                    <>
                      Touche le bouton <strong className="text-ink">Partager</strong>{" "}
                      <Share size={13} className="inline -mt-0.5 text-glow" /> en bas de Safari
                    </>
                  ),
                },
                {
                  Icon: SquarePlus,
                  text: (
                    <>
                      Fais défiler et choisis <strong className="text-ink">« Sur l'écran d'accueil »</strong>
                    </>
                  ),
                },
                {
                  Icon: Smartphone,
                  text: (
                    <>
                      Touche <strong className="text-ink">Ajouter</strong> — l'app est posée, plein écran, avec le logo
                    </>
                  ),
                },
              ].map(({ Icon, text }, i) => (
                <li key={i} className="flex items-center gap-3.5 rounded-2xl bg-white/[0.04] border border-white/10 p-3.5">
                  <span className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-glow to-signal text-white flex items-center justify-center">
                    <Icon size={16} />
                  </span>
                  <span className="text-[13px] text-ink-muted leading-snug">
                    <span className="font-mono text-[10px] text-glow mr-1.5">{i + 1}.</span>
                    {text}
                  </span>
                </li>
              ))}
            </ol>

            <button onClick={dismiss} className="press w-full mt-5 glass rounded-2xl py-3 text-sm font-semibold text-ink hover:bg-white/10">
              C'est fait !
            </button>
          </div>
        </div>
      )}
    </>
  );
}
