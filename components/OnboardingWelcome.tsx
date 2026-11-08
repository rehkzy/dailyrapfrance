"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, Check, Loader2, Sparkles, AtSign, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";

/*
 * Première connexion (Google ou e-mail) : on ne garde pas d'office le nom, l'identifiant
 * et la photo tirés du compte Google. Une fenêtre propose de choisir son pseudo, son
 * @identifiant (une seule fois : c'est l'adresse du profil), sa photo et une bio — ou de
 * garder ce qui est là. Une fois par compte (profiles.onboarded_at ; repli local si la
 * colonne n'existe pas encore), jamais pendant une partie.
 */
const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

function localKey(uid: string) {
  return `drf-onboarded-${uid}`;
}

export default function OnboardingWelcome() {
  const { user } = useUser();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handle0, setHandle0] = useState("");
  const [handleState, setHandleState] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasColumn, setHasColumn] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    if (typeof window !== "undefined" && (/^\/(jouer|ecran|admin|b\/)/.test(window.location.pathname) || document.querySelector(".feed, .reel-feed, .swipe-screen"))) return;
    try { if (localStorage.getItem(localKey(user.id))) return; } catch {}
    (async () => {
      let { data, error: err } = await supabase.from("profiles").select("display_name, username, avatar_url, bio, created_at, onboarded_at").eq("id", user.id).maybeSingle();
      if (err) {
        // Migration pas encore passée : on se rabat sur created_at + mémoire locale.
        setHasColumn(false);
        const r = await supabase.from("profiles").select("display_name, username, avatar_url, created_at").eq("id", user.id).maybeSingle();
        data = r.data ? { ...r.data, bio: null, onboarded_at: null } : null;
        if (data && Date.now() - new Date(data.created_at).getTime() > 30 * 60 * 1000) return;
      }
      if (!data || data.onboarded_at) return;
      setName(data.display_name ?? (user.user_metadata?.full_name as string | undefined) ?? "");
      setHandle(data.username ?? "");
      setHandle0(data.username ?? "");
      setAvatar(data.avatar_url ?? null);
      setBio(data.bio ?? "");
      setOpen(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Identifiant : format, puis disponibilité (debounce)
  useEffect(() => {
    if (!open) return;
    const h = handle.trim().toLowerCase();
    if (h === handle0) { setHandleState("idle"); return; }
    if (!HANDLE_RE.test(h)) { setHandleState("invalid"); return; }
    setHandleState("checking");
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id").eq("username", h).maybeSingle();
      setHandleState(data ? "taken" : "ok");
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, handle0, open]);

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

  function markDone() {
    if (user) { try { localStorage.setItem(localKey(user.id), "1"); } catch {} }
    setOpen(false);
    window.dispatchEvent(new Event("drf-profile-updated"));
  }

  async function save(keepAsIs = false) {
    if (!user) return;
    setBusy(true);
    setError(null);
    const h = handle.trim().toLowerCase();
    const patch: Record<string, unknown> = hasColumn ? { onboarded_at: new Date().toISOString() } : {};
    if (!keepAsIs) {
      if (h !== handle0 && handleState !== "ok") { setBusy(false); setError(handleState === "taken" ? "Cet identifiant est déjà pris." : "Identifiant : 3 à 20 caractères, lettres minuscules, chiffres ou _."); return; }
      patch.display_name = name.trim().slice(0, 40) || "Joueur";
      patch.avatar_url = avatar;
      patch.bio = bio.trim().slice(0, 120) || null;
      if (h !== handle0) patch.username = h;
    }
    const { error: err } = await supabase.from("profiles").update(patch).eq("id", user.id);
    setBusy(false);
    if (err) {
      if (/bio|column/i.test(err.message) && patch.bio !== undefined) {
        // Colonne bio absente : on réessaie sans.
        delete patch.bio;
        const r = await supabase.from("profiles").update(patch).eq("id", user.id);
        if (!r.error) return markDone();
      }
      setError("Impossible d'enregistrer. Réessaie.");
      return;
    }
    markDone();
  }

  if (!open || !user) return null;
  const initial = (name || "?").slice(0, 1).toUpperCase();
  const handleMsg =
    handleState === "taken" ? "Déjà pris" : handleState === "invalid" ? "3–20 caractères : a-z, 0-9, _" : handleState === "ok" ? "Disponible" : handleState === "checking" ? "…" : "";
  const canSave = !busy && !!name.trim() && (handle.trim().toLowerCase() === handle0 || handleState === "ok");

  return (
    <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <div className="ticket p-5 sm:p-6 w-full max-w-md solved-pop max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="stage-kicker mb-1 inline-flex items-center gap-1.5"><Sparkles size={13} /> Bienvenue</p>
            <h2 id="onb-title" className="font-display text-2xl font-extrabold leading-tight">Ton profil, à ta façon.</h2>
          </div>
          <button type="button" onClick={() => save(true)} disabled={busy} aria-label="Garder tel quel" className="w-9 h-9 rounded-full bg-white/6 border border-white/10 grid place-items-center text-ink-muted shrink-0"><X size={15} /></button>
        </div>
        <p className="text-sm text-ink-muted mt-1.5">C&apos;est ce que les autres joueurs verront. Modifiable plus tard, sauf l&apos;identifiant.</p>

        <div className="flex items-center gap-4 mt-5">
          <div className="relative shrink-0">
            {avatar ? (
              <img src={avatar} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-gold/50 ring-offset-2 ring-offset-[#0f0809]" />
            ) : (
              <div className="w-20 h-20 rounded-full text-white grid place-items-center text-2xl font-extrabold ring-2 ring-gold/50 ring-offset-2 ring-offset-[#0f0809]" style={{ background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{initial}</div>
            )}
            <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} aria-label="Changer la photo" className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gold text-white grid place-items-center border-2 border-[#0f0809]">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFile} />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="onb-name" className="text-xs font-semibold text-ink-faint mb-1.5 block">Pseudo affiché</label>
            <input id="onb-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="answer-input !min-h-[48px]" placeholder="Ton pseudo" autoFocus autoComplete="nickname" />
            {avatar && <button type="button" onClick={() => setAvatar(null)} className="text-[11px] font-semibold text-ink-faint hover:text-ink mt-1.5">Retirer la photo</button>}
          </div>
        </div>

        <label htmlFor="onb-handle" className="text-xs font-semibold text-ink-faint mt-4 mb-1.5 block">Identifiant <span className="font-normal">— l&apos;adresse de ton profil, à choisir une fois</span></label>
        <div className="relative">
          <AtSign size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input id="onb-handle" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))} className="answer-input !min-h-[48px] !pl-10 !pr-24" placeholder="identifiant" autoComplete="off" autoCapitalize="off" spellCheck={false} />
          {handleMsg && <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-semibold ${handleState === "ok" ? "text-risePos" : handleState === "checking" ? "text-ink-faint" : "text-riseNeg"}`}>{handleMsg}</span>}
        </div>
        <p className="text-[11px] text-ink-faint mt-1.5 truncate">dailyrapfrance.best/profil/{handle.trim().toLowerCase() || "…"}</p>

        <label htmlFor="onb-bio" className="text-xs font-semibold text-ink-faint mt-4 mb-1.5 block">Bio <span className="font-normal">— facultatif</span></label>
        <input id="onb-bio" value={bio} onChange={(e) => setBio(e.target.value.slice(0, 120))} maxLength={120} className="answer-input !min-h-[46px] !text-sm" placeholder="Team 93, fan de Ninho depuis M.I.L.S…" />

        {error && <p className="text-xs text-riseNeg mt-3">{error}</p>}

        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button type="button" onClick={() => save(false)} disabled={!canSave} className="sticker h-12 text-sm disabled:opacity-50"><Check size={16} strokeWidth={3} /> C&apos;est bon</button>
          <button type="button" onClick={() => save(true)} disabled={busy} className="sticker sticker-ghost h-12 text-sm">Garder tel quel</button>
        </div>
      </div>
    </div>
  );
}
