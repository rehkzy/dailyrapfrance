"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function signIn(provider: "google" | "apple") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
  }

  if (loading) return <div className="w-9 h-9" aria-hidden="true" />;

  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="bg-gold text-white rounded-full px-4 py-1.5 text-xs font-medium hover:bg-glow transition-colors"
        >
          Se connecter
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 glass rounded-xl p-2 w-48 z-50">
            <button
              onClick={() => signIn("google")}
              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/8 transition-colors"
            >
              Continuer avec Google
            </button>
            <button
              onClick={() => signIn("apple")}
              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/8 transition-colors"
            >
              Continuer avec Apple
            </button>
          </div>
        )}
      </div>
    );
  }

  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Joueur";
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2" aria-label="Compte">
        {avatar ? (
          <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs font-medium">
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 glass rounded-xl p-2 w-48 z-50">
          <p className="text-sm px-3 py-2 text-ink-muted truncate">{name}</p>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 text-left text-sm px-3 py-2 rounded-lg hover:bg-white/8 transition-colors text-riseNeg"
          >
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
