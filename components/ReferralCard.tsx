"use client";

import { useEffect, useState } from "react";
import { Gift, Share2, Copy, Check, Ticket, LogIn, MousePointerClick, UserPlus, Gamepad2, KeyRound } from "lucide-react";
import { useUser } from "@/lib/useUser";
import { REFERRAL_CONTEST, referralLink } from "@/lib/referral";
import { shareOrCopy } from "@/lib/share";
import SignInCta from "@/components/SignInCta";
import HelpTip from "@/components/HelpTip";

/*
 * Carte de parrainage — même composant sur /parrainage (complet) et dans le profil / l'accueil
 * (compact). Connecté : code, lien, vrai suivi (clics, inscrits, taux, 14 derniers jours,
 * filleuls qui ont joué). Nouveau compte sans parrain : champ pour saisir le code d'un ami
 * (utile quand on s'est connecté avec Google sans passer par le lien).
 */
type Data = {
  code: string;
  count: number;
  referred: { name: string; avatar: string | null; at: string; played: boolean }[];
  clicks: number;
  uniqueClicks: number;
  lastClickAt: string | null;
  shares: number;
  conversion: number | null;
  days: { day: string; clicks: number; signups: number }[];
  sponsor: string | null;
  canEnterCode: boolean;
};

function relative(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
}

