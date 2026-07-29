"use client";

import { useState } from "react";
import { Mail, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { oauthCallbackUrl } from "@/lib/authRedirect";

/*
 * Connexion / inscription classique par e-mail + mot de passe — pour celles et ceux qui
 * n'ont pas (ou ne veulent pas utiliser) de compte Google.
 *
 * - La connexion pose la session côté client : onAuthStateChange (useUser) met à jour
 *   l'écran immédiatement, SANS navigation — l'URL actuelle (ex. /blindtest?room=CODE
 *   venue d'un QR ou d'un lien d'invitation) est donc naturellement conservée.
 * - L'inscription passe emailRedirectTo = le callback avec ?next= vers la page actuelle :
 *   si la confirmation d'e-mail est activée côté Supabase, le clic dans le mail ramène
 *   pile où la personne était (le salon à rejoindre, pas l'accueil).
 */
export default function EmailAuthForm() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function frenchError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect.";
    if (m.includes("already registered")) return "Un compte existe déjà avec cet e-mail — connecte-toi.";
    if (m.includes("password should be at least")) return "Mot de passe trop court (6 caractères minimum).";
    if (m.includes("valid email")) return "Adresse e-mail invalide.";
    if (m.includes("email not confirmed")) return "Confirme d'abord ton e-mail (regarde ta boîte de réception).";
    if (m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives — réessaie dans quelques minutes.";
    return "Une erreur est survenue. Réessaie.";
  }

  async function submit() {
    if (busy) return;
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError("Renseigne ton e-mail et ton mot de passe.");
      return;
    }
    if (tab === "signup" && pseudo.trim().length < 2) {
      setError("Choisis un pseudo (2 caractères minimum).");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError(frenchError(error.message));
        // Succès : la session est posée localement, onAuthStateChange rafraîchit l'UI
        // sur place — pas de redirection, l'URL (et donc le salon) est conservée.
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: oauthCallbackUrl(),
            data: { full_name: pseudo.trim(), name: pseudo.trim() },
          },
        });
        if (error) {
          setError(frenchError(error.message));
        } else if (data.session) {
          // Confirmation d'e-mail désactivée côté Supabase : session immédiate, rien à faire.
        } else {
          setNotice("Compte créé ! Vérifie ta boîte mail et clique sur le lien de confirmation — il te ramènera exactement ici.");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-left">
      {/* Onglets Connexion / Inscription */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 mb-4">
        {([
          { id: "login" as const, label: "Connexion" },
          { id: "signup" as const, label: "Inscription" },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setError(null);
              setNotice(null);
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
              tab === t.id ? "bg-gold text-white" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {tab === "signup" && (
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Pseudo (affiché en partie)"
            autoComplete="nickname"
            maxLength={24}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold/50 min-h-[44px]"
          />
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Adresse e-mail"
          autoComplete="email"
          inputMode="email"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold/50 min-h-[44px]"
        />
        <div className="relative">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            placeholder={tab === "signup" ? "Mot de passe (6 caractères min.)" : "Mot de passe"}
            autoComplete={tab === "signup" ? "new-password" : "current-password"}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 pr-11 text-sm focus:outline-none focus:border-gold/50 min-h-[44px]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-ink-faint hover:text-ink transition-colors"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-riseNeg mt-2.5">{error}</p>}
      {notice && <p className="text-xs text-gold mt-2.5 leading-relaxed">{notice}</p>}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="mt-3.5 w-full bg-white/8 hover:bg-white/12 disabled:opacity-50 border border-white/10 text-ink rounded-full py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
      >
        <Mail size={14} />
        {busy ? "Un instant..." : tab === "login" ? "Se connecter" : "Créer mon compte"}
      </button>
    </div>
  );
}
