"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowLeft, Wallet, Star, Users, Disc3, BarChart3, Inbox, ChevronRight, RotateCcw, TrendingUp, TrendingDown, Minus, Radio, CalendarClock } from "lucide-react";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import { sfx } from "@/lib/sfx";

/*
 * ARTISTS MANAGER 2026 — "Football Manager du rap français", v2 UI.
 *
 * Interface refondue sur le gabarit FM des références fournies :
 *  - Barre du haut identité + date + CONTINUER (le bouton signature FM)
 *  - Rangée de KPI cards (Trésorerie / Réputation / Streams hebdo)
 *  - Dashboard en cartes titrées : Studio, Prochaine échéance, mini-classement avec
 *    flèches de mouvement, boîte de réception façon inbox FM
 *  - Cartes artistes façon "player card" (bandeau dégradé + stats en barres)
 *  - Classement complet avec position, ▲▼ vs semaine précédente, ton label surligné
 *
 * Simulation identique à la v1 (localStorage "drf-am26", score → blindtest_scores,
 * artistes 100% fictifs). Ajout : mémorisation de l'ordre du chart de la semaine
 * précédente pour afficher les mouvements.
 */

// ---------- Types ----------

type Artist = {
  id: string;
  name: string;
  style: string;
  flow: number;
  plume: number;
  charisme: number;
  hype: number;
  salary: number;
  signingFee: number;
};

type Project = {
  artistId: string;
  type: "single" | "ep" | "album";
  title: string;
  weeksLeft: number;
  quality: number;
  promo: number;
};

type Release = {
  id: string;
  artistId: string;
  artistName: string;
  title: string;
  type: Project["type"];
  quality: number;
  promo: number;
  weeklyStreams: number;
  totalStreams: number;
  weeksOut: number;
};

type Message = { id: string; week: number; title: string; body: string };
type Rival = { name: string; streams: number };

type GameState = {
  week: number;
  cash: number;
  reputation: number;
  roster: Artist[];
  market: Artist[];
  project: Project | null;
  releases: Release[];
  messages: Message[];
  rivals: Rival[];
  prevChartOrder: string[]; // clés du chart la semaine passée — pour les flèches ▲▼
  gameOver: null | "bankrupt" | "season_end";
  scoreSaved: boolean;
};

// ---------- Données ----------

const FIRST = ["Zeyko", "Diako", "Sirem", "Kaira", "Noxx", "Tismé", "Rakelm", "Melza", "Solda K", "Ylane", "Braska", "Numen", "Vexo", "Damsa", "Kliff", "Orya"];
const STYLES = ["Drill", "Mélo", "Boom bap", "Trap", "Cloud", "Afro"];
const RIVAL_NAMES = ["Wesko", "Lynka", "7ID", "Marzo", "Selva", "KMR", "Dosia", "Priam"];
const PROJECT_TITLES = ["Minuit", "Zone 7", "Éclipse", "Sans retour", "Or noir", "Antidote", "Mirage", "Balafre", "Horizon", "Vertige", "Cendres", "Apnée"];

const TYPE_META = {
  single: { label: "Single", weeks: 2, studioBase: 1 },
  ep: { label: "EP", weeks: 4, studioBase: 1.6 },
  album: { label: "Album", weeks: 7, studioBase: 2.4 },
} as const;

const BUDGET_PRESETS = {
  studio: [{ label: "Éco", v: 2000 }, { label: "Standard", v: 5000 }, { label: "Premium", v: 12000 }],
  clip: [{ label: "Aucun", v: 0 }, { label: "Street", v: 3000 }, { label: "Réalisateur", v: 10000 }],
  promo: [{ label: "Bouche à oreille", v: 1000 }, { label: "Playlists", v: 4000 }, { label: "Campagne", v: 10000 }],
} as const;

const START_CASH = 30000;
const SEASON_WEEKS = 52;
const SAVE_KEY = "drf-am26";

// ---------- Helpers ----------

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
const ri = (min: number, max: number) => Math.round(rnd(min, max));
const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

let uid = 0;
const nextId = () => `${Date.now().toString(36)}-${uid++}`;

