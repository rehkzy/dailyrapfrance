"use client";

import { useEffect, useState } from "react";
import { Flame, ExternalLink } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Btn, Empty, Kpi, Panel } from "@/components/admin/ui";

type Week = { offset: number; key: string; number: number; theme: string; label: string; participants: number | null };
type Data = { weeks: Week[]; current: Week & { attempts: number; top: { points: number; name: string; verified: boolean }[] } };

/* Défi de la semaine : qui joue, qui mène, et le calendrier des thèmes à venir (déterministe :
   on le voit à l'avance pour préparer la com'). */
export default function DefiTab() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetch("/api/admin/defi").then((r) => r.json()).then((d) => (d.error ? setError(d.error) : setData(d))).catch(() => setError("Chargement impossible.")); }, []);
  if (error) return <div className="card p-4 text-sm text-riseNeg">{error}</div>;
  if (!data) return <Empty>Chargement…</Empty>;
  const c = data.current;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Cette semaine" value={`#${c.number}`} sub={c.label} />
        <Kpi label="Participants" value={c.participants ?? 0} sub="joueurs connectés distincts" />
        <Kpi label="Tentatives" value={c.attempts} sub="parties jouées sur le défi" />
        <Kpi label="Meilleur score" value={c.top[0]?.points ?? 0} sub={c.top[0]?.name ?? "—"} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Classement de la semaine" action={<Btn small href="/blindtest/defi"><ExternalLink size={12} /> Page publique</Btn>}>
          {c.top.length === 0 ? <p className="text-sm text-ink-faint">Personne n&apos;a encore joué.</p> : (
            <ol className="space-y-2">
              {c.top.map((t, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm"><span className="w-5 text-ink-faint">{i + 1}</span><span className="flex-1 inline-flex items-center gap-1">{t.name}{t.verified && <VerifiedBadge size={13} />}</span><span className="font-bold text-gold">{t.points}</span></li>
              ))}
            </ol>
          )}
        </Panel>
        <Panel title="Calendrier des thèmes">
          <ul className="divide-y divide-white/6">
            {data.weeks.map((w) => (
              <li key={w.key} className={`flex items-center gap-3 py-2.5 text-sm ${w.offset === 0 ? "font-semibold" : w.offset < 0 ? "opacity-60" : ""}`}>
                <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${w.offset === 0 ? "bg-gold text-white" : "bg-white/6 text-ink-muted"}`}><Flame size={15} /></span>
                <span className="flex-1 min-w-0"><span className="block truncate">#{w.number} — {w.label}</span><span className="block text-[11px] text-ink-faint font-normal">semaine du {new Date(w.key).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}{w.offset === 0 ? " · en cours" : w.offset > 0 ? " · à venir" : ""}</span></span>
                {w.participants !== null && <span className="text-xs text-ink-faint">{w.participants} joueur{w.participants > 1 ? "s" : ""}</span>}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-ink-faint mt-3">Les thèmes sont tirés automatiquement (même ordre pour tout le monde) — tu peux préparer les posts à l&apos;avance.</p>
        </Panel>
      </div>
    </div>
  );
}
