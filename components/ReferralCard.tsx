"use client";

import { useEffect, useState } from "react";
import { Gift, Share2, Copy, Check, Ticket, LogIn } from "lucide-react";
import { useUser } from "@/lib/useUser";
import { REFERRAL_CONTEST, referralLink } from "@/lib/referral";
import { shareOrCopy } from "@/lib/share";
import SignInCta from "@/components/SignInCta";

/*
 * Carte de parrainage — même composant sur /parrainage (complet) et dans le profil / l'accueil
 * (compact). Connecté : code, lien, nombre de filleuls, partage. Sinon : le lot + connexion.
 */
export default function ReferralCard({ compact = false }: { compact?: boolean }) {
  const { user, loading } = useUser();
  const [data, setData] = useState<{ code: string; count: number; referred: { name: string; at: string }[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/referral/me", { cache: "no-store" }).then((r) => r.json()).then((d) => d.code && setData(d)).catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const link = data ? referralLink(data.code) : null;
  async function share() {
    if (!link) return;
    const r = await shareOrCopy({ title: "Blind test rap FR — DailyRapFrance", text: `Viens jouer au blind test rap FR avec moi 🎤 Crée ton compte avec mon lien, on tente les 2 places pour ${REFERRAL_CONTEST.short} :\n${link}`, url: link });
    if (r === "copied") { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }
  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  return (
    <section className="referral-card p-5 sm:p-6" aria-labelledby="ref-title">
      <div className="relative">
        <div className="flex items-start gap-3">
          <span className="w-12 h-12 rounded-2xl bg-white/15 text-white grid place-items-center shrink-0"><Gift size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Parrainage · à gagner</p>
            <h2 id="ref-title" className="font-display text-xl sm:text-2xl font-extrabold leading-tight text-white">{REFERRAL_CONTEST.title}</h2>
            <p className="text-xs text-white/80 mt-0.5">{REFERRAL_CONTEST.date} · {REFERRAL_CONTEST.rule}</p>
          </div>
        </div>

        {loading ? null : user && data ? (
          <div className="mt-4">
            <div className="flex items-center gap-2 rounded-xl bg-black/30 border border-white/15 p-2 pl-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] text-white/70">Ton code</span>
                <span className="block font-mono text-lg font-bold text-white tracking-widest">{data.code}</span>
              </span>
              <button type="button" onClick={copy} className="h-10 px-3 rounded-lg bg-white/10 text-white text-xs font-semibold inline-flex items-center gap-1.5">{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copié" : "Copier le lien"}</button>
              <button type="button" onClick={share} className="h-10 px-3.5 rounded-lg bg-white text-[#8a0010] text-xs font-bold inline-flex items-center gap-1.5"><Share2 size={14} /> Partager</button>
            </div>
            <div className="flex items-center gap-3 mt-3 text-sm text-white">
              <span className="inline-flex items-center gap-1.5 font-bold"><Ticket size={16} /> {data.count} chance{data.count > 1 ? "s" : ""} au tirage</span>
              <span className="text-white/70 text-xs">= {data.count} ami{data.count > 1 ? "s" : ""} inscrit{data.count > 1 ? "s" : ""} avec ton lien</span>
            </div>
            {!compact && data.referred.length > 0 && (
              <ul className="mt-3 text-xs text-white/80 space-y-1">
                {data.referred.map((r, i) => <li key={i}>✓ {r.name} — {new Date(r.at).toLocaleDateString("fr-FR")}</li>)}
              </ul>
            )}
            {!compact && <p className="text-[11px] text-white/60 mt-3">{REFERRAL_CONTEST.drawLabel}. Un filleul = un compte créé avec ton lien (sur le même appareil, dans les 48 h). Tentatives multiples d'une même personne non comptées.</p>}
          </div>
        ) : (
          <div className="mt-4">
            {showLogin && !user ? (
              <div className="rounded-xl bg-black/30 border border-white/15 p-4"><SignInCta label="Continuer avec Google" /></div>
            ) : (
              <button type="button" onClick={() => setShowLogin(true)} className="h-12 px-5 rounded-full bg-white text-[#8a0010] text-sm font-bold inline-flex items-center gap-2"><LogIn size={16} /> Obtenir mon lien de parrainage</button>
            )}
            <p className="text-[11px] text-white/70 mt-2">Compte gratuit, 10 secondes. Ton lien est prêt tout de suite.</p>
          </div>
        )}
      </div>
    </section>
  );
}
