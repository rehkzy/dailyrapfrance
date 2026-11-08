"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import { oauthCallbackUrl } from "@/lib/authRedirect";

/*
 * Publicité — uniquement pour les visiteurs SANS compte. Connecté = zéro pub, c'est le deal.
 *  · Google AdSense si NEXT_PUBLIC_ADSENSE_CLIENT est défini (ca-pub-…), avec un id de bloc
 *    par emplacement dans NEXT_PUBLIC_ADSENSE_SLOT_<SLOT> (sinon bloc auto « responsive »).
 *  · Sans configuration : une « pub maison » qui vend le compte (pas de trou dans la page).
 */
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const SLOTS: Record<string, string | undefined> = {
  setup: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SETUP,
  final: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FINAL,
  home: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME,
  landing: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LANDING,
  actu: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ACTU,
};

declare global { interface Window { adsbygoogle?: unknown[] } }

export default function AdSlot({ slot, className = "" }: { slot: keyof typeof SLOTS; className?: string }) {
  const { user, loading } = useUser();
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const show = !loading && !user;

  useEffect(() => {
    if (!show || !CLIENT || pushed.current || !ref.current) return;
    pushed.current = true;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
  }, [show]);

  if (!show) return null;
  const signIn = () => { void createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: oauthCallbackUrl() } }); };
  if (!CLIENT) {
    return (
      <button type="button" onClick={signIn} className={`ad-house w-full text-left ${className}`} aria-label="Créer un compte">
        <span className="ad-house-tag">Pub</span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">Marre de la pub ? Crée ton compte.</span><span className="block text-xs text-ink-muted">Gratuit, 10 secondes. Zéro pub, scores gardés, potes à défier.</span></span>
        <span className="sticker sticker-sm shrink-0">Go</span>
      </button>
    );
  }
  return (
    <div className={`ad-box ${className}`}>
      <span className="ad-box-tag">Publicité · <button type="button" onClick={signIn} className="underline">sans pub avec un compte</button></span>
      <ins ref={ref} className="adsbygoogle" style={{ display: "block" }} data-ad-client={CLIENT} data-ad-slot={SLOTS[slot]} data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
}