function makeArtist(usedNames: Set<string>): Artist {
  const available = FIRST.filter((n) => !usedNames.has(n));
  const name = available[Math.floor(Math.random() * available.length)] ?? `MC ${ri(10, 99)}`;
  usedNames.add(name);
  const talent = rnd(0.35, 0.95);
  return {
    id: nextId(),
    name,
    style: STYLES[Math.floor(Math.random() * STYLES.length)],
    flow: ri(6 + talent * 8, 10 + talent * 10),
    plume: ri(6 + talent * 8, 10 + talent * 10),
    charisme: ri(5 + talent * 8, 10 + talent * 10),
    hype: ri(5, 30),
    salary: ri(250 + talent * 400, 400 + talent * 600),
    signingFee: ri(1500 + talent * 3000, 3000 + talent * 5000),
  };
}

function initialState(): GameState {
  const used = new Set<string>();
  return {
    week: 1,
    cash: START_CASH,
    reputation: 10,
    roster: [],
    market: [makeArtist(used), makeArtist(used), makeArtist(used)],
    project: null,
    releases: [],
    messages: [{
      id: nextId(), week: 1, title: "Bienvenue au label",
      body: `Tu démarres avec ${fmt(START_CASH)} €. Signe ton premier artiste, produis un projet, et fais grimper ta réputation. Faillite = fin de partie.`,
    }],
    rivals: RIVAL_NAMES.map((name) => ({ name, streams: ri(60000, 380000) })),
    prevChartOrder: [],
    gameOver: null,
    scoreSaved: false,
  };
}

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    // Compat sauvegardes v1 (champ ajouté en v2)
    if (!Array.isArray(s.prevChartOrder)) s.prevChartOrder = [];
    return s;
  } catch {
    return null;
  }
}

function persist(s: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    // stockage indisponible — la partie vivra en mémoire seulement
  }
}

// Clé unique d'une entrée du chart (rival = son nom, sortie = id de release)
type ChartEntry = { key: string; name: string; title: string | null; streams: number; mine: boolean };

function computeChart(s: GameState): ChartEntry[] {
  const entries: ChartEntry[] = [
    ...s.rivals.map((r) => ({ key: `rival:${r.name}`, name: r.name, title: null, streams: r.streams, mine: false })),
    ...s.releases.map((r) => ({ key: `rel:${r.id}`, name: r.artistName, title: r.title, streams: r.weeklyStreams, mine: true })),
  ];
  return entries.sort((a, b) => b.streams - a.streams).slice(0, 10);
}

// ---------- Simulation d'une semaine ----------

const EVENTS: { title: string; body: () => string; apply: (s: GameState) => void }[] = [
  {
    title: "Offre de concert",
    body: () => "Une salle propose une date à ton artiste principal. Cachet encaissé.",
    apply: (s) => { s.cash += ri(1500, 4500); },
  },
  {
    title: "Placement en playlist",
    body: () => "Un curateur ajoute ta dernière sortie en playlist — les streams décollent.",
    apply: (s) => { const r = s.releases[0]; if (r) r.weeklyStreams = Math.round(r.weeklyStreams * 1.5); },
  },
  {
    title: "Clash sur les réseaux",
    body: () => "Un de tes artistes s'embrouille en ligne. La hype prend un coup.",
    apply: (s) => { const a = s.roster[Math.floor(Math.random() * s.roster.length)]; if (a) a.hype = Math.max(0, a.hype - ri(8, 18)); },
  },
  {
    title: "Buzz TikTok",
    body: () => "Un extrait tourne en boucle sur TikTok — la hype grimpe.",
    apply: (s) => { const a = s.roster[Math.floor(Math.random() * s.roster.length)]; if (a) a.hype = Math.min(100, a.hype + ri(10, 22)); },
  },
  {
    title: "Frais imprévus",
    body: () => "Matériel studio à remplacer. La facture pique.",
    apply: (s) => { s.cash -= ri(800, 2500); },
  },
];

