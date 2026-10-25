"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Share, SquarePlus, Smartphone, Download, X, MoreVertical, Monitor } from "lucide-react";
import QRCode from "qrcode";
import { BrandTile } from "@/components/BrandMark";
import { useInstall } from "@/lib/useInstall";

/*
 * "Bientôt sur l'App Store et Google Play" — en attendant, le site s'ajoute à l'écran
 * d'accueil comme une app (PWA). Deux surfaces, un seul contenu adapté à l'appareil :
 *  - <AppStoreCallout /> : section inline (accueil, fin de partie).
 *  - <AppComingSoonModal /> : pop-up, une fois par appareil (mémorisée 14 jours), jamais
 *    pendant une partie, jamais si déjà installé.
 */

const MODAL_KEY = "drf-app-popup-seen-at";
const MODAL_DAYS = 14;
const SITE = "https://dailyrapfrance.best/jouer";

function StoreBadges() {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Disponibilité sur les stores">
      {["App Store", "Google Play"].map((s) => (
        <span key={s} className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-ink-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-glow animate-pulse" aria-hidden="true" />
          {s} — bientôt
        </span>
      ))}
    </div>
  );
}

function Steps({ platform, canPrompt, onInstall }: { platform: "ios" | "android" | "desktop"; canPrompt: boolean; onInstall: () => void }) {
  if (platform === "android" && canPrompt) {
    return (
      <button type="button" onClick={onInstall} className="game-btn game-btn-primary h-12 px-6 text-sm gap-2 w-full sm:w-auto">
        <Download size={16} /> Installer sur mon téléphone
      </button>
    );
  }
  const steps =
    platform === "ios"
      ? [
          { Icon: Share, text: <>Touche <strong className="text-ink">Partager</strong> en bas de Safari</> },
          { Icon: SquarePlus, text: <>Choisis <strong className="text-ink">« Sur l&apos;écran d&apos;accueil »</strong></> },
          { Icon: Smartphone, text: <>Touche <strong className="text-ink">Ajouter</strong> — l&apos;icône est posée</> },
        ]
      : platform === "android"
        ? [
            { Icon: MoreVertical, text: <>Ouvre le menu <strong className="text-ink">⋮</strong> de Chrome</> },
            { Icon: SquarePlus, text: <>Touche <strong className="text-ink">« Ajouter à l&apos;écran d&apos;accueil »</strong> ou « Installer l&apos;application »</> },
            { Icon: Smartphone, text: <>Confirme — l&apos;icône est posée</> },
          ]
        : [
            { Icon: Smartphone, text: <>Scanne le QR code avec ton téléphone</> },
            { Icon: Share, text: <>Sur iPhone : Partager → « Sur l&apos;écran d&apos;accueil ». Sur Android : menu ⋮ → « Installer »</> },
            { Icon: Monitor, text: <>Sur cet ordinateur : Chrome propose aussi « Installer DailyRap » dans la barre d&apos;adresse</> },
          ];
  return (
    <ol className="space-y-2">
      {steps.map(({ Icon, text }, i) => (
        <li key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5">
          <span className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-glow to-signal text-white grid place-items-center">
            <Icon size={14} />
          </span>
          <span className="text-[13px] text-ink-muted leading-snug">
            <span className="font-mono text-[10px] text-glow mr-1.5">{i + 1}.</span>
            {text}
          </span>
        </li>
      ))}
    </ol>
  );
}

function SiteQr() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(SITE, { width: 220, margin: 1, color: { dark: "#0A0707", light: "#FFFFFF" } })
      .then(setSrc)
      .catch(() => {});
  }, []);
  if (!src) return <div className="w-36 h-36 rounded-xl bg-white/5" aria-hidden="true" />;
  return <img src={src} alt="QR code vers dailyrapfrance.best/jouer" className="w-36 h-36 rounded-xl bg-white p-1.5" />;
}

export function AppStoreCallout({ compact = false }: { compact?: boolean }) {
  const { platform, standalone, canPrompt, install } = useInstall();
  if (standalone) return null;
  const p = platform ?? "desktop";
  return (
    <div className={`card ${compact ? "p-5" : "p-6 sm:p-8"}`}>
      <div className="flex flex-col md:flex-row gap-6 md:items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <BrandTile size={48} />
            <div>
              <p className="font-display text-lg sm:text-xl font-bold leading-tight">L&apos;app DailyRap arrive sur les stores</p>
              <p className="text-xs text-ink-faint">En attendant, ajoute-la à ton écran d&apos;accueil : même icône, plein écran, lancement instantané.</p>
            </div>
          </div>
          <div className="mb-4">
            <StoreBadges />
          </div>
          <Steps platform={p} canPrompt={canPrompt} onInstall={() => void install()} />
        </div>
        {p === "desktop" && !compact && (
          <div className="shrink-0 flex flex-col items-center gap-2">
            <SiteQr />
            <span className="text-[11px] text-ink-faint">dailyrapfrance.best/jouer</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function AppComingSoonModal() {
  const pathname = usePathname();
  const { platform, standalone, canPrompt, install } = useInstall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (standalone || platform === null) return;
    // Pas pendant une partie ni sur les écrans admin/TV.
    if (pathname?.startsWith("/ecran") || pathname?.startsWith("/admin")) return;
    try {
      const seen = Number(localStorage.getItem(MODAL_KEY) ?? 0);
      if (seen && Date.now() - seen < MODAL_DAYS * 86_400_000) return;
    } catch {
      return;
    }
    const t = setTimeout(() => {
      if (document.body.classList.contains("game-immersive")) return; // partie en cours
      setOpen(true);
    }, 9000);
    return () => clearTimeout(t);
  }, [standalone, platform, pathname]);

  function close() {
    try {
      localStorage.setItem(MODAL_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open || !platform) return null;
  return (
    <>
      <button type="button" aria-label="Fermer" onClick={close} className="sheet-backdrop" />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="app-soon-title">
        <div className="sheet-handle" />
        <div className="flex items-start gap-3 mb-4">
          <BrandTile size={44} />
          <div className="flex-1 min-w-0">
            <p id="app-soon-title" className="font-display text-lg font-bold leading-tight">Bientôt sur l&apos;App Store et Google Play</p>
            <p className="text-xs text-ink-muted mt-1">
              {platform === "desktop"
                ? "En attendant, le blind test se joue déjà comme une app sur ton téléphone."
                : "En attendant, ajoute le blind test à ton écran d'accueil — 20 secondes, et il se lance comme une app."}
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Fermer" className="w-9 h-9 rounded-full glass grid place-items-center text-ink-muted shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="mb-4">
          <StoreBadges />
        </div>
        {platform === "desktop" ? (
          <div className="flex items-center gap-4 mb-4">
            <SiteQr />
            <p className="text-sm text-ink-muted leading-snug">Scanne ce code avec ton téléphone, puis ajoute le site à l&apos;écran d&apos;accueil.</p>
          </div>
        ) : (
          <div className="mb-4">
            <Steps
              platform={platform}
              canPrompt={canPrompt}
              onInstall={async () => {
                const r = await install();
                if (r === "accepted") close();
              }}
            />
          </div>
        )}
        <button type="button" onClick={close} className="press w-full glass rounded-2xl py-3 text-sm font-semibold text-ink hover:bg-white/10">
          {platform === "desktop" ? "Compris" : "Plus tard"}
        </button>
      </div>
    </>
  );
}
