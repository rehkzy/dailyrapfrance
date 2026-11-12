"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Check, RotateCcw, X } from "lucide-react";

/*
 * Test du son avant de lancer — une ligne, dans tous les modes.
 *
 *  Idle   : « Tester le son »            → joue la signature DailyRap (2 s)
 *  Ask    : « Tu entends ? »  Oui / Non  → Oui : « Son OK », mémorisé pour la session
 *  Help   : 3 pistes si Non (volume, silencieux, casque Bluetooth)
 *
 * Le clic sert aussi de premier geste : il débloque la lecture audio du navigateur, donc
 * l'extrait de la première manche part sans bouton. `screen` : sur la TV, le texte d'aide
 * parle du volume de la TV plutôt que du téléphone.
 */
const KEY = "drf-sound-ok";
let el: HTMLAudioElement | null = null;

export function soundChecked() { try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; } }

export default function SoundCheck({ screen = "phone", className = "" }: { screen?: "phone" | "tv"; className?: string }) {
  const [state, setState] = useState<"idle" | "playing" | "ask" | "ok" | "help">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (soundChecked()) setState("ok"); return () => { if (timer.current) clearTimeout(timer.current); }; }, []);

  function play() {
    try {
      if (!el) { el = new Audio("/audio/tag.mp3"); el.preload = "auto"; }
      el.volume = 1; el.currentTime = 0;
      void el.play().catch(() => {});
    } catch {}
    window.dispatchEvent(new Event("drf:sound-test"));
    setState("playing");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("ask"), 2300);
  }
  function yes() { try { sessionStorage.setItem(KEY, "1"); } catch {} setState("ok"); }

  return (
    <div className={`soundcheck ${className}`} data-state={state} role="group" aria-label="Test du son">
      {state === "idle" && (
        <button type="button" onClick={play} className="soundcheck-main"><Volume2 size={16} /> Tester le son</button>
      )}
      {state === "playing" && (
        <span className="soundcheck-main" aria-live="polite"><span className="soundcheck-eq" aria-hidden="true"><i /><i /><i /><i /></span> Écoute…</span>
      )}
      {state === "ask" && (
        <>
          <span className="soundcheck-main"><Volume2 size={16} /> Tu as entendu ?</span>
          <span className="soundcheck-actions">
            <button type="button" onClick={yes} className="soundcheck-btn soundcheck-yes"><Check size={14} strokeWidth={3} /> Oui</button>
            <button type="button" onClick={() => setState("help")} className="soundcheck-btn">Non</button>
          </span>
        </>
      )}
      {state === "ok" && (
        <>
          <span className="soundcheck-main soundcheck-okmsg"><Check size={16} strokeWidth={3} /> Son OK</span>
          <button type="button" onClick={play} className="soundcheck-btn" aria-label="Retester le son"><RotateCcw size={13} /> Retester</button>
        </>
      )}
      {state === "help" && (
        <div className="soundcheck-help">
          <div className="flex items-center justify-between gap-2">
            <span className="soundcheck-main"><Volume2 size={16} /> Rien entendu ? Vérifie :</span>
            <button type="button" onClick={() => setState("idle")} className="soundcheck-btn" aria-label="Fermer"><X size={13} /></button>
          </div>
          <ul>
            {screen === "tv" ? (
              <>
                <li>Le volume de la TV (ou de l&apos;enceinte branchée) est monté.</li>
                <li>L&apos;onglet n&apos;est pas en sourdine — l&apos;icône son en haut à droite de cet écran.</li>
                <li>Sur un ordi en HDMI, la sortie son est bien la TV (réglages son).</li>
              </>
            ) : (
              <>
                <li>Le volume est monté — les boutons sur le côté, pendant que ça joue.</li>
                <li>Le mode silencieux est coupé (interrupteur sur iPhone, tiroir sur Android).</li>
                <li>Pas de casque Bluetooth oublié dans une autre pièce.</li>
              </>
            )}
          </ul>
          <button type="button" onClick={play} className="soundcheck-btn soundcheck-yes self-start"><RotateCcw size={13} /> Réessayer</button>
        </div>
      )}
    </div>
  );
}