function advanceWeek(prev: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(prev));
  // Mémorise l'ordre du chart AVANT que la semaine bouge — base des flèches ▲▼
  s.prevChartOrder = computeChart(prev).map((e) => e.key);
  s.week += 1;

  if (s.project) {
    s.project.weeksLeft -= 1;
    if (s.project.weeksLeft <= 0) {
      const artist = s.roster.find((a) => a.id === s.project!.artistId);
      if (artist) {
        const initialStreams = Math.round(
          s.project.quality * 900 + artist.hype * 700 + s.project.promo * 3 + rnd(0, 15000)
        );
        s.releases.unshift({
          id: nextId(),
          artistId: artist.id,
          artistName: artist.name,
          title: s.project.title,
          type: s.project.type,
          quality: s.project.quality,
          promo: s.project.promo,
          weeklyStreams: initialStreams,
          totalStreams: 0,
          weeksOut: 0,
        });
        artist.hype = Math.min(100, artist.hype + 12);
        s.messages.unshift({
          id: nextId(), week: s.week, title: `Sortie : « ${s.project.title} »`,
          body: `Le ${TYPE_META[s.project.type].label.toLowerCase()} de ${artist.name} est dans les bacs. Premier bilan de streams la semaine prochaine.`,
        });
      }
      s.project = null;
    }
  }

  let weekRevenue = 0;
  for (const r of s.releases) {
    r.weeksOut += 1;
    r.totalStreams += r.weeklyStreams;
    weekRevenue += r.weeklyStreams * 0.0032;
    const decay = 0.68 + Math.min(0.18, r.promo / 60000) + Math.min(0.08, r.quality / 300);
    r.weeklyStreams = Math.round(r.weeklyStreams * decay);
  }
  s.releases = s.releases.filter((r) => r.weeklyStreams > 200);
  s.cash += weekRevenue;

  const salaries = s.roster.reduce((sum, a) => sum + a.salary, 0);
  s.cash -= salaries;

  for (const a of s.roster) a.hype = Math.max(0, a.hype - 2);

  for (const r of s.rivals) {
    r.streams = Math.max(20000, Math.round(r.streams * rnd(0.85, 1.18)));
  }

  const best = s.releases[0]?.weeklyStreams ?? 0;
  const beaten = s.rivals.filter((r) => best > r.streams).length;
  s.reputation = Math.max(0, Math.min(100, s.reputation + (beaten >= 5 ? 3 : beaten >= 2 ? 1 : best > 0 ? 0 : -1)));

  if (s.roster.length > 0 && Math.random() < 0.4) {
    const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    ev.apply(s);
    s.messages.unshift({ id: nextId(), week: s.week, title: ev.title, body: ev.body() });
  }

  if (Math.random() < 0.3) {
    const used = new Set([...s.roster, ...s.market].map((a) => a.name));
    s.market = [...s.market.slice(1), makeArtist(used)];
  }

  s.messages = s.messages.slice(0, 12);

  if (s.cash < 0) s.gameOver = "bankrupt";
  else if (s.week > SEASON_WEEKS) s.gameOver = "season_end";

  return s;
}

// ---------- UI ----------

type Tab = "label" | "artistes" | "studio" | "charts";

function Movement({ delta }: { delta: number | null }) {
  // delta > 0 = monte, < 0 = descend, 0 = stable, null = nouvelle entrée
  if (delta === null) return <span className="font-mono text-[9px] uppercase text-gold">New</span>;
  if (delta > 0) return <TrendingUp size={13} className="text-risePos" />;
  if (delta < 0) return <TrendingDown size={13} className="text-riseNeg" />;
  return <Minus size={13} className="text-ink-faint" />;
}

