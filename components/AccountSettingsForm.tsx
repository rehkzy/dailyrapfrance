"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Check, Loader2, Image as ImageIcon, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BANNER_PRESETS, bannerStyle, type Badge } from "@/lib/badges";

/*
 * Mon compte = personnalisation du profil : bannière (preset de la marque ou ta photo),
 * photo de profil, pseudo, bio, et les 3 badges mis en avant. Chaque bloc s'enregistre
 * seul, avec un aperçu en direct en haut.
 */
export default function AccountSettingsForm({
  userId,
  username,
  initialDisplayName,
  initialAvatarUrl,
  initialBanner,
  initialBio,
  initialShowcase,
  badges,
}: {
  userId: string;
  username: string | null;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
  initialBanner: string | null;
  initialBio: string | null;
  initialShowcase: string[];
  badges: Badge[];
}) {
  const supabase = createClient();
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [banner, setBanner] = useState<string | null>(initialBanner);
  const [showcase, setShowcase] = useState<string[]>(initialShowcase);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unlocked = badges.filter((b) => b.unlocked);

  async function update(fields: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    const { error } = await supabase.from("profiles").update(fields).eq("id", userId);
    setBusy(null);
    if (error) {
      setError("Impossible d'enregistrer. Réessaie.");
      return false;
    }
    setSaved(key);
    setTimeout(() => setSaved((v) => (v === key ? null : v)), 1800);
    return true;
  }

  async function upload(file: File, kind: "avatar" | "banner"): Promise<string | null> {
    if (!file.type.startsWith("image/")) {
      setError("Choisis un fichier image (JPG, PNG, WebP…).");
      return null;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("L'image doit faire moins de 6 Mo.");
      return null;
    }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { cacheControl: "3600", upsert: true });
    if (upErr) {
      setError("L'envoi de l'image a échoué. Réessaie.");
      return null;
    }
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  async function onAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("avatar");
    const url = await upload(file, "avatar");
    if (url && (await update({ avatar_url: url }, "avatar"))) setAvatarUrl(url);
    setBusy(null);
  }
  async function onBannerFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("banner");
    const url = await upload(file, "banner");
    if (url && (await update({ banner: url }, "banner"))) setBanner(url);
    setBusy(null);
  }
  async function pickPreset(id: string) {
    setBanner(id);
    await update({ banner: id }, "banner");
  }
  function toggleShowcase(id: string) {
    setShowcase((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]));
  }

  return (
    <div className="space-y-4">
      {/* Aperçu */}
      <div className="ticket overflow-hidden">
        <div className="h-28 sm:h-36 relative" style={bannerStyle(banner)}>
          <button type="button" onClick={() => bannerInput.current?.click()} disabled={busy === "banner"} className="absolute right-3 bottom-3 h-9 px-3 rounded-full bg-black/55 border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 backdrop-blur">
            {busy === "banner" ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} Ma photo en bannière
          </button>
          <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={onBannerFile} />
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-end gap-4 -mt-9">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-[#0b0507]" />
              ) : (
                <div className="w-20 h-20 rounded-full text-white flex items-center justify-center text-2xl font-extrabold border-4 border-[#0b0507]" style={{ background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{(displayName || "?").slice(0, 1).toUpperCase()}</div>
              )}
              <button type="button" onClick={() => avatarInput.current?.click()} disabled={busy === "avatar"} aria-label="Changer la photo de profil" className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gold text-white grid place-items-center border-2 border-[#0b0507]">
                {busy === "avatar" ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </button>
              <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
            </div>
            <div className="min-w-0 pb-1">
              <p className="font-display text-xl font-extrabold leading-tight truncate">{displayName || "Joueur"}</p>
              {username && <p className="text-xs text-ink-faint">@{username}</p>}
            </div>
          </div>
          {showcase.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {showcase.map((id) => { const b = badges.find((x) => x.id === id); return b ? <span key={id} className="inline-flex items-center gap-1 rounded-full bg-white/8 border border-white/10 px-2.5 py-1 text-xs font-semibold">{b.emoji} {b.label}</span> : null; })}
            </div>
          )}
        </div>
      </div>

      {/* Bannière : presets */}
      <div className="ticket p-5">
        <p className="text-xs font-semibold text-ink-faint mb-3">Bannière</p>
        <div className="grid grid-cols-5 gap-2">
          {BANNER_PRESETS.map((b) => (
            <button key={b.id} type="button" onClick={() => pickPreset(b.id)} aria-label={b.label} aria-pressed={banner === b.id} className={`h-12 rounded-xl border-2 transition-transform active:scale-95 ${banner === b.id ? "border-white" : "border-transparent"}`} style={{ background: b.css }} />
          ))}
        </div>
        <p className="text-[11px] text-ink-faint mt-2">Ou ta propre photo avec le bouton sur l&apos;aperçu (6 Mo max).</p>
      </div>

      {/* Pseudo + bio */}
      <div className="ticket p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-ink-faint mb-2 block" htmlFor="acc-name">Pseudo</label>
          <div className="flex gap-2">
            <input id="acc-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} className="answer-input !min-h-[48px] flex-1" />
            <button type="button" onClick={() => displayName.trim() && update({ display_name: displayName.trim() }, "name")} disabled={busy === "name" || !displayName.trim()} className="sticker sticker-sm shrink-0">{saved === "name" ? <Check size={16} /> : "OK"}</button>
          </div>
          {username && <p className="text-[11px] text-ink-faint mt-1.5">Ton identifiant @{username} ne change pas — c&apos;est l&apos;adresse de ton profil.</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-faint mb-2 block" htmlFor="acc-bio">Bio</label>
          <textarea id="acc-bio" value={bio} onChange={(e) => setBio(e.target.value.slice(0, 140))} rows={2} placeholder="Team 93, PNL jusqu'à la mort, imbattable sur les années 2010…" className="answer-input !min-h-[72px] w-full resize-none" />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-ink-faint">{bio.length} / 140</span>
            <button type="button" onClick={() => update({ bio: bio.trim() || null }, "bio")} disabled={busy === "bio"} className="sticker sticker-ghost sticker-sm">{saved === "bio" ? <><Check size={14} /> Enregistré</> : "Enregistrer la bio"}</button>
          </div>
        </div>
      </div>

      {/* Badges mis en avant */}
      <div className="ticket p-5">
        <div className="flex items-baseline justify-between mb-1">
          <p className="font-display text-lg font-bold inline-flex items-center gap-1.5"><Sparkles size={16} className="text-gold" /> Badges mis en avant</p>
          <span className="text-xs text-ink-faint">{showcase.length} / 3</span>
        </div>
        <p className="text-xs text-ink-faint mb-3">Choisis jusqu&apos;à 3 succès débloqués à afficher en tête de ton profil.</p>
        {unlocked.length === 0 ? (
          <p className="text-sm text-ink-muted">Aucun succès débloqué pour l&apos;instant — joue une partie connectée et reviens.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unlocked.map((b) => {
              const on = showcase.includes(b.id);
              return (
                <button key={b.id} type="button" onClick={() => toggleShowcase(b.id)} aria-pressed={on} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold border transition-colors ${on ? "bg-gold text-white border-gold" : "bg-white/6 border-white/10 text-ink-muted hover:text-ink"}`}>
                  <span>{b.emoji}</span> {b.label}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button type="button" onClick={() => update({ showcase }, "showcase")} disabled={busy === "showcase"} className="sticker sticker-sm">{saved === "showcase" ? <><Check size={14} /> Enregistré</> : "Enregistrer"}</button>
        </div>
      </div>

      {error && <p className="text-sm text-riseNeg">{error}</p>}
    </div>
  );
}
