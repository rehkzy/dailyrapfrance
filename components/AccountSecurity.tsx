"use client";

import { useState } from "react";
import { KeyRound, LogOut, Mail, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/*
 * Compte & sécurité — l'identifiant, le mot de passe (si connexion par e-mail), la
 * déconnexion. Connexion Google : le mot de passe se gère chez Google, on le dit.
 */
export default function AccountSecurity({ email, providers }: { email: string | null; providers: string[] }) {
  const supabase = createClient();
  const hasPassword = providers.includes("email");
  const hasGoogle = providers.includes("google");
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function changePassword() {
    if (pw.length < 8) return setMsg({ ok: false, t: "8 caractères minimum." });
    if (pw !== pw2) return setMsg({ ok: false, t: "Les deux mots de passe ne correspondent pas." });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ ok: false, t: error.message });
    setMsg({ ok: true, t: "Mot de passe mis à jour." });
    setPw(""); setPw2(""); setOpen(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="ticket divide-y divide-white/6">
      <div className="px-5 py-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-white/6 grid place-items-center text-ink-muted shrink-0"><Mail size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Identifiant</span>
          <span className="block text-xs text-ink-faint truncate">{email ?? "—"}</span>
        </span>
        {hasGoogle && <span className="text-[11px] font-semibold text-ink-faint">via Google</span>}
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-white/6 grid place-items-center text-ink-muted shrink-0"><KeyRound size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Mot de passe</span>
            <span className="block text-xs text-ink-faint">{hasPassword ? "Connexion par e-mail et mot de passe." : "Tu te connectes avec Google : ton mot de passe se gère dans ton compte Google."}</span>
          </span>
          {hasPassword && !open && <button type="button" onClick={() => { setOpen(true); setMsg(null); }} className="sticker sticker-ghost sticker-sm">Changer</button>}
        </div>
        {hasPassword && open && (
          <div className="mt-3 space-y-2">
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nouveau mot de passe" autoComplete="new-password" className="answer-input !min-h-[46px] !text-sm" />
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirme-le" autoComplete="new-password" className="answer-input !min-h-[46px] !text-sm" />
            <div className="flex gap-2">
              <button type="button" onClick={changePassword} disabled={busy} className="sticker sticker-sm">{busy ? "…" : "Enregistrer"}</button>
              <button type="button" onClick={() => setOpen(false)} className="sticker sticker-ghost sticker-sm">Annuler</button>
            </div>
          </div>
        )}
        {msg && <p className={`mt-2 text-xs inline-flex items-center gap-1 ${msg.ok ? "text-risePos" : "text-riseNeg"}`}>{msg.ok && <Check size={12} />}{msg.t}</p>}
      </div>

      <div className="px-5 py-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-white/6 grid place-items-center text-ink-muted shrink-0"><LogOut size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Se déconnecter</span>
          <span className="block text-xs text-ink-faint">Sur cet appareil seulement.</span>
        </span>
        <button type="button" onClick={signOut} className="sticker sticker-ghost sticker-sm">Déconnexion</button>
      </div>
    </div>
  );
}
