"use client";

import { useState } from "react";
import { BadgeCheck, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";

/*
 * Bloc « Certification » de Mon compte : l'état (certifié / demande envoyée / rien), et un
 * bouton pour demander. L'admin valide depuis le tableau de bord ; le badge apparaît alors
 * à côté du pseudo partout.
 */
export default function VerificationRequest({ userId, verified, requestedAt }: { userId: string; verified: boolean; requestedAt: string | null }) {
  const supabase = createClient();
  const [requested, setRequested] = useState<string | null>(requestedAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request() {
    setBusy(true);
    setError(null);
    const now = new Date().toISOString();
    const { error } = await supabase.from("profiles").update({ verification_requested_at: now }).eq("id", userId);
    setBusy(false);
    if (error) setError("Impossible d'envoyer la demande. Réessaie.");
    else setRequested(now);
  }

  return (
    <div className="ticket p-5">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-xl bg-gold/15 grid place-items-center shrink-0"><VerifiedBadge size={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold leading-tight">Certification</p>
          {verified ? (
            <p className="text-sm text-ink-muted mt-1 inline-flex items-center gap-1.5"><Check size={14} className="text-gold" /> Ton compte est certifié — le badge apparaît à côté de ton pseudo.</p>
          ) : requested ? (
            <p className="text-sm text-ink-muted mt-1">Demande envoyée le {new Date(requested).toLocaleDateString("fr-FR")}. On te répond directement sur ton profil : si elle est acceptée, le badge apparaît tout seul.</p>
          ) : (
            <p className="text-sm text-ink-muted mt-1">Artiste, média, créateur ou joueur reconnu de la communauté ? Demande le badge, on vérifie et on l&apos;active.</p>
          )}
          {error && <p className="text-xs text-riseNeg mt-2">{error}</p>}
        </div>
      </div>
      {!verified && !requested && (
        <button type="button" onClick={request} disabled={busy} className="sticker sticker-ghost sticker-sm mt-4">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />} Demander la certification
        </button>
      )}
    </div>
  );
}