export default function ReferralCard({ compact = false }: { compact?: boolean }) {
  const { user, loading } = useUser();
  const [data, setData] = useState<Data | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeState, setCodeState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [codeMsg, setCodeMsg] = useState("");

  function load() {
    fetch("/api/referral/me", { cache: "no-store" }).then((r) => r.json()).then((d) => d.code && setData(d)).catch(() => {});
  }
  useEffect(() => {
    if (!user) return;
    load();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const link = data ? referralLink(data.code) : null;
  function logShare(channel: "share" | "copy") {
    fetch("/api/referral/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel }) }).catch(() => {});
    setData((d) => (d ? { ...d, shares: d.shares + 1 } : d));
  }
  async function share() {
    if (!link) return;
    const r = await shareOrCopy({ title: "Blind test rap FR — DailyRapFrance", text: `Viens jouer au blind test rap FR avec moi 🎤 Crée ton compte avec mon lien, on tente les 2 places pour ${REFERRAL_CONTEST.short} :\n${link}`, url: link });
    if (r === "copied") { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    if (r !== "none") logShare(r === "copied" ? "copy" : "share");
  }
  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); logShare("copy"); } catch {}
  }
  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (code.length < 4) return;
    setCodeState("busy");
    try {
      const r = await fetch("/api/referral/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, source: "manual" }) }).then((x) => x.json());
      if (r.ok) { setCodeState("ok"); setCodeMsg("C'est noté — ton ami a une chance de plus."); load(); }
      else {
        setCodeState("error");
        setCodeMsg(r.reason === "self" ? "C'est ton propre code 😉" : r.reason === "unknown_code" ? "Ce code n'existe pas." : r.reason === "too_old" ? "Ton compte est trop ancien pour ajouter un parrain." : "Impossible pour l'instant.");
      }
    } catch { setCodeState("error"); setCodeMsg("Impossible pour l'instant."); }
  }

  const maxDay = data ? Math.max(1, ...data.days.map((d) => d.clicks)) : 1;

  return (
    <section className="referral-card p-5 sm:p-6" aria-labelledby="ref-title">
      <div className="relative">
        <div className="flex items-start gap-3">
          <span className="w-12 h-12 rounded-2xl bg-white/15 text-white grid place-items-center shrink-0"><Gift size={22} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Parrainage · à gagner</p>
              {!compact && (
                <HelpTip title="Comment ça marche ?">
                  <ul>
                    <li><span>🔗</span><span>Un pote clique sur ton lien, puis crée son compte — même avec Google, on s'en souvient 30 jours.</span></li>
                    <li><span>🔑</span><span>Sinon, il peut saisir ton code dans la semaine qui suit son inscription.</span></li>
                    <li><span>🎟️</span><span>Chaque pote inscrit = 1 chance au tirage. Les doublons sont retirés avant.</span></li>
                    <li><span>📣</span><span>{REFERRAL_CONTEST.drawLabel}.</span></li>
                  </ul>
                </HelpTip>
              )}
            </div>
            <h2 id="ref-title" className="font-display text-xl sm:text-2xl font-extrabold leading-tight text-white">{REFERRAL_CONTEST.title}</h2>
            <p className="text-xs text-white/80 mt-0.5">{REFERRAL_CONTEST.date} · 1 pote inscrit avec ton lien = 1 chance au tirage</p>
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

            {/* Le vrai suivi : clics → inscrits → joueurs */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { Icon: MousePointerClick, v: data.uniqueClicks, l: "clics sur ton lien", sub: data.lastClickAt ? `dernier ${relative(data.lastClickAt)}` : "personne encore" },
                { Icon: UserPlus, v: data.count, l: data.count > 1 ? "amis inscrits" : "ami inscrit", sub: data.conversion !== null ? `${data.conversion} % des clics` : "—" },
                { Icon: Gamepad2, v: data.referred.filter((r) => r.played).length, l: "ont joué", sub: `${data.shares} partage${data.shares > 1 ? "s" : ""}` },
              ].map(({ Icon, v, l, sub }) => (
                <div key={l} className="rounded-xl bg-black/25 border border-white/10 p-3">
                  <Icon size={14} className="text-white/70" />
                  <p className="font-display text-2xl font-extrabold text-white leading-none mt-1.5 tabular-nums">{v}</p>
                  <p className="text-[11px] text-white/80 leading-tight mt-1">{l}</p>
                  <p className="text-[10px] text-white/55 leading-tight mt-0.5 truncate">{sub}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-3 text-sm text-white">
              <span className="inline-flex items-center gap-1.5 font-bold"><Ticket size={16} /> {data.count} chance{data.count > 1 ? "s" : ""} au tirage</span>
            </div>

            {!compact && (
              <div className="mt-4 rounded-xl bg-black/25 border border-white/10 p-3">
                <p className="text-[11px] text-white/70 mb-2">14 derniers jours — clics <span className="inline-block w-2 h-2 rounded-sm bg-white/50 align-middle mx-0.5" /> inscriptions <span className="inline-block w-2 h-2 rounded-sm bg-white align-middle mx-0.5" /></p>
                <div className="flex items-end gap-1 h-12" aria-hidden="true">
                  {data.days.map((d) => (
                    <div key={d.day} className="flex-1 flex flex-col justify-end gap-px h-full" title={`${new Date(d.day).toLocaleDateString("fr-FR")} · ${d.clicks} clic(s), ${d.signups} inscrit(s)`}>
                      {d.signups > 0 && <div className="w-full rounded-sm bg-white" style={{ height: `${Math.max(14, (d.signups / maxDay) * 100)}%` }} />}
                      <div className="w-full rounded-sm bg-white/50" style={{ height: `${d.clicks ? Math.max(8, (d.clicks / maxDay) * 100) : 3}%`, opacity: d.clicks ? 1 : 0.35 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!compact && data.referred.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {data.referred.map((r, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs text-white/85">
                    {r.avatar ? <img src={r.avatar} alt="" className="w-6 h-6 rounded-full object-cover" /> : <span className="w-6 h-6 rounded-full bg-white/20 grid place-items-center text-[10px] font-bold">{r.name.slice(0, 1).toUpperCase()}</span>}
                    <span className="flex-1 truncate">{r.name}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.played ? "bg-white text-[#8a0010]" : "bg-white/15 text-white/80"}`}>{r.played ? "a joué" : "inscrit"}</span>
                    <span className="text-white/55">{new Date(r.at).toLocaleDateString("fr-FR")}</span>
                  </li>
                ))}
              </ul>
            )}

            {data.sponsor && !compact && <p className="text-[11px] text-white/70 mt-3">Tu as été parrainé par <strong className="text-white">{data.sponsor}</strong>.</p>}

            {data.canEnterCode && (
              <form onSubmit={submitCode} className="mt-4 rounded-xl bg-black/25 border border-white/10 p-3">
                <p className="text-xs text-white/85 font-semibold inline-flex items-center gap-1.5"><KeyRound size={13} /> Un ami t'a parlé de DailyRap ?</p>
                <p className="text-[11px] text-white/65 mt-0.5">Entre son code pour qu'il ait sa chance au tirage — possible pendant 7 jours après ton inscription.</p>
                {codeState === "ok" ? (
                  <p className="text-xs text-white mt-2 inline-flex items-center gap-1.5"><Check size={13} /> {codeMsg}</p>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <input
                      value={codeInput}
                      onChange={(e) => { setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)); setCodeState("idle"); }}
                      placeholder="CODE AMI"
                      inputMode="text"
                      autoCapitalize="characters"
                      className="answer-input flex-1 h-10 font-mono tracking-widest uppercase"
                      aria-label="Code de parrainage d'un ami"
                    />
                    <button type="submit" disabled={codeState === "busy" || codeInput.length < 4} className="h-10 px-4 rounded-lg bg-white text-[#8a0010] text-xs font-bold disabled:opacity-50">Valider</button>
                  </div>
                )}
                {codeState === "error" && <p className="text-[11px] text-white mt-1.5">{codeMsg}</p>}
              </form>
            )}


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
