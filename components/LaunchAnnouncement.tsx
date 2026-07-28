"use client";

import { useEffect, useState } from "react";
import { X, Share2, Download, Play, Check, ImageIcon } from "lucide-react";
import { DRMark3D } from "@/components/BlindTestLogo";

/*
 * Pop-up d'annonce du lancement — "le média DailyRapFrance évolue et lance LE blind test
 * rap français, 100% gratuit et en ligne", avec un vrai parcours de partage :
 *
 * · "Partager en story" — partage natif (Instagram, WhatsApp…) avec le VISUEL story
 *   1080x1920 joint quand le navigateur sait partager des fichiers (mobile), sinon
 *   partage du lien, sinon copie du lien.
 * · "Télécharger le visuel" — récupère le PNG story pour le poster manuellement.
 *
 * Affichée à CHAQUE visite (sessionStorage : une fois par session de navigation —
 * fermer la pop-up ne la masque que pour la session en cours, elle revient à la
 * prochaine visite), jamais en plein jeu (montée uniquement sur le hub).
 */

const SEEN_KEY = "drf-annonce-session";
const STORY_URL = "/story-blindtest.png";
const SHARE_TEXT =
  "DailyRapFrance lance LE blind test rap français — 100% gratuit, en ligne, solo ou entre potes. Viens tester ton niveau 🔥";

export default function LaunchAnnouncement() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SEEN_KEY)) return;
    // léger délai : laisser la page se poser avant l'annonce
    const t = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    sessionStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  }

  async function share() {
    const url = window.location.origin;
    // 1) partage natif avec le visuel story joint (mobile principalement)
    try {
      const res = await fetch(STORY_URL);
      const blob = await res.blob();
      const file = new File([blob], "blindtest-dailyrapfrance.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: SHARE_TEXT, title: "Blind Test Rap Français" });
        dismiss();
        return;
      }
    } catch {
      // fichier indisponible ou partage annulé → suite
    }
    // 2) partage natif du lien
    if (navigator.share) {
      try {
        await navigator.share({ title: "Blind Test Rap Français", text: SHARE_TEXT, url });
        dismiss();
        return;
      } catch {
        return; // annulé par l'utilisateur : on laisse la pop-up ouverte
      }
    }
    // 3) copie du lien
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* rien à faire */
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="DailyRapFrance lance son blind test"
    >
      <div className="glass rounded-[28px] max-w-md w-full bg-bg/95 overflow-hidden">
        {/* En-tête visuel */}
        <div className="relative px-6 pt-7 pb-5 text-center aurora">
          <button
            onClick={dismiss}
            aria-label="Fermer"
            className="press absolute top-4 right-4 w-9 h-9 rounded-full glass flex items-center justify-center text-ink-muted hover:text-ink"
          >
            <X size={16} />
          </button>
          <div className="flex justify-center mb-4">
            <span className="block w-20 h-20">
              <DRMark3D size="100%" />
            </span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-glow mb-2">
            DailyRapFrance évolue
          </p>
          <h2 className="font-display font-extrabold text-2xl leading-tight">
            Le média lance <span className="text-gold">son blind test</span>
            <br />
            rap français
          </h2>
          <p className="text-sm text-ink-muted mt-3">
            100% gratuit, en ligne, solo ou entre potes. Défi du jour, classement, salons privés — tout est déjà là.
          </p>
        </div>

        {/* Actions */}
        <div className="p-5 space-y-2.5">
          <button
            onClick={dismiss}
            className="press btn-primary w-full flex items-center justify-center gap-2.5 rounded-2xl py-3.5 font-bold text-[15px] text-white"
          >
            <Play size={17} fill="currentColor" /> Jouer maintenant
          </button>
          <button
            onClick={share}
            className="press w-full flex items-center justify-center gap-2.5 rounded-2xl py-3.5 font-semibold text-sm glass text-ink hover:bg-white/10"
          >
            {copied ? <Check size={16} className="text-[#3DDC84]" /> : <Share2 size={16} className="text-glow" />}
            {copied ? "Lien copié !" : "Partager en story"}
          </button>
          <a
            href={STORY_URL}
            download="blindtest-dailyrapfrance.png"
            className="press w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-medium text-ink-muted hover:text-ink"
          >
            <ImageIcon size={14} />
            Télécharger le visuel story (1080×1920)
            <Download size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
