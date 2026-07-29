"use client";

import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { oauthCallbackUrl } from "@/lib/authRedirect";
import EmailAuthForm from "@/components/EmailAuthForm";

// CTA de connexion — flow OAuth Google (qui préserve la page courante, query comprise,
// via ?next= sur le callback) + connexion/inscription classique par e-mail pour celles
// et ceux qui n'ont pas de compte Google.
export default function SignInCta({ label = "Se connecter avec Google" }: { label?: string }) {
  const supabase = createClient();

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: oauthCallbackUrl() },
    });
  }

  return (
    <div>
      <button
        onClick={signIn}
        className="press btn-primary w-full flex items-center justify-center gap-2.5 rounded-2xl py-3.5 font-bold text-sm text-white"
      >
        <LogIn size={16} />
        {label}
      </button>

      <div className="flex items-center gap-3 my-5" aria-hidden="true">
        <span className="flex-1 h-px bg-white/10" />
        <span className="text-[11px] font-mono uppercase tracking-wide text-ink-faint">ou avec un e-mail</span>
        <span className="flex-1 h-px bg-white/10" />
      </div>

      <EmailAuthForm />
    </div>
  );
}
