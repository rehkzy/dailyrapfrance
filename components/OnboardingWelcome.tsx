"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, Check, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";

/*
 * Première connexion (Google ou e-mail) : on ne garde pas d'office le nom et la photo du
 * compte Google. Une petite fenêtre propose de choisir son pseudo et sa photo de profil
 * — ou de garder ceux-là. Une seule fois (profiles.onboarded_at), jamais pendant une partie.
 */
export default function OnboardingWelcome() {
  const { user } = useUser();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    if (typeof window !== "undefined" && (/^\/(jouer|ecran|admin)/.test(window.location.pathname) || document.querySelector(".feed, .reel-feed"))) return;
    supabase.from("profiles").select("display_name, username, avatar_url, onboarded_at").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data || data.onboarded_at) return;
      setName(data.display_name ?? user.user_metadata?.full_name ?? "");
      setUsername(data.username ?? null);
      setAvatar(data.avatar_url ?? null);
      setOpen(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/") || file.size > 6 * 1024 * 1024) { setError("Image JPG/PNG/WebP, 6 Mo max."); return; }
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { cacheControl: "3600", upsert: true });
    setBusy(false);
    if (upErr) { setError("Envoi impossible — réessaie."); return; }
    setAvatar(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
  }

  async function save(keepGoogle = false) {
    if (!user) return;
    setBusy(true);
    setError(null);
    const display = (keepGoogle ? (user.user_metadata?.full_name as string | undefined) ?? name : name).trim().slice(0, 40) || "Joueur";
    const { error: err } = await supabase.from("profiles").update({ display_name: display, avatar_url: avatar, onboarded_at: new Date().toISOString() }).eq("id", user.id);
    setBusy(false);
    if (err) { setError("Impossible d'enregistrer. Réessaie."); return; }
    setOpen(false);
    window.dispatchEvent(new Event("drf-profile-updated"));
  }

  if (!open || !user) return null;
  const initial = (name || "?").slice(0, 1).toUpperCase();
  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <div className="ticket p-5 sm:p-6 w-full max-w-md solved-pop">
        <p className="stage-kicker mb-1 inline-flex items-center gap-1.5"><Sparkles size={13} /> Bienvenue</p>
        <h2 id="onb-title" className="font-display text-2xl font-extrabold leading-tight">Comment on t&apos;appelle ?</h2>
        <p className="text-sm text-ink-muted mt-1">C&apos;est ce que les autres joueurs verront — tu peux garder ton nom et ta photo Google, ou mettre les tiens. Modifiable plus tard dans Mon compte.</p>

        <div className="flex items-center gap-4 mt-5">
          <div className="relative shrink-0">
            {avatar ? (
              <img src={avatar} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-[#0f0809]" />
            ) : (
              <div className="w-20 h-20 rounded-full text-white grid place-items-center text-2xl font-extrabold border-4 border-[#0f0809]" style={{ background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{initial}</div>
            )}
            <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} aria-label="Changer la photo" className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gold text-white grid place-items-center border-2 border-[#0f0809]">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFile} />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="onb-name" className="text-xs font-semibold text-ink-faint mb-1.5 block">Pseudo</label>
            <input id="onb-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="answer-input !min-h-[48px]" placeholder="Ton pseudo" autoFocus />
            {username && <p className="text-[11px] text-ink-faint mt-1.5 truncate">Ton adresse de profil : @{username}</p>}
          </div>
        </div>
        {avatar && <button type="button" onClick={() => setAvatar(null)} className="text-xs font-semibold text-ink-faint hover:text-ink mt-2">Retirer la photo</button>}
        {error && <p className="text-xs text-riseNeg mt-2">{error}</p>}

        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button type="button" onClick={() => save(false)} disabled={busy || !name.trim()} className="sticker h-12 text-sm disabled:opacity-50"><Check size={16} strokeWidth={3} /> C&apos;est bon</button>
          <button type="button" onClick={() => save(true)} disabled={busy} className="sticker sticker-ghost h-12 text-sm">Garder tel quel</button>
        </div>
      </div>
    </div>
  );
}
