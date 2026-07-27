"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";

export default function AuthButton({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
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

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
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
      <button
        onClick={signIn}
        className={`bg-gold text-white rounded-full text-xs font-medium hover:bg-glow transition-colors ${
          variant === "mobile" ? "w-full py-3 text-sm" : "px-4 py-1.5"
        }`}
      >
        Se connecter
      </button>
    );
  }

  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Joueur";
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  // Sur mobile, on n'utilise jamais de popover flottant : le tiroir de menu a un
  // overflow-y-auto (pour pouvoir scroller son contenu), et tout élément overflow ainsi
  // écrète aussi l'axe horizontal — un menu "absolute" au-dessus de l'avatar se
  // retrouvait donc coupé / mal positionné à gauche, hors de portée du doigt. Ici, le
  // compte et le bouton de déconnexion sont toujours visibles en ligne, pleine largeur.
  if (variant === "mobile") {
    return (
      <div className="w-full flex items-center gap-3">
        {avatar ? (
          <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" />
        ) : (
          <div className="w-9 h-9 shrink-0 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs font-medium">
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <p className="text-sm text-ink-muted truncate flex-1">{name}</p>
        <button
          onClick={signOut}
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-riseNeg/10 text-riseNeg hover:bg-riseNeg/20 transition-colors"
        >
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>
    );
  }

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
