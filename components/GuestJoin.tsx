"use client";

import { useEffect, useState } from "react";
import { Tv, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { oauthCallbackUrl } from "@/lib/authRedirect";
import BrandLoader from "@/components/BrandLoader";
import { sfx } from "@/lib/sfx";

/*
 * Entrée d'un invité dans une soirée : un pseudo, un bouton, et il est dans le salon.
 * Sous le capot : connexion anonyme Supabase (un compte temporaire, sans e-mail ni mot de
 * passe), pour que les scores, le chat et les réactions marchent comme pour tout le monde.
 * Si la connexion anonyme n'est pas activée côté Supabase, on retombe sur Google.
 */
type Peek = { found: boolean; isParty?: boolean; label?: string; players?: number; host?: string; status?: string; rounds?: number };

export default function GuestJoin({ code, onBack, onNeedAccount }: { code: string; onBack: () => void; onNeedAccount: () => void }) {
  const [peek, setPeek] = useState<Peek | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/rooms/peek?code=${encodeURIComponent(code)}`).then((r) => r.json()).then(setPeek).catch(() => setPeek({ found: false }));
    try { setName(localStorage.getItem("drf-guest-name") ?? ""); } catch {}
  }, [code]);

  async function enter() {
    const pseudo = name.trim().slice(0, 24);
    if (pseudo.length < 2) { setErr("Un pseudo d'au moins 2 lettres."); return; }
    setBusy(true); setErr(null);
    try { localStorage.setItem("drf-guest-name", pseudo); } catch {}
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInAnonymously({ options: { data: { full_name: pseudo, guest: true } } });
    if (error || !data.user) {
      setBusy(false);
      // Connexion anonyme désactivée côté Supabase → on propose Google, l'invitation est gardée.
      setErr("L'entrée invité n'est pas disponible. Connecte-toi avec Google, ça prend 10 secondes.");
      return;
    }
    await supabase.from("profiles").upsert({ id: data.user.id, display_name: pseudo }).then(() => {});
    sfx.correct();
    // Le reste du flux (useUser → salon) reprend tout seul avec la session.
    window.location.href = `/jouer?mode=online&room=${encodeURIComponent(code)}`;
  }

  function google() {
    void createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: oauthCallbackUrl() } });
  }

  if (!peek) return <div className="py-20 grid place-items-center"><BrandLoader size="md" /></div>;
  if (!peek.found) {
    return (
      <div className="max-w-sm mx-auto ticket p-7 text-center mt-10">
        <p className="font-display text-xl font-bold mb-2">Salon {code} introuvable</p>
        <p className="text-sm text-ink-muted mb-5">Il est peut-être fermé. Demande le nouveau code à l&apos;hôte.</p>
        <button type="button" onClick={onBack} className="sticker sticker-ghost sticker-sm">Retour</button>
      </div>
    );
  }
  if (!peek.isParty) { onNeedAccount(); return null; }

  return (
    <div className="max-w-sm mx-auto mt-6">
      <button type="button" onClick={onBack} className="back-link mb-4"><ChevronLeft size={16} /> Retour</button>
      <div className="ticket p-6">
        <span className="w-14 h-14 rounded-2xl bg-gold text-white grid place-items-center mb-4 shadow-brand"><Tv size={26} /></span>
        <p className="stage-kicker mb-1">Soirée de {peek.host}</p>
        <h2 className="font-display text-3xl font-extrabold leading-tight mb-1">{peek.label}</h2>
        <p className="text-sm text-ink-muted mb-5">{peek.players ? `${peek.players} joueur${peek.players > 1 ? "s" : ""} déjà là · ` : ""}{peek.rounds} manches · code <b className="text-ink">{code}</b></p>
        <label className="block text-sm font-semibold mb-1.5" htmlFor="guest-name">Ton pseudo</label>
        <input id="guest-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} onKeyDown={(e) => { if (e.key === "Enter") void enter(); }} placeholder="Comme on t'appelle" className="answer-input w-full mb-3" autoComplete="nickname" autoFocus enterKeyHint="go" />
        {err && <p className="text-sm text-riseNeg mb-3">{err}</p>}
        <button type="button" onClick={() => void enter()} disabled={busy} className="sticker w-full justify-center h-14 text-base">{busy ? <BrandLoader size="sm" /> : "Entrer dans la soirée"}</button>
        <button type="button" onClick={google} className="w-full text-center text-sm text-ink-muted py-3">J&apos;ai un compte · <span className="text-ink font-semibold">Google</span></button>
      </div>
    </div>
  );
}
