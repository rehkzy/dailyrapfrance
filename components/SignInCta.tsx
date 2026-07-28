"use client";

import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// CTA de connexion — même flow OAuth Google que l'AuthButton du header, en version
// bouton principal pleine largeur pour les écrans "connecte-toi" (Amis, Compte).
export default function SignInCta({ label = "Se connecter avec Google" }: { label?: string }) {
  const supabase = createClient();

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <button
      onClick={signIn}
      className="press btn-primary w-full flex items-center justify-center gap-2.5 rounded-2xl py-3.5 font-bold text-sm text-white"
    >
      <LogIn size={16} />
      {label}
    </button>
  );
}
