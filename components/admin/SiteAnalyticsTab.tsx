"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Minus, Search, RefreshCcw } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Avatar, Btn, Chip, Empty, Input, Panel, rel } from "@/components/admin/ui";
import { AudienceTab } from "@/components/AdminDashboard";

/*
 * Analytics — tout ce qui se passe sur le site, sur la période que tu choisis :
 * trafic (visites, visiteurs, pages, sources, pays, appareils, heures), jeu (parties, thèmes,
 * modes, joueurs), communauté (inscriptions, partages), et le journal de ce que font les
 * joueurs. Chaque chiffre est comparé à la période précédente de même longueur.
 */
type Series = { day: string; visits: number; visitors: number; games: number; signups: number };
type Row = { label: string; value: number };
type Totals = { pageviews: number; visitors: number; games: number; players: number; signups: number; activeUsers: number; avgPoints: number; shares: number; instagram: number; starts: number; ends: number; completion: number | null };
type Data = { from: string; to: string; current: { totals: Totals; days: Series[]; pages: Row[]; landing: Row[]; sources: Row[]; countries: Row[]; cities: Row[]; devices: Row[]; browsers: Row[]; oses: Row[]; hours: number[]; weekdays: number[]; themes: Row[]; modes: Row[]; eventTypes: Row[]; gameStartModes: Row[]; truncated: boolean }; previous: { totals: Totals } };