function StatBar({ label, value, max = 20 }: { label: string; value: number; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase text-ink-faint w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${(value / max) * 100}%`,
            background: "linear-gradient(90deg, #7A0F0F, #F0001C)",
          }}
        />
      </div>
      <span className="font-mono text-[11px] text-ink-muted w-6 text-right">{value}</span>
    </div>
  );
}

function SectionCard({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold flex items-center gap-1.5">
          {icon} {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function ArtistsManagerPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [tab, setTab] = useState<Tab>("label");
  const [projArtist, setProjArtist] = useState<string>("");
  const [projType, setProjType] = useState<Project["type"]>("single");
  const [projStudio, setProjStudio] = useState<number>(BUDGET_PRESETS.studio[1].v);
  const [projClip, setProjClip] = useState<number>(BUDGET_PRESETS.clip[1].v);
  const [projPromo, setProjPromo] = useState<number>(BUDGET_PRESETS.promo[1].v);

  useEffect(() => {
    setState(load() ?? initialState());
  }, []);

  const update = useCallback((next: GameState) => {
    setState(next);
    persist(next);
  }, []);

  useEffect(() => {
    if (state?.gameOver && !state.scoreSaved) {
      const points = Math.round(state.reputation + state.week / 2);
      fetch("/api/blindtest/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "jeu-artists-manager", rounds: state.week, points }),
      }).catch(() => {});
      update({ ...state, scoreSaved: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.gameOver]);

  const chart = useMemo(() => (state ? computeChart(state) : []), [state]);
  const weeklyStreams = useMemo(
    () => (state ? state.releases.reduce((sum, r) => sum + r.weeklyStreams, 0) : 0),
    [state]
  );

  if (!state) {
    return <div className="h-64 flex items-center justify-center text-ink-faint text-sm font-mono">Chargement du label...</div>;
  }

  if (state.gameOver) {
    const bankrupt = state.gameOver === "bankrupt";
    return (
      <section className="max-w-md mx-auto px-6 pt-16 pb-24 text-center">
        <p className="text-4xl mb-4">{bankrupt ? "💸" : "🏆"}</p>
        <h1 className="font-impact text-3xl uppercase mb-2">{bankrupt ? "Faillite" : "Fin de saison"}</h1>
        <p className="text-sm text-ink-muted mb-8">
          {bankrupt
            ? `Le label a coulé à la semaine ${state.week}. La rue n'oublie pas — mais elle pardonne : retente ta chance.`
            : "52 semaines au sommet (ou pas loin). Voici ton bilan."}
        </p>
        <div className="grid grid-cols-2 gap-3 mb-10 text-left">
          <div className="glass rounded-2xl p-4">
            <p className="font-mono text-[10px] uppercase text-ink-faint mb-1">Réputation</p>
            <p className="font-impact text-3xl text-gold">{Math.round(state.reputation)}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="font-mono text-[10px] uppercase text-ink-faint mb-1">Semaines</p>
            <p className="font-impact text-3xl text-gold">{state.week}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="font-mono text-[10px] uppercase text-ink-faint mb-1">Artistes signés</p>
            <p className="font-impact text-3xl">{state.roster.length}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="font-mono text-[10px] uppercase text-ink-faint mb-1">Trésorerie finale</p>
            <p className="font-impact text-3xl">{fmt(Math.max(0, state.cash))} €</p>
          </div>
        </div>
        <BorderMagicButton onClick={() => update(initialState())} size="lg" fullWidth>
          <RotateCcw size={18} /> Nouvelle partie
        </BorderMagicButton>
        <a href="/jouer" className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide mt-6">
          <ArrowLeft size={14} /> Tous les jeux
        </a>
      </section>
    );
  }

  function sign(artist: Artist) {
    if (!state) return;
    if (state.cash < artist.signingFee) return;
    sfx.correct();
    const used = new Set([...state.roster, ...state.market].map((a) => a.name));
    update({
      ...state,
      cash: state.cash - artist.signingFee,
      roster: [...state.roster, artist],
      market: [...state.market.filter((a) => a.id !== artist.id), makeArtist(used)],
      messages: [{
        id: nextId(), week: state.week, title: `${artist.name} rejoint le label`,
        body: `Prime de signature : ${fmt(artist.signingFee)} €. Salaire : ${fmt(artist.salary)} €/semaine. Au travail.`,
      }, ...state.messages].slice(0, 12),
    });
  }

  function startProject() {
    if (!state || state.project) return;
    const artist = state.roster.find((a) => a.id === projArtist);
    if (!artist) return;
    const cost = projStudio + projClip + projPromo;
    if (state.cash < cost) return;
    sfx.click();
    const meta = TYPE_META[projType];
    const skill = (artist.flow + artist.plume) / 2;
    const quality = Math.round(
      skill * 3.2 * meta.studioBase * (0.7 + projStudio / 16000) + (projClip > 0 ? 8 : 0) + rnd(0, 10)
    );
    const title = PROJECT_TITLES[Math.floor(Math.random() * PROJECT_TITLES.length)];
    update({
      ...state,
      cash: state.cash - cost,
      project: { artistId: artist.id, type: projType, title, weeksLeft: meta.weeks, quality, promo: projPromo },
      messages: [{
        id: nextId(), week: state.week, title: `Studio : « ${title} »`,
        body: `${artist.name} entre en studio (${meta.label.toLowerCase()}, ${meta.weeks} semaines). Budget engagé : ${fmt(cost)} €.`,
      }, ...state.messages].slice(0, 12),
    });
    setTab("label");
  }

  function continueWeek() {
    if (!state) return;
    sfx.click();
    update(advanceWeek(state));
  }

  const projectArtist = state.project ? state.roster.find((a) => a.id === state.project!.artistId) : null;
  const weeklyCosts = state.roster.reduce((sum, a) => sum + a.salary, 0);
  const totalCost = projStudio + projClip + projPromo;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-44">
      {/* ===== Barre du haut façon FM : identité · date · CONTINUER ===== */}
      <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 nav-panel flex items-center gap-3">
        <a href="/jouer" aria-label="Tous les jeux" className="shrink-0 text-ink-faint hover:text-ink">
          <ArrowLeft size={18} />
        </a>
        <img src="/icon.svg" alt="" aria-hidden="true" className="w-6 shrink-0 opacity-90" />
        <div className="min-w-0 flex-1">
          <p className="font-impact text-sm uppercase leading-none truncate">Ton label</p>
          <p className="font-mono text-[10px] text-ink-faint mt-0.5">
            Semaine {state.week} / {SEASON_WEEKS} · Saison 2026
          </p>
        </div>
        <BorderMagicButton onClick={continueWeek} size="sm">
          Continuer <ChevronRight size={14} />
        </BorderMagicButton>
      </div>

      {/* ===== KPI cards — la rangée de stats FM ===== */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-4">
        {[
          { label: "Trésorerie", value: `${fmt(state.cash)} €`, Icon: Wallet, alert: state.cash < weeklyCosts * 3 },
          { label: "Réputation", value: `${Math.round(state.reputation)}`, Icon: Star, alert: false },
          { label: "Streams / sem", value: fmt(weeklyStreams), Icon: Radio, alert: false },
        ].map(({ label, value, Icon, alert }) => (
          <div key={label} className="glass-strong rounded-2xl p-3 sm:p-4">
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wide text-ink-faint flex items-center gap-1 mb-1">
              <Icon size={10} className="text-gold" /> {label}
            </p>
            <p className={`font-impact text-lg sm:text-2xl leading-none ${alert ? "text-riseNeg" : ""}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ===== Onglet LABEL (dashboard FM) ===== */}
      {tab === "label" && (
        <div className="pt-4 space-y-4">
          {/* Studio + prochaine échéance côte à côte sur desktop */}
          <div className="grid sm:grid-cols-2 gap-4">
            <SectionCard title="En studio" icon={<Disc3 size={11} />}>
              {state.project && projectArtist ? (
                <div>
                  <p className="font-display font-semibold">« {state.project.title} »</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {projectArtist.name} · {TYPE_META[state.project.type].label}
                  </p>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(1 - state.project.weeksLeft / TYPE_META[state.project.type].weeks) * 100}%`,
                        background: "linear-gradient(90deg, #7A0F0F, #F0001C)",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <button onClick={() => setTab("studio")} className="text-sm text-gold hover:text-glow text-left">
                  Aucun projet — lancer une prod →
                </button>
              )}
            </SectionCard>

            <SectionCard title="Prochaine échéance" icon={<CalendarClock size={11} />}>
              {state.project ? (
                <p className="text-sm">
                  Sortie de <span className="font-semibold">« {state.project.title} »</span>
                  <span className="block font-mono text-[11px] text-gold mt-1">
                    Semaine {state.week + state.project.weeksLeft}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-ink-faint">Rien de planifié.</p>
              )}
              <p className="font-mono text-[10px] text-ink-faint mt-3 pt-3 border-t border-white/8">
                Salaires hebdo : <span className="text-riseNeg">-{fmt(weeklyCosts)} €</span>
              </p>
            </SectionCard>
          </div>

          {/* Mini classement — top 5 avec mouvements, comme la carte Standings FM */}
          <SectionCard
            title="Classement"
            icon={<BarChart3 size={11} />}
            action={
              <button onClick={() => setTab("charts")} className="font-mono text-[10px] uppercase text-gold hover:text-glow">
                Tout voir →
              </button>
            }
          >
            <div className="space-y-1.5">
              {chart.slice(0, 5).map((e, i) => {
                const prevIdx = state.prevChartOrder.indexOf(e.key);
                const delta = state.prevChartOrder.length === 0 ? 0 : prevIdx === -1 ? null : prevIdx - i;
                return (
                  <div key={e.key} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${e.mine ? "bg-gold/10" : ""}`}>
                    <span className="font-impact text-sm w-4 text-center text-ink-faint">{i + 1}</span>
                    <Movement delta={delta} />
                    <p className={`text-sm flex-1 min-w-0 truncate ${e.mine ? "text-gold font-medium" : ""}`}>
                      {e.name}{e.title ? ` — « ${e.title} »` : ""}
                    </p>
                    <span className="font-mono text-[11px] text-ink-muted shrink-0">{fmt(e.streams)}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Sorties actives */}
          {state.releases.length > 0 && (
            <SectionCard title="Sorties actives" icon={<Radio size={11} />}>
              <div className="space-y-2.5">
                {state.releases.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">« {r.title} » — {r.artistName}</p>
                      <p className="font-mono text-[10px] text-ink-faint">{fmt(r.totalStreams)} cumulés · sem. {r.weeksOut}</p>
                    </div>
                    <span className="font-mono text-xs text-gold shrink-0">{fmt(r.weeklyStreams)}/sem</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Inbox — boîte de réception FM */}
          <SectionCard title="Boîte de réception" icon={<Inbox size={11} />}>
            <div className="divide-y divide-white/6 -mx-4 -mb-4">
              {state.messages.map((m) => (
                <div key={m.id} className="px-4 py-3 flex gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-gold/12 text-gold flex items-center justify-center">
                    <Inbox size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-baseline gap-2">
                      {m.title}
                      <span className="font-mono text-[9px] text-ink-faint shrink-0">S{m.week}</span>
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{m.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ===== Onglet ARTISTES ===== */}
      {tab === "artistes" && (
        <div className="pt-4 space-y-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-3">Ton roster ({state.roster.length})</p>
            {state.roster.length === 0 ? (
              <p className="text-sm text-ink-faint glass rounded-2xl p-4">Personne pour l'instant — signe ton premier artiste ci-dessous.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {state.roster.map((a, idx) => (
                  <div key={a.id} className="glass-strong rounded-2xl overflow-hidden">
                    {/* Bandeau façon player card : dégradé + nom + numéro fantôme */}
                    <div
                      className="relative px-4 py-3"
                      style={{ background: "linear-gradient(135deg, rgba(240,0,28,0.35), rgba(122,15,15,0.15))" }}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute right-3 top-1/2 -translate-y-1/2 font-impact text-4xl text-white/10 select-none"
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <p className="font-impact text-lg uppercase leading-none">{a.name}</p>
                      <p className="font-mono text-[10px] text-ink-muted mt-1">{a.style} · {fmt(a.salary)} €/sem</p>
                    </div>
                    <div className="p-4 space-y-1.5">
                      <StatBar label="Flow" value={a.flow} />
                      <StatBar label="Plume" value={a.plume} />
                      <StatBar label="Charisme" value={a.charisme} />
                      <StatBar label="Hype" value={a.hype} max={100} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-3">Sur le marché</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {state.market.map((a) => {
                const affordable = state.cash >= a.signingFee;
                return (
                  <div key={a.id} className="glass rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/8">
                      <p className="font-impact text-lg uppercase leading-none">{a.name}</p>
                      <p className="font-mono text-[10px] text-ink-muted mt-1">{a.style}</p>
                    </div>
                    <div className="p-4">
                      <div className="space-y-1.5 mb-4">
                        <StatBar label="Flow" value={a.flow} />
                        <StatBar label="Plume" value={a.plume} />
                        <StatBar label="Charisme" value={a.charisme} />
                      </div>
                      <button
                        onClick={() => sign(a)}
                        disabled={!affordable}
                        className={`w-full rounded-xl py-2.5 text-sm font-semibold border transition-colors ${
                          affordable
                            ? "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20"
                            : "border-white/8 text-ink-faint cursor-not-allowed"
                        }`}
                      >
                        Signer — {fmt(a.signingFee)} €{!affordable && " (fonds insuffisants)"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== Onglet STUDIO — étapes numérotées + récap ===== */}
      {tab === "studio" && (
        <div className="pt-4 space-y-4">
          {state.project ? (
            <p className="text-sm text-ink-faint glass rounded-2xl p-4">
              Un projet est déjà en cours — un seul à la fois dans cette version. Avance les semaines pour le terminer.
            </p>
          ) : state.roster.length === 0 ? (
            <p className="text-sm text-ink-faint glass rounded-2xl p-4">
              Il te faut d'abord un artiste.{" "}
              <button onClick={() => setTab("artistes")} className="text-gold hover:text-glow">Voir le marché →</button>
            </p>
          ) : (
            <>
              <SectionCard title="1 · Artiste" icon={<Users size={11} />}>
                <div className="flex gap-2 flex-wrap">
                  {state.roster.map((a) => (
                    <button key={a.id} onClick={() => setProjArtist(a.id)} className={`filter-pill ${projArtist === a.id ? "is-active" : ""}`}>
                      {a.name}
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="2 · Format" icon={<Disc3 size={11} />}>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(TYPE_META) as Project["type"][]).map((t) => (
                    <button key={t} onClick={() => setProjType(t)} className={`filter-pill ${projType === t ? "is-active" : ""}`}>
                      {TYPE_META[t].label} · {TYPE_META[t].weeks} sem
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="3 · Budgets" icon={<Wallet size={11} />}>
                <div className="space-y-4">
                  {(["studio", "clip", "promo"] as const).map((k) => {
                    const value = k === "studio" ? projStudio : k === "clip" ? projClip : projPromo;
                    const set: Dispatch<SetStateAction<number>> =
                      k === "studio" ? setProjStudio : k === "clip" ? setProjClip : setProjPromo;
                    return (
                      <div key={k}>
                        <p className="font-mono text-[10px] uppercase text-ink-faint mb-2">
                          {k === "studio" ? "Studio" : k === "clip" ? "Clip" : "Promo"}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {BUDGET_PRESETS[k].map((p) => (
                            <button key={p.label} onClick={() => set(p.v)} className={`filter-pill ${value === p.v ? "is-active" : ""}`}>
                              {p.label} · {fmt(p.v)} €
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <div className="glass-strong rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase text-ink-faint">Coût total</p>
                  <p className={`font-impact text-xl ${state.cash >= totalCost ? "" : "text-riseNeg"}`}>{fmt(totalCost)} €</p>
                </div>
                <p className="font-mono text-[10px] text-ink-faint">Dispo : {fmt(state.cash)} €</p>
              </div>

              <BorderMagicButton onClick={startProject} fullWidth size="lg" disabled={!projArtist || state.cash < totalCost}>
                Lancer la prod
              </BorderMagicButton>
            </>
          )}
        </div>
      )}

      {/* ===== Onglet CHARTS — classement complet avec mouvements ===== */}
      {tab === "charts" && (
        <div className="pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-3">Top streams — semaine {state.week}</p>
          <div className="card divide-y divide-white/8 overflow-hidden">
            {chart.map((e, i) => {
              const prevIdx = state.prevChartOrder.indexOf(e.key);
              const delta = state.prevChartOrder.length === 0 ? 0 : prevIdx === -1 ? null : prevIdx - i;
              return (
                <div key={e.key} className={`flex items-center gap-3 py-3 px-4 ${e.mine ? "bg-gold/8" : ""}`}>
                  <span className="font-impact text-lg w-6 text-center text-ink-faint">{i + 1}</span>
                  <Movement delta={delta} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${e.mine ? "text-gold" : ""}`}>
                      {e.name}{e.title ? ` — « ${e.title} »` : ""}
                    </p>
                    {e.mine && <p className="font-mono text-[9px] text-gold/70 uppercase">Ton label</p>}
                  </div>
                  <span className="font-mono text-xs text-ink-muted shrink-0">{fmt(e.streams)}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-ink-faint font-mono mt-4">
            ▲▼ = mouvement vs semaine passée. Bats les rivaux pour faire grimper ta réputation. Artistes et chiffres simulés.
          </p>
        </div>
      )}

      {/* ===== Tab bar bas ===== */}
      <nav className="fixed bottom-0 inset-x-0 z-40 nav-panel" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          {([
            { id: "label" as Tab, label: "Label", Icon: Wallet },
            { id: "artistes" as Tab, label: "Artistes", Icon: Users },
            { id: "studio" as Tab, label: "Studio", Icon: Disc3 },
            { id: "charts" as Tab, label: "Charts", Icon: BarChart3 },
          ]).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { sfx.click(); setTab(id); }}
              className={`flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors ${
                tab === id ? "text-gold" : "text-ink-faint hover:text-ink"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
