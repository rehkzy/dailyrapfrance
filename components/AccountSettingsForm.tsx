"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AccountSettingsForm({
  userId,
  initialDisplayName,
  initialAvatarUrl,
  username,
}: {
  userId: string;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
  username: string | null;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = displayName.trim() !== initialDisplayName && displayName.trim().length > 0;

  async function saveName() {
    if (!dirty) return;
    setSavingName(true);
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", userId);
    setSavingName(false);
    if (error) {
      setError("Impossible d'enregistrer le pseudo. Réessaie.");
      return;
    }
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function handleAvatarPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de reprendre le même fichier ensuite si besoin
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choisis un fichier image (JPG, PNG, WebP...).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("L'image doit faire moins de 5 Mo.");
      return;
    }
    setError(null);
    setUploadingAvatar(true);

    const ext = file.name.split(".").pop() || "jpg";
    // Chemin préfixé par l'id utilisateur — c'est exactement ce que vérifient les policies RLS
    // du bucket "avatars" ((storage.foldername(name))[1] = auth.uid()), donc l'upload échoue
    // proprement si jamais l'id ne correspond pas à la session active.
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (uploadError) {
      setUploadingAvatar(false);
      setError("L'envoi de la photo a échoué. Réessaie.");
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = pub.publicUrl;

    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", userId);

    setUploadingAvatar(false);
    if (updateError) {
      setError("Photo envoyée mais impossible de mettre à jour le profil. Réessaie.");
      return;
    }
    setAvatarUrl(newUrl);
  }

  return (
    <div className="card p-6 mb-10">
      <div className="flex items-center gap-5 mb-6">
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border border-white/10" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xl font-medium">
              {(displayName || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label="Changer la photo de profil"
            className="tap-press absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold text-white flex items-center justify-center border-2 border-bg shadow-md disabled:opacity-60"
          >
            {uploadingAvatar ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Photo de profil</p>
          <p className="text-xs text-ink-faint mt-0.5">JPG, PNG ou WebP, 5 Mo max.</p>
        </div>
      </div>

      <label className="block text-xs font-mono text-gold uppercase tracking-[0.16em] mb-2">Pseudo</label>
      <div className="flex gap-2 mb-1">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          placeholder="Ton pseudo"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold/50"
        />
        <button
          onClick={saveName}
          disabled={!dirty || savingName}
          className="tap-press inline-flex items-center gap-1.5 px-4 rounded-lg bg-gold hover:bg-glow disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          {savingName ? <Loader2 size={14} className="animate-spin" /> : nameSaved ? <Check size={14} /> : null}
          {nameSaved ? "Enregistré" : "Enregistrer"}
        </button>
      </div>
      {username && (
        <p className="text-xs text-ink-faint mt-2">
          Ton identifiant <span className="text-ink-muted">@{username}</span> reste inchangé — c'est lui qui sert aux
          liens de profil et à la recherche d'amis.
        </p>
      )}

      {error && <p className="text-sm text-riseNeg mt-3">{error}</p>}
    </div>
  );
}