const EVENT_LABEL: Record<string, string> = { page_view: "Page vue", game_start: "Partie lancée", game_end: "Partie terminée", share: "Partage", click_instagram: "Clic Instagram", heartbeat: "Présence" };

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function presetRange(id: string): { from: string; to: string } {
  const today = new Date(new Date().setUTCHours(0, 0, 0, 0));
  const back = (n: number) => iso(new Date(today.getTime() - n * 86_400_000));
  if (id === "today") return { from: iso(today), to: iso(today) };
  if (id === "7") return { from: back(6), to: iso(today) };
  if (id === "28") return { from: back(27), to: iso(today) };
  if (id === "90") return { from: back(89), to: iso(today) };
  if (id === "month") return { from: iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))), to: iso(today) };
  if (id === "lastmonth") { const s = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)); const e = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)); return { from: iso(s), to: iso(e) }; }
  if (id === "year") return { from: iso(new Date(Date.UTC(today.getUTCFullYear(), 0, 1))), to: iso(today) };
  return { from: back(27), to: iso(today) };
}
const PRESETS = [
  { id: "today", label: "Aujourd'hui" }, { id: "7", label: "7 jours" }, { id: "28", label: "28 jours" }, { id: "90", label: "90 jours" },
  { id: "month", label: "Ce mois" }, { id: "lastmonth", label: "Mois dernier" }, { id: "year", label: "Cette année" },
];

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev && !cur) return <span className="text-[11px] text-ink-faint inline-flex items-center gap-0.5"><Minus size={11} /> —</span>;
  if (!prev) return <span className="text-[11px] text-emerald-400 inline-flex items-center gap-0.5"><ArrowUpRight size={11} /> nouveau</span>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  const up = pct > 0, flat = pct === 0;
  return <span className={`text-[11px] inline-flex items-center gap-0.5 ${flat ? "text-ink-faint" : up ? "text-emerald-400" : "text-riseNeg"}`}>{flat ? <Minus size={11} /> : up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />} {Math.abs(pct)} % <span className="text-ink-faint">vs période préc.</span></span>;
}
function Kpi({ label, cur, prev, suffix = "" }: { label: string; cur: number; prev: number; suffix?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="font-display text-3xl font-bold mt-1">{cur.toLocaleString("fr-FR")}{suffix}</p>
      <Delta cur={cur} prev={prev} />
    </div>
  );
}
function Bars({ rows, suffix = "" }: { rows: Row[]; suffix?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;
  if (!rows.length) return <p className="text-xs text-ink-faint">Pas de données sur la période.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-xs">
          <span className="w-36 truncate shrink-0" title={r.label}>{r.label}</span>
          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-gold/70 rounded-full" style={{ width: `${(r.value / max) * 100}%` }} /></div>
          <span className="w-14 text-right text-ink-muted shrink-0">{r.value.toLocaleString("fr-FR")}{suffix}</span>
          <span className="w-10 text-right text-ink-faint shrink-0">{Math.round((r.value / total) * 100)} %</span>
        </div>
      ))}
    </div>
  );
}
function LineChart({ days, keys }: { days: Series[]; keys: { k: keyof Series; label: string; color: string }[] }) {
  const W = 720, H = 180, P = 24;
  const max = Math.max(1, ...days.flatMap((d) => keys.map((k) => Number(d[k.k]))));
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, days.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  return (
    <div>
      <div className="flex gap-4 mb-2 text-[11px]">{keys.map((k) => <span key={k.k} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: k.color }} /> {k.label}</span>)}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44" role="img" aria-label="Évolution sur la période">
        {[0, 0.5, 1].map((t) => <line key={t} x1={P} x2={W - P} y1={y(max * t)} y2={y(max * t)} stroke="rgba(255,255,255,0.08)" />)}
        {[0, 0.5, 1].map((t) => <text key={t} x={4} y={y(max * t) + 4} fontSize="10" fill="rgba(255,255,255,0.4)">{Math.round(max * t)}</text>)}
        {keys.map((k) => (
          <polyline key={k.k} fill="none" stroke={k.color} strokeWidth="2" strokeLinejoin="round" points={days.map((d, i) => `${x(i)},${y(Number(d[k.k]))}`).join(" ")} />
        ))}
        {days.length <= 31 && days.map((d, i) => <text key={d.day} x={x(i)} y={H - 6} fontSize="9" textAnchor="middle" fill="rgba(255,255,255,0.4)">{d.day.slice(8)}</text>)}
      </svg>
    </div>
  );
}
function Heat({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-1 h-24">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${labels[i]} : ${v}`}>
          <div className="w-full rounded-t bg-gold/70" style={{ height: `${Math.max(2, (v / max) * 100)}%` }} />
          <span className="text-[9px] text-ink-faint truncate w-full text-center">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export default function SiteAnalyticsTab() {
  const [preset, setPreset] = useState("28");
  const [range, setRange] = useState(presetRange("28"));
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"site" | "google">("site");

  const load = useCallback(() => {
    setLoading(true); setError(null);
    fetch(`/api/admin/analytics/site?from=${range.from}&to=${range.to}`).then((r) => r.json()).then((d) => (d.error ? setError(d.error) : setData(d))).catch(() => setError("Chargement impossible.")).finally(() => setLoading(false));
  }, [range]);
  useEffect(load, [load]);

  const c = data?.current, p = data?.previous.totals;
  const dayLabels = useMemo(() => ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"], []);

  return (
    <div className="space-y-5">
      {/* Période */}
      <div className="card p-3.5 flex flex-wrap items-center gap-2">
        {PRESETS.map((pr) => <Chip key={pr.id} on={preset === pr.id} onClick={() => { setPreset(pr.id); setRange(presetRange(pr.id)); }}>{pr.label}</Chip>)}
        <span className="flex items-center gap-1.5 ml-auto text-xs">
          <input type="date" value={range.from} max={range.to} onChange={(e) => { setPreset("custom"); setRange({ ...range, from: e.target.value }); }} className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs" />
          <span className="text-ink-faint">→</span>
          <input type="date" value={range.to} min={range.from} onChange={(e) => { setPreset("custom"); setRange({ ...range, to: e.target.value }); }} className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs" />
          <Btn small onClick={load} title="Rafraîchir"><RefreshCcw size={12} /></Btn>
        </span>
        <div className="w-full flex gap-1.5 pt-1">
          <Chip on={view === "site"} onClick={() => setView("site")}>Données du site</Chip>
          <Chip on={view === "google"} onClick={() => setView("google")}>Google (GA4 · Search Console)</Chip>
        </div>
      </div>

      {view === "google" ? <AudienceTab /> : error ? <div className="card p-4 text-sm text-riseNeg">{error}</div> : !c || !p ? <Empty>{loading ? "Calcul en cours…" : "Pas de données."}</Empty> : (
        <>
          {c.truncated && <div className="card p-3 text-xs text-gold">Période très chargée : les 100 000 premières visites sont comptées — réduis la période pour des chiffres exacts.</div>}

          {/* KPIs */}
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Trafic</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Pages vues" cur={c.totals.pageviews} prev={p.pageviews} />
            <Kpi label="Visiteurs" cur={c.totals.visitors} prev={p.visitors} />
            <Kpi label="Inscriptions" cur={c.totals.signups} prev={p.signups} />
            <Kpi label="Joueurs actifs (connectés)" cur={c.totals.activeUsers} prev={p.activeUsers} />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Jeu</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Parties" cur={c.totals.games} prev={p.games} />
            <Kpi label="Joueurs distincts" cur={c.totals.players} prev={p.players} />
            <Kpi label="Points moyens / partie" cur={c.totals.avgPoints} prev={p.avgPoints} />
            <Kpi label="Parties finies / lancées" cur={c.totals.completion ?? 0} prev={p.completion ?? 0} suffix=" %" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">Communauté</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Partages" cur={c.totals.shares} prev={p.shares} />
            <Kpi label="Clics Instagram" cur={c.totals.instagram} prev={p.instagram} />
            <Kpi label="Parties lancées (connectés)" cur={c.totals.starts} prev={p.starts} />
            <Kpi label="Parties terminées (connectés)" cur={c.totals.ends} prev={p.ends} />
          </div>

          <Panel title={`Évolution — du ${new Date(data!.from).toLocaleDateString("fr-FR")} au ${new Date(data!.to).toLocaleDateString("fr-FR")}`}>
            <LineChart days={c.days} keys={[{ k: "visits", label: "Pages vues", color: "#f0001c" }, { k: "visitors", label: "Visiteurs", color: "#ff8a3b" }, { k: "games", label: "Parties", color: "#ffffff" }, { k: "signups", label: "Inscriptions", color: "#22c55e" }]} />
          </Panel>

          <div className="grid lg:grid-cols-2 gap-5">
            <Panel title="Pages les plus vues"><Bars rows={c.pages} /></Panel>
            <Panel title="Pages d'entrée (première page vue)"><Bars rows={c.landing} /></Panel>
            <Panel title="Sources de trafic"><Bars rows={c.sources} /></Panel>
            <Panel title="Pays"><Bars rows={c.countries} /></Panel>
            <Panel title="Villes"><Bars rows={c.cities} /></Panel>
            <Panel title="Appareils · Systèmes · Navigateurs">
              <div className="space-y-4"><Bars rows={c.devices} /><Bars rows={c.oses} /><Bars rows={c.browsers} /></div>
            </Panel>
            <Panel title="Heures de visite (heure de Paris)"><Heat values={c.hours} labels={c.hours.map((_, i) => `${i}h`)} /></Panel>
            <Panel title="Jours de la semaine"><Heat values={c.weekdays} labels={dayLabels} /></Panel>
            <Panel title="Thèmes les plus joués"><Bars rows={c.themes} /></Panel>
            <Panel title="Modes de jeu"><div className="space-y-4"><Bars rows={c.modes} /><p className="text-[11px] text-ink-faint">Parties lancées par mode (connectés) :</p><Bars rows={c.gameStartModes} /></div></Panel>
            <Panel title="Actions des joueurs connectés"><Bars rows={c.eventTypes.map((r) => ({ ...r, label: EVENT_LABEL[r.label] ?? r.label }))} /></Panel>
          </div>

          <ActivityJournal from={range.from} to={range.to} />
        </>
      )}
    </div>
  );
}

type Ev = { id: string; user_id: string; event_type: string; path: string | null; meta: Record<string, unknown> | null; created_at: string; profile: { display_name: string | null; username: string | null; avatar_url: string | null; verified?: boolean } | null };
const TYPES = ["", "page_view", "game_start", "game_end", "share", "click_instagram"];

function describe(e: Ev) {
  const m = e.meta ?? {};
  if (e.event_type === "game_start") return `a lancé une partie ${m.mode ? `(${m.mode}` : ""}${m.theme ? ` · ${m.theme}` : ""}${m.mode ? ")" : ""}`;
  if (e.event_type === "game_end") return `a terminé une partie${typeof m.points === "number" ? ` — ${m.points} pts` : ""}${m.theme ? ` · ${m.theme}` : ""}`;
  if (e.event_type === "share") return `a partagé${m.method ? ` (${m.method})` : ""}`;
  if (e.event_type === "click_instagram") return "a cliqué vers Instagram";
  if (e.event_type === "page_view") return `a ouvert ${e.path ?? "une page"}`;
  return e.event_type;
}

function ActivityJournal({ from, to }: { from: string; to: string }) {
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Ev[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/admin/analytics/activity?type=${type}&q=${encodeURIComponent(q)}&from=${from}&to=${to}&limit=200`).then((r) => r.json()).then((d) => setItems(d.items ?? [])).catch(() => setItems([]));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [type, q, from, to]);
  return (
    <Panel title="Journal d'activité des joueurs" action={<span className="text-[11px] text-ink-faint">200 derniers événements de la période</span>}>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {TYPES.map((t) => <Chip key={t} on={type === t} onClick={() => setType(t)}>{t ? EVENT_LABEL[t] ?? t : "Tout"}</Chip>)}
        <span className="relative ml-auto w-56">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Un joueur…" className="!pl-8 !py-1.5 !text-xs !rounded-full" />
        </span>
      </div>
      {!items ? <p className="text-xs text-ink-faint">Chargement…</p> : items.length === 0 ? <p className="text-xs text-ink-faint">Rien sur cette période.</p> : (
        <ul className="divide-y divide-white/5 max-h-[520px] overflow-y-auto -mx-5 px-5" data-lenis-prevent>
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
              <Avatar url={e.profile?.avatar_url} name={e.profile?.display_name ?? "?"} size={28} />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold inline-flex items-center gap-1">{e.profile?.display_name ?? "Joueur"}{e.profile?.verified && <VerifiedBadge size={12} />}</span>{" "}
                <span className="text-ink-muted">{describe(e)}</span>
              </span>
              <span className="text-[11px] text-ink-faint shrink-0" title={new Date(e.created_at).toLocaleString("fr-FR")}>{rel(e.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
