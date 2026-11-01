"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift, Dice5, Download, Search, AlertTriangle, MousePointerClick, Share2, UserPlus, Gamepad2 } from "lucide-react";
import { REFERRAL_CONTEST } from "@/lib/referral";
import { Panel, Kpi, Chip, Btn, Input, Empty, Avatar } from "@/components/admin/ui";

type Filleul = { id: string; name: string; email: string; at: string; source: string | null; games: number; suspect: boolean };
type Referrer = {
  id: string; name: string; username: string | null; email: string; code: string | null; avatar: string | null;
  clicks: number; uniqueClicks: number; shares: number; count: number; played: number; conversion: number | null;
  lastClickAt: string | null; lastSignupAt: string | null; suspects: number; referred: Filleul[];
};
type Data = {
  funnel: { withCode: number; sharers: number; shares: number; clicks: number; uniqueClicks: number; signups: number; played: number; suspects: number };
  bySource: Record<string, number>;
  days: { day: string; clicks: number; signups: number }[];
  total: number;
  referrers: Referrer[];
};

const SOURCE_LABEL: Record<string, string> = { cookie: "lien → Google", url: "lien (URL)", local: "lien (navigateur)", manual: "code saisi", inconnu: "ancien" };

function rel(iso: string | null): string {
  if (!iso) return "—";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} j`;
}

/*
 * Onglet Parrainage — le suivi réel : qui a partagé, combien de clics, combien d'inscrits,
 * combien ont joué, d'où vient chaque rattachement, les cas suspects ; tri, recherche,
 * export CSV et tirage au sort pondéré (1 filleul = 1 chance).
 */
export default function AdminReferralsTab() {
  const [data, setData] = useState<Data | null>(null);
  const [winner, setWinner] = useState<Referrer | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "signups" | "active" | "suspect">("all");
  const [sort, setSort] = useState<"count" | "clicks" | "conversion" | "recent">("count");

  useEffect(() => {
    fetch("/api/admin/referrals", { cache: "no-store" }).then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    let list = data.referrers.filter((r) => {
      if (filter === "signups" && r.count === 0) return false;
      if (filter === "active" && r.shares === 0 && r.clicks === 0) return false;
      if (filter === "suspect" && r.suspects === 0) return false;
      if (!needle) return true;
      return [r.name, r.username ?? "", r.email, r.code ?? ""].some((x) => x.toLowerCase().includes(needle)) || r.referred.some((f) => f.name.toLowerCase().includes(needle) || f.email.toLowerCase().includes(needle));
    });
    list = [...list].sort((a, b) => {
      if (sort === "clicks") return b.uniqueClicks - a.uniqueClicks || b.count - a.count;
      if (sort === "conversion") return (b.conversion ?? -1) - (a.conversion ?? -1) || b.count - a.count;
      if (sort === "recent") return (b.lastSignupAt ?? b.lastClickAt ?? "") < (a.lastSignupAt ?? a.lastClickAt ?? "") ? -1 : 1;
      return b.count - a.count || b.uniqueClicks - a.uniqueClicks;
    });
    return list;
  }, [data, q, filter, sort]);

  function draw() {
    if (!data) return;
    const pool = data.referrers.flatMap((r) => Array.from({ length: Math.max(0, r.count - r.suspects) }, () => r));
    if (!pool.length) return;
    setWinner(pool[Math.floor(Math.random() * pool.length)]);
  }
  function exportCsv() {
    if (!data) return;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["parrain", "username", "email", "code", "clics", "clics_uniques", "partages", "filleuls", "filleuls_joueurs", "taux_%", "suspects", "dernier_clic", "dernier_filleul"];
    const lines = data.referrers.map((r) => [r.name, r.username, r.email, r.code, r.clicks, r.uniqueClicks, r.shares, r.count, r.played, r.conversion ?? "", r.suspects, r.lastClickAt ?? "", r.lastSignupAt ?? ""].map(esc).join(","));
    const detail = data.referrers.flatMap((r) => r.referred.map((f) => ["  ↳ " + f.name, "", f.email, r.code, "", "", "", "", f.games, "", f.suspect ? "oui" : "", f.at, SOURCE_LABEL[f.source ?? "inconnu"]].map(esc).join(",")));
    const blob = new Blob(["﻿" + [head.join(","), ...lines, "", ...detail].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `parrainage-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  const f = data?.funnel;
  const maxDay = data ? Math.max(1, ...data.days.map((d) => d.clicks)) : 1;

  return (
    <div className="space-y-5">
      <div className="ticket p-5 flex items-center gap-4 flex-wrap">
        <span className="w-12 h-12 rounded-2xl bg-gold/15 text-gold grid place-items-center"><Gift size={22} /></span>
        <div className="flex-1 min-w-[200px]">
          <p className="font-display text-lg font-bold">{REFERRAL_CONTEST.title}</p>
          <p className="text-xs text-ink-faint">{data ? `${data.total} filleul(s) · ${data.referrers.filter((r) => r.count > 0).length} parrain(s) avec au moins un filleul · ${f?.withCode ?? 0} comptes ont un lien` : "Chargement…"}</p>
        </div>
        <Btn onClick={exportCsv} disabled={!data}><Download size={14} /> CSV</Btn>
        <Btn onClick={draw} disabled={!data || !data.total} tone="primary"><Dice5 size={16} /> Tirer au sort</Btn>
      </div>

      {winner && (
        <div className="ticket p-5 border-gold/50">
          <p className="stage-kicker mb-1">Gagnant tiré (1 filleul = 1 chance, filleuls suspects exclus)</p>
          <p className="font-display text-2xl font-extrabold">{winner.name}</p>
          <p className="text-sm text-ink-muted">{winner.email || "e-mail inconnu"} · {winner.count} filleul(s) dont {winner.played} joueur(s) · code {winner.code}</p>
          <p className="text-xs text-ink-faint mt-2">Vérifie les filleuls (doublons, comptes jetables) avant d&apos;annoncer. Relance le tirage si besoin.</p>
        </div>
      )}

      {/* Funnel global */}
      {f && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Partages" value={f.shares} sub={`${f.sharers} parrain(s) ont diffusé leur lien`} />
          <Kpi label="Clics sur les liens" value={f.uniqueClicks} sub={`${f.clicks} au total · uniques par connexion`} />
          <Kpi label="Comptes créés" value={f.signups} sub={f.uniqueClicks ? `${Math.round((f.signups / f.uniqueClicks) * 100)} % des clics` : "—"} tone="good" />
          <Kpi label="Filleuls qui ont joué" value={f.played} sub={f.suspects ? `${f.suspects} suspect(s) à vérifier` : "aucun cas suspect"} tone={f.suspects ? "alert" : "neutral"} />
        </div>
      )}

      {data && (
        <div className="grid md:grid-cols-[2fr_1fr] gap-3">
          <Panel title="30 derniers jours — clics et inscriptions">
            <div className="flex items-end gap-[3px] h-24" aria-hidden="true">
              {data.days.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col justify-end gap-px h-full" title={`${new Date(d.day).toLocaleDateString("fr-FR")} · ${d.clicks} clic(s), ${d.signups} inscrit(s)`}>
                  {d.signups > 0 && <div className="w-full rounded-sm bg-gold" style={{ height: `${Math.max(12, (d.signups / maxDay) * 100)}%` }} />}
                  <div className="w-full rounded-sm bg-white/25" style={{ height: `${d.clicks ? Math.max(6, (d.clicks / maxDay) * 100) : 2}%` }} />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-ink-faint mt-2"><span className="inline-block w-2 h-2 rounded-sm bg-white/25 align-middle mr-1" /> clics <span className="inline-block w-2 h-2 rounded-sm bg-gold align-middle ml-3 mr-1" /> inscriptions</p>
          </Panel>
          <Panel title="D'où viennent les rattachements">
            <ul className="text-sm space-y-1.5">
              {Object.entries(data.bySource).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <li key={k} className="flex justify-between"><span className="text-ink-muted">{SOURCE_LABEL[k] ?? k}</span><span className="font-semibold tabular-nums">{v}</span></li>
              ))}
              {Object.keys(data.bySource).length === 0 && <li className="text-ink-faint text-xs">Aucun filleul pour l&apos;instant.</li>}
            </ul>
          </Panel>
        </div>
      )}

      {/* Liste des parrains */}
      <Panel
        title="Parrains"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, e-mail, code, filleul…" className="pl-8 w-56" /></div>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="answer-input h-9 text-xs">
              <option value="count">Tri : filleuls</option>
              <option value="clicks">Tri : clics</option>
              <option value="conversion">Tri : taux</option>
              <option value="recent">Tri : récent</option>
            </select>
          </div>
        }
      >
        <div className="flex gap-1.5 flex-wrap mb-3">
          <Chip on={filter === "all"} onClick={() => setFilter("all")}>Tous</Chip>
          <Chip on={filter === "active"} onClick={() => setFilter("active")}>Ont partagé / reçu des clics</Chip>
          <Chip on={filter === "signups"} onClick={() => setFilter("signups")}>Avec filleuls</Chip>
          <Chip on={filter === "suspect"} onClick={() => setFilter("suspect")}><AlertTriangle size={12} /> Suspects</Chip>
        </div>
        <div className="divide-y divide-white/6 -mx-2">
          {rows.map((r) => (
            <details key={r.id} className="group">
              <summary className="cursor-pointer list-none flex items-center gap-3 px-2 py-2.5 hover:bg-white/[0.03] rounded-lg">
                <Avatar url={r.avatar} name={r.name} size={32} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{r.name} {r.suspects > 0 && <AlertTriangle size={12} className="inline text-riseNeg ml-1" />}</span>
                  <span className="block text-[11px] text-ink-faint truncate">{r.email || "—"} · code {r.code ?? "—"} · dernier clic {rel(r.lastClickAt)}</span>
                </span>
                <span className="hidden sm:grid grid-cols-4 gap-4 text-right tabular-nums text-xs">
                  <span title="Partages"><Share2 size={11} className="inline mr-1 text-ink-faint" />{r.shares}</span>
                  <span title="Clics uniques (total)"><MousePointerClick size={11} className="inline mr-1 text-ink-faint" />{r.uniqueClicks}<span className="text-ink-faint">/{r.clicks}</span></span>
                  <span title="Filleuls qui ont joué"><Gamepad2 size={11} className="inline mr-1 text-ink-faint" />{r.played}</span>
                  <span title="Taux clics → inscrits" className="text-ink-faint">{r.conversion !== null ? `${r.conversion} %` : "—"}</span>
                </span>
                <span className="score-num text-lg text-gold w-10 text-right" title="Filleuls"><UserPlus size={12} className="inline mr-1 text-ink-faint" />{r.count}</span>
              </summary>
              <div className="px-2 pb-3 pl-12">
                {r.referred.length === 0 ? (
                  <p className="text-xs text-ink-faint">Aucun filleul — {r.shares} partage(s), {r.uniqueClicks} clic(s) unique(s).</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="text-ink-faint text-left"><tr><th className="font-medium py-1">Filleul</th><th className="font-medium">E-mail</th><th className="font-medium">Inscrit</th><th className="font-medium">Via</th><th className="font-medium text-right">Parties</th></tr></thead>
                    <tbody>
                      {r.referred.map((fl) => (
                        <tr key={fl.id} className={fl.suspect ? "text-riseNeg" : ""}>
                          <td className="py-1 pr-2"><a href={`/admin?s=users&q=${encodeURIComponent(fl.email || fl.name)}`} className="hover:text-gold">{fl.name}</a>{fl.suspect && <span title="Même connexion qu'un autre filleul de ce parrain"> ⚠︎</span>}</td>
                          <td className="pr-2 text-ink-muted truncate max-w-[180px]">{fl.email || "—"}</td>
                          <td className="pr-2 text-ink-muted whitespace-nowrap">{new Date(fl.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                          <td className="pr-2 text-ink-muted">{SOURCE_LABEL[fl.source ?? "inconnu"]}</td>
                          <td className="text-right tabular-nums">{fl.games}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </details>
          ))}
          {data && rows.length === 0 && <Empty>Aucun parrain ne correspond.</Empty>}
          {!data && <Empty>Chargement…</Empty>}
        </div>
      </Panel>
    </div>
  );
}
