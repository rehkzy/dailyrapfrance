"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";

/* Suppression du compte par la personne elle-même — double confirmation (mot à taper),
   puis retour à l'accueil déconnecté. */
export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: word.trim().toUpperCase() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error === "confirmation" ? "Tape exactement SUPPRIMER pour confirmer." : "Impossible pour l'instant, réessaie ou écris-nous."); setBusy(false); return; }
      try { localStorage.clear(); } catch {}
      window.location.href = "/?compte=supprime";
    } catch { setError("Impossible pour l'instant, réessaie ou écris-nous."); setBusy(false); }
  }

  return (
    <div className="ticket mt-4 p-5">
      <p className="text-xs font-semibold text-ink-faint mb-1 flex items-center gap-1.5"><Trash2 size={13} /> Supprimer mon compte</p>
      <p className="text-sm text-ink-muted">Efface ton profil, tes scores, tes amis, tes messages, tes blind tests et les informations reçues de Google. C&apos;est définitif.</p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="sticker sticker-ghost sticker-sm mt-3 text-riseNeg">Supprimer mon compte</button>
      ) : (
        <div className="mt-3 rounded-xl border border-riseNeg/40 bg-riseNeg/10 p-4">
          <p className="text-sm font-semibold inline-flex items-center gap-1.5 mb-2"><AlertTriangle size={14} className="text-riseNeg" /> Pour confirmer, tape <code className="font-mono">SUPPRIMER</code></p>
          <div className="flex gap-2">
            <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="SUPPRIMER" autoCapitalize="characters" className="answer-input flex-1 h-10 font-mono uppercase" aria-label="Confirmation" />
            <button type="button" onClick={confirm} disabled={busy || word.trim().toUpperCase() !== "SUPPRIMER"} className="h-10 px-4 rounded-lg bg-riseNeg text-white text-xs font-bold disabled:opacity-50">{busy ? "…" : "Supprimer"}</button>
            <button type="button" onClick={() => { setOpen(false); setWord(""); }} className="h-10 px-3 rounded-lg bg-white/8 text-xs font-semibold">Annuler</button>
          </div>
          {error && <p className="text-xs text-riseNeg mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
