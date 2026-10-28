"use client";

import { useEffect, useState } from "react";
import { Gift, Dice5 } from "lucide-react";
import { REFERRAL_CONTEST } from "@/lib/referral";

type Referrer = { id: string; name: string; email: string; code: string | null; count: number; referred: { name: string; at: string }[] };

// Onglet Parrainage : qui a parrainé qui, et un tirage au sort pondéré (1 filleul = 1 chance).
export default function AdminReferralsTab() {
  const [data, setData] = useState<{ total: number; referrers: Referrer[] } | null>(null);
  const [winner, setWinner] = useState<Referrer | null>(null);
  useEffect(() => {
    fetch("/api/admin/referrals", { cache: "no-store" }).then((r) => r.json()).then(setData).catch(() => {});
  }, []);
  function draw() {
    if (!data) return;
    const pool = data.referrers.flatMap((r) => Array.from({ length: r.count }, () => r));
    if (!pool.length) return;
    setWinner(pool[Math.floor(Math.random() * pool.length)]);
  }
  return (
    <div className="space-y-5">
      <div className="ticket p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-2xl bg-gold/15 text-gold grid place-items-center"><Gift size={22} /></span>
        <div className="flex-1">
          <p className="font-display text-lg font-bold">{REFERRAL_CONTEST.title}</p>
          <p className="text-xs text-ink-faint">{data ? `${data.total} filleul(s) · ${data.referrers.length} parrain(s)` : "Chargement…"}</p>
        </div>
        <button type="button" onClick={draw} disabled={!data || !data.total} className="sticker sticker-sm"><Dice5 size={16} /> Tirer au sort</button>
      </div>
      {winner && (
        <div className="ticket p-5 border-gold/50">
          <p className="stage-kicker mb-1">Gagnant tiré (pondéré par le nombre de filleuls)</p>
          <p className="font-display text-2xl font-extrabold">{winner.name}</p>
          <p className="text-sm text-ink-muted">{winner.email || "e-mail inconnu"} · {winner.count} chance(s) · code {winner.code}</p>
          <p className="text-xs text-ink-faint mt-2">Vérifie les filleuls (doublons, comptes jetables) avant d&apos;annoncer. Relance le tirage si besoin.</p>
        </div>
      )}
      <div className="ticket divide-y divide-white/6">
        {(data?.referrers ?? []).map((r) => (
          <details key={r.id} className="group">
            <summary className="cursor-pointer list-none flex items-center gap-3 px-5 py-3">
              <span className="flex-1 min-w-0"><span className="block text-sm font-semibold truncate">{r.name}</span><span className="block text-xs text-ink-faint truncate">{r.email} · code {r.code}</span></span>
              <span className="score-num text-lg text-gold">{r.count}</span>
            </summary>
            <ul className="px-5 pb-3 text-xs text-ink-muted space-y-0.5">
              {r.referred.map((f, i) => <li key={i}>• {f.name} — {new Date(f.at).toLocaleString("fr-FR")}</li>)}
            </ul>
          </details>
        ))}
        {data && data.referrers.length === 0 && <p className="p-6 text-sm text-ink-faint text-center">Aucun parrainage pour l&apos;instant.</p>}
      </div>
    </div>
  );
}
