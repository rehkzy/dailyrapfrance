"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowLeft, ArrowRight, Wallet, Star, Users, Disc3, BarChart3, Inbox, ChevronRight, RotateCcw, TrendingUp, TrendingDown, Minus, Radio, CalendarClock, CheckCircle2, Circle, MapPin, User, Building2, LayoutDashboard, UserPlus, PiggyBank, LineChart } from "lucide-react";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import { sfx } from "@/lib/sfx";

/*
 * ARTISTS MANAGER 2026 — v3 : onboarding façon "création de carrière" FM + tutoriel.
 *
 * Nouveautés :
 *  - Wizard de personnalisation en 3 étapes au premier lancement (comme la création de
 *    manager dans FM) : identité (prénom, pseudo), label (nom, ville, logo, couleur),
 *    récap avant de lancer la carrière. Tout est réutilisé dans l'interface (barre du
 *    haut, messages, écran de fin).
 *  - Tutoriel guidé en 4 écrans après l'onboarding (survol des onglets, le bouton
 *    Continuer, l'objectif) — affiché une seule fois.
 *  - Checklist "Premiers pas" sur le dashboard (façon tâches FM), auto-cochée selon la
 *    progression réelle, disparaît une fois les 3 actions faites.
 *
 * Les sauvegardes v1/v2 sont conservées : au chargement, si le profil manque, seul
 * l'onboarding s'affiche — la partie en cours n'est PAS réinitialisée.
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

type Profile = {
  firstName: string;
  pseudo: string;
  labelName: string;
  city: string;
  logo: string;   // emoji du label
  color: string;  // accent hexa (variations charte)
};

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
  prevChartOrder: string[];
  totalReleases: number;        // sorties publiées depuis le début (cumul carrière)
  totalStreamsAllTime: number;  // streams cumulés toutes sorties confondues
  profile: Profile | null;
  tutorialDone: boolean;
  gameOver: null | "bankrupt" | "season_end";
  scoreSaved: boolean;
};

// ---------- Données ----------

const FIRST = ["Zeyko", "Diako", "Sirem", "Kaira", "Noxx", "Tismé", "Rakelm", "Melza", "Solda K", "Ylane", "Braska", "Numen", "Vexo", "Damsa", "Kliff", "Orya"];
const STYLES = ["Drill", "Mélo", "Boom bap", "Trap", "Cloud", "Afro"];
const RIVAL_NAMES = ["Wesko", "Lynka", "7ID", "Marzo", "Selva", "KMR", "Dosia", "Priam"];
const PROJECT_TITLES = ["Minuit", "Zone 7", "Éclipse", "Sans retour", "Or noir", "Antidote", "Mirage", "Balafre", "Horizon", "Vertige", "Cendres", "Apnée"];

const CITIES = ["Paris", "Marseille", "Lyon", "Lille", "Seine-Saint-Denis", "Toulouse", "Strasbourg", "Bruxelles"];
const LOGOS = ["🎤", "💿", "🔥", "🐺", "🦅", "💎", "👑", "🌙"];
const COLORS = [
  { label: "Rouge signal", v: "#F0001C" },
  { label: "Braise", v: "#FF3B4E" },
  { label: "Bordeaux", v: "#A3121B" },
  { label: "Or", v: "#D4A017" },
];

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
    messages: [],
    rivals: RIVAL_NAMES.map((name) => ({ name, streams: ri(60000, 380000) })),
    prevChartOrder: [],
    totalReleases: 0,
    totalStreamsAllTime: 0,
    profile: null,
    tutorialDone: false,
    gameOver: null,
    scoreSaved: false,
  };
}

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    // Compat v1/v2 — champs ajoutés depuis
    if (!Array.isArray(s.prevChartOrder)) s.prevChartOrder = [];
    if (s.profile === undefined) s.profile = null;
    if (typeof s.tutorialDone !== "boolean") s.tutorialDone = false;
    if (typeof s.totalReleases !== "number") s.totalReleases = s.releases?.length ?? 0;
    if (typeof s.totalStreamsAllTime !== "number") {
      s.totalStreamsAllTime = (s.releases ?? []).reduce((sum, r) => sum + (r.totalStreams ?? 0), 0);
    }
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

type ChartEntry = { key: string; name: string; title: string | null; streams: number; mine: boolean };

function computeChart(s: GameState): ChartEntry[] {
  const entries: ChartEntry[] = [
    ...s.rivals.map((r) => ({ key: `rival:${r.name}`, name: r.name, title: null, streams: r.streams, mine: false })),
    ...s.releases.map((r) => ({ key: `rel:${r.id}`, name: r.artistName, title: r.title, streams: r.weeklyStreams, mine: true })),
  ];
  return entries.sort((a, b) => b.streams - a.streams).slice(0, 10);
}

// ---------- Simulation ----------

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
        s.totalReleases += 1;
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
    s.totalStreamsAllTime += r.weeklyStreams;
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

// ---------- Petits composants UI ----------

type Tab = "label" | "artistes" | "marche" | "studio" | "charts" | "messages" | "finances" | "stats";

// Menu unique — la sidebar desktop (façon FM) et la tab bar mobile piochent dedans.
const MENU: { id: Tab; label: string; Icon: typeof Wallet; mobile: boolean }[] = [
  { id: "label", label: "Dashboard", Icon: LayoutDashboard, mobile: true },
  { id: "artistes", label: "Artistes", Icon: Users, mobile: true },
  { id: "marche", label: "Marché", Icon: UserPlus, mobile: false },
  { id: "studio", label: "Studio", Icon: Disc3, mobile: true },
  { id: "charts", label: "Charts", Icon: BarChart3, mobile: true },
  { id: "messages", label: "Messages", Icon: Inbox, mobile: false },
  { id: "finances", label: "Finances", Icon: PiggyBank, mobile: false },
  { id: "stats", label: "Stats", Icon: LineChart, mobile: false },
];

function Movement({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="font-mono text-[9px] uppercase text-gold">New</span>;
  if (delta > 0) return <TrendingUp size={13} className="text-risePos" />;
  if (delta < 0) return <TrendingDown size={13} className="text-riseNeg" />;
  return <Minus size={13} className="text-ink-faint" />;
}

function StatBar({ label, value, max = 20, color = "#F0001C" }: { label: string; value: number; max?: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase text-ink-faint w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${(value / max) * 100}%`, background: `linear-gradient(90deg, #7A0F0F, ${color})` }}
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

// ---------- Onboarding (création de carrière façon FM) ----------

function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [labelName, setLabelName] = useState("");
  const [city, setCity] = useState<string>(CITIES[0]);
  const [customCity, setCustomCity] = useState("");
  const [logo, setLogo] = useState(LOGOS[0]);
  const [color, setColor] = useState(COLORS[0].v);

  const finalCity = customCity.trim() || city;
  const canNext = step === 0 ? firstName.trim().length > 0 && pseudo.trim().length > 0 : step === 1 ? labelName.trim().length > 0 : true;

  const STEPS = ["Toi", "Ton label", "Récap"];

  return (
    <section className="max-w-md mx-auto px-6 pt-10 pb-24">
      <a href="/jouer" className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide mb-8">
        <ArrowLeft size={14} /> Tous les jeux
      </a>

      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-2">Artists Manager 2026</p>
      <h1 className="font-impact text-3xl uppercase mb-1">Nouvelle carrière</h1>
      <p className="text-sm text-ink-muted mb-6">Crée ton identité de manager avant de te lancer — comme dans FM.</p>

      {/* Indicateur d'étapes */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                i < step ? "bg-gold text-white" : i === step ? "border-2 border-gold text-gold" : "border border-white/15 text-ink-faint"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span className={`text-xs font-medium ${i === step ? "text-ink" : "text-ink-faint"}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="w-6 h-px bg-white/15" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-5 solved-pop">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wide text-gold flex items-center gap-1.5 mb-2">
              <User size={11} /> Ton prénom
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Florian"
              maxLength={20}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-gold/50"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wide text-gold flex items-center gap-1.5 mb-2">
              <Star size={11} /> Ton pseudo de manager
            </label>
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Flo93"
              maxLength={16}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-gold/50"
            />
            <p className="text-[11px] text-ink-faint mt-1.5">C'est ce nom qui apparaîtra dans les messages de l'industrie.</p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5 solved-pop">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wide text-gold flex items-center gap-1.5 mb-2">
              <Building2 size={11} /> Nom du label
            </label>
            <input
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              placeholder="Minuit Records"
              maxLength={24}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-gold/50"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wide text-gold flex items-center gap-1.5 mb-2">
              <MapPin size={11} /> Ta ville de départ
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              {CITIES.map((c) => (
                <button key={c} onClick={() => { setCity(c); setCustomCity(""); }} className={`filter-pill ${city === c && !customCity ? "is-active" : ""}`}>
                  {c}
                </button>
              ))}
            </div>
            <input
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder="Ou tape la tienne..."
              maxLength={24}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold/50"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wide text-gold mb-2 block">Logo du label</label>
            <div className="flex gap-2 flex-wrap">
              {LOGOS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLogo(l)}
                  className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center border transition-colors ${
                    logo === l ? "border-gold bg-gold/15" : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wide text-gold mb-2 block">Couleur du label</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.v}
                  onClick={() => setColor(c.v)}
                  className={`flex items-center gap-2 rounded-full pl-1.5 pr-3.5 py-1.5 text-xs font-medium border transition-colors ${
                    color === c.v ? "border-gold/60 bg-gold/10 text-ink" : "border-white/10 bg-white/5 text-ink-muted hover:border-white/25"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full" style={{ background: c.v }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="solved-pop">
          {/* Carte récap façon fiche FM */}
          <div className="glass-strong rounded-2xl overflow-hidden mb-5">
            <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${color}55, transparent)` }}>
              <p className="text-3xl mb-1">{logo}</p>
              <p className="font-impact text-2xl uppercase leading-none">{labelName}</p>
              <p className="font-mono text-[11px] text-ink-muted mt-1.5 flex items-center gap-1">
                <MapPin size={10} /> {finalCity}
              </p>
            </div>
            <div className="px-5 py-4 space-y-1.5">
              <p className="text-sm"><span className="text-ink-faint">Manager :</span> {firstName} « {pseudo} »</p>
              <p className="text-sm"><span className="text-ink-faint">Trésorerie de départ :</span> {fmt(START_CASH)} €</p>
              <p className="text-sm"><span className="text-ink-faint">Objectif :</span> tenir {SEASON_WEEKS} semaines et faire grimper ta réputation</p>
            </div>
          </div>
          <p className="text-xs text-ink-faint leading-relaxed mb-2">
            Tu pourras recommencer une carrière à tout moment depuis l'écran de fin.
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="glass rounded-2xl px-5 text-sm font-semibold hover:border-gold/40 transition-colors"
          >
            Retour
          </button>
        )}
        <BorderMagicButton
          onClick={() => {
            sfx.click();
            if (step < 2) setStep((s) => s + 1);
            else onDone({ firstName: firstName.trim(), pseudo: pseudo.trim(), labelName: labelName.trim(), city: finalCity, logo, color });
          }}
          fullWidth
          size="lg"
          disabled={!canNext}
        >
          {step < 2 ? "Continuer" : "Lancer ma carrière"} <ArrowRight size={16} />
        </BorderMagicButton>
      </div>
    </section>
  );
}

// ---------- Tutoriel (coach marks, 4 écrans) ----------

const TUTO_STEPS = [
  {
    title: "Bienvenue au label 👋",
    body: (p: Profile) => `${p.pseudo}, te voilà à la tête de ${p.labelName} (${p.city}). Le principe : chaque semaine compte — tes décisions font vivre ou couler le label.`,
  },
  {
    title: "Le bouton Continuer",
    body: () => "C'est le cœur du jeu, comme dans FM : il fait avancer d'une semaine. Streams, trésorerie, hype et classement bougent à chaque pression. Il est toujours en haut à droite.",
  },
  {
    title: "Le menu du label",
    body: () => "Dashboard = ta vue d'ensemble. Artistes = ton roster. Marché = le recrutement. Studio = lancer une prod. Charts, Messages, Finances et Stats complètent le tout — menu à gauche sur ordi, barre du bas + raccourcis sur mobile.",
  },
  {
    title: "Ton objectif",
    body: () => "Signe, produis, sors des projets pour battre les rivaux et faire grimper ta réputation. Trésorerie négative = faillite. Tiens les 52 semaines — ta checklist \"Premiers pas\" t'attend sur le dashboard.",
  },
];

function Tutorial({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [i, setI] = useState(0);
  const s = TUTO_STEPS[i];
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 pb-8 sm:pb-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative nav-panel rounded-3xl p-6 max-w-sm w-full solved-pop">
        <p className="font-mono text-[10px] uppercase tracking-wide text-gold mb-3">
          Tutoriel · {i + 1}/{TUTO_STEPS.length}
        </p>
        <h2 className="font-impact text-xl uppercase mb-2">{s.title}</h2>
        <p className="text-sm text-ink-muted leading-relaxed mb-6">{s.body(profile)}</p>
        <div className="flex items-center justify-between gap-3">
          <button onClick={onDone} className="text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide">
            Passer
          </button>
          <BorderMagicButton
            onClick={() => {
              sfx.click();
              if (i < TUTO_STEPS.length - 1) setI(i + 1);
              else onDone();
            }}
            size="md"
          >
            {i < TUTO_STEPS.length - 1 ? "Suivant" : "C'est parti 🔥"}
          </BorderMagicButton>
        </div>
      </div>
    </div>
  );
}

// ---------- Page ----------

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

  // ----- Onboarding (pas encore de profil) -----
  if (!state.profile) {
    return (
      <Onboarding
        onDone={(p) => {
          sfx.victory();
          update({
            ...state,
            profile: p,
            messages: [{
              id: nextId(), week: state.week, title: `${p.labelName} ouvre ses portes`,
              body: `${p.pseudo}, tu démarres à ${p.city} avec ${fmt(START_CASH)} €. Signe ton premier artiste, produis un projet, et fais grimper ta réputation. Faillite = fin de partie.`,
            }, ...state.messages].slice(0, 12),
          });
        }}
      />
    );
  }

  const profile = state.profile;

  // ----- Écran de fin -----
  if (state.gameOver) {
    const bankrupt = state.gameOver === "bankrupt";
    return (
      <section className="max-w-md mx-auto px-6 pt-16 pb-24 text-center">
        <p className="text-4xl mb-4">{bankrupt ? "💸" : "🏆"}</p>
        <h1 className="font-impact text-3xl uppercase mb-2">{bankrupt ? "Faillite" : "Fin de saison"}</h1>
        <p className="text-sm text-ink-muted mb-8">
          {bankrupt
            ? `${profile.labelName} a coulé à la semaine ${state.week}. La rue n'oublie pas — mais elle pardonne : retente ta chance, ${profile.pseudo}.`
            : `52 semaines à la tête de ${profile.labelName}. Voici ton bilan, ${profile.pseudo}.`}
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
        <BorderMagicButton onClick={() => update({ ...initialState(), profile, tutorialDone: true })} size="lg" fullWidth>
          <RotateCcw size={18} /> Nouvelle saison avec {profile.labelName}
        </BorderMagicButton>
        <button
          onClick={() => update(initialState())}
          className="block mx-auto text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide mt-4"
        >
          Repartir de zéro (nouveau label)
        </button>
        <a href="/jouer" className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide mt-6">
          <ArrowLeft size={14} /> Tous les jeux
        </a>
      </section>
    );
  }

  // ----- Actions -----
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
        id: nextId(), week: state.week, title: `${artist.name} rejoint ${state.profile!.labelName}`,
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
  const accent = profile.color;

  // Checklist "Premiers pas" — auto-cochée selon la progression réelle
  const firstSteps = [
    { label: "Signer ton premier artiste", done: state.roster.length > 0, go: () => setTab("marche") },
    { label: "Lancer une première prod", done: state.project !== null || state.releases.length > 0, go: () => setTab("studio") },
    { label: "Passer ta première semaine", done: state.week > 1, go: continueWeek },
  ];
  const allStepsDone = firstSteps.every((s) => s.done);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-44 lg:pb-16">
      {/* Tutoriel — une seule fois, après l'onboarding */}
      {!state.tutorialDone && (
        <Tutorial profile={profile} onDone={() => update({ ...state, tutorialDone: true })} />
      )}

      {/* ===== Barre du haut façon FM : identité du label · semaine · CONTINUER ===== */}
      <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 nav-panel flex items-center gap-3">
        <a href="/jouer" aria-label="Tous les jeux" className="shrink-0 text-ink-faint hover:text-ink">
          <ArrowLeft size={18} />
        </a>
        <span className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ background: `${accent}26` }}>
          {profile.logo}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-impact text-sm uppercase leading-none truncate">{profile.labelName}</p>
          <p className="font-mono text-[10px] text-ink-faint mt-0.5 truncate">
            {profile.city} · Semaine {state.week}/{SEASON_WEEKS} · {profile.pseudo}
          </p>
        </div>
        <BorderMagicButton onClick={continueWeek} size="sm">
          Continuer <ChevronRight size={14} />
        </BorderMagicButton>
      </div>

      {/* ===== Sidebar FM (desktop) + colonne de contenu ===== */}
      <div className="lg:flex lg:gap-6 lg:items-start">
        <aside className="hidden lg:block w-52 shrink-0 sticky top-[7.25rem] self-start pt-4">
          <nav className="glass-strong rounded-2xl py-2 overflow-hidden">
            {MENU.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => { sfx.click(); setTab(id); }}
                className={`relative w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                  tab === id ? "text-ink bg-white/5" : "text-ink-muted hover:text-ink hover:bg-white/[0.03]"
                }`}
              >
                {/* Barre d'accent à gauche de l'item actif — la signature sidebar FM */}
                {tab === id && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r" style={{ background: accent }} />
                )}
                <Icon size={16} style={tab === id ? { color: accent } : undefined} />
                {label}
                {id === "messages" && state.messages.length > 0 && (
                  <span
                    className="ml-auto min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                    style={{ background: accent }}
                  >
                    {state.messages.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <p className="font-mono text-[9px] text-ink-faint uppercase tracking-wide px-4 mt-3">
            Saison 2026 · {profile.labelName}
          </p>
        </aside>

        <div className="min-w-0 flex-1">

      {/* ===== KPI cards ===== */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-4">
        {[
          { label: "Trésorerie", value: `${fmt(state.cash)} €`, Icon: Wallet, alert: state.cash < weeklyCosts * 3 },
          { label: "Réputation", value: `${Math.round(state.reputation)}`, Icon: Star, alert: false },
          { label: "Streams / sem", value: fmt(weeklyStreams), Icon: Radio, alert: false },
        ].map(({ label, value, Icon, alert }) => (
          <div key={label} className="glass-strong rounded-2xl p-3 sm:p-4">
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wide text-ink-faint flex items-center gap-1 mb-1">
              <Icon size={10} style={{ color: accent }} /> {label}
            </p>
            <p className={`font-impact text-lg sm:text-2xl leading-none ${alert ? "text-riseNeg" : ""}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Raccourcis mobile vers les sections absentes de la tab bar basse */}
      <div className="flex gap-2 overflow-x-auto pt-3 lg:hidden -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
        {MENU.filter((m) => !m.mobile).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => { sfx.click(); setTab(id); }}
            className={`filter-pill shrink-0 inline-flex items-center gap-1.5 ${tab === id ? "is-active" : ""}`}
          >
            <Icon size={12} />
            {label}
            {id === "messages" && state.messages.length > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: accent }}>
                {state.messages.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== Onglet LABEL ===== */}
      {tab === "label" && (
        <div className="pt-4 space-y-4">
          {/* Checklist premiers pas — façon tâches FM, disparaît une fois complétée */}
          {!allStepsDone && (
            <SectionCard title="Premiers pas" icon={<CheckCircle2 size={11} />}>
              <div className="space-y-2">
                {firstSteps.map((s) => (
                  <button
                    key={s.label}
                    onClick={s.done ? undefined : s.go}
                    disabled={s.done}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                      s.done ? "text-ink-faint" : "text-ink hover:bg-white/5"
                    }`}
                  >
                    {s.done
                      ? <CheckCircle2 size={16} className="text-risePos shrink-0" />
                      : <Circle size={16} className="text-gold shrink-0" />}
                    <span className={`text-sm ${s.done ? "line-through" : ""}`}>{s.label}</span>
                    {!s.done && <ChevronRight size={14} className="ml-auto text-ink-faint" />}
                  </button>
                ))}
              </div>
            </SectionCard>
          )}

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
                        background: `linear-gradient(90deg, #7A0F0F, ${accent})`,
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

          <SectionCard
            title="Boîte de réception"
            icon={<Inbox size={11} />}
            action={
              state.messages.length > 3 ? (
                <button onClick={() => setTab("messages")} className="font-mono text-[10px] uppercase text-gold hover:text-glow">
                  Tout voir →
                </button>
              ) : undefined
            }
          >
            {state.messages.length === 0 ? (
              <p className="text-sm text-ink-faint">Rien pour l'instant — l'industrie t'écrira vite.</p>
            ) : (
              <div className="divide-y divide-white/6 -mx-4 -mb-4">
                {state.messages.slice(0, 3).map((m) => (
                  <div key={m.id} className="px-4 py-3 flex gap-3">
                    <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}1f`, color: accent }}>
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
            )}
          </SectionCard>
        </div>
      )}

      {/* ===== Onglet ARTISTES (roster seul — le recrutement vit dans Marché) ===== */}
      {tab === "artistes" && (
        <div className="pt-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">Ton roster ({state.roster.length})</p>
              <button onClick={() => setTab("marche")} className="font-mono text-[10px] uppercase text-gold hover:text-glow">
                Recruter →
              </button>
            </div>
            {state.roster.length === 0 ? (
              <p className="text-sm text-ink-faint glass rounded-2xl p-4">
                Personne pour l'instant —{" "}
                <button onClick={() => setTab("marche")} className="text-gold hover:text-glow">va voir le marché →</button>
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {state.roster.map((a, idx) => (
                  <div key={a.id} className="glass-strong rounded-2xl overflow-hidden">
                    <div
                      className="relative px-4 py-3"
                      style={{ background: `linear-gradient(135deg, ${accent}59, ${accent}14)` }}
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
                      <StatBar label="Flow" value={a.flow} color={accent} />
                      <StatBar label="Plume" value={a.plume} color={accent} />
                      <StatBar label="Charisme" value={a.charisme} color={accent} />
                      <StatBar label="Hype" value={a.hype} max={100} color={accent} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Onglet MARCHÉ (recrutement, façon Transfer FM) ===== */}
      {tab === "marche" && (
        <div className="pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-3">Talents disponibles</p>
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
                      <StatBar label="Flow" value={a.flow} color={accent} />
                      <StatBar label="Plume" value={a.plume} color={accent} />
                      <StatBar label="Charisme" value={a.charisme} color={accent} />
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
          <p className="text-[11px] text-ink-faint font-mono mt-4">
            Le marché tourne au fil des semaines — un talent parti ne revient pas.
          </p>
        </div>
      )}

      {/* ===== Onglet STUDIO ===== */}
      {tab === "studio" && (
        <div className="pt-4 space-y-4">
          {state.project ? (
            <p className="text-sm text-ink-faint glass rounded-2xl p-4">
              Un projet est déjà en cours — un seul à la fois dans cette version. Avance les semaines pour le terminer.
            </p>
          ) : state.roster.length === 0 ? (
            <p className="text-sm text-ink-faint glass rounded-2xl p-4">
              Il te faut d'abord un artiste.{" "}
              <button onClick={() => setTab("marche")} className="text-gold hover:text-glow">Voir le marché →</button>
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

      {/* ===== Onglet CHARTS ===== */}
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
                    {e.mine && <p className="font-mono text-[9px] text-gold/70 uppercase">{profile.labelName}</p>}
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

      {/* ===== Onglet MESSAGES (inbox complète) ===== */}
      {tab === "messages" && (
        <div className="pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-3">Boîte de réception</p>
          {state.messages.length === 0 ? (
            <p className="text-sm text-ink-faint glass rounded-2xl p-4">Rien pour l'instant — l'industrie t'écrira vite.</p>
          ) : (
            <div className="card divide-y divide-white/8 overflow-hidden">
              {state.messages.map((m) => (
                <div key={m.id} className="px-4 py-3.5 flex gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}1f`, color: accent }}>
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
          )}
        </div>
      )}

      {/* ===== Onglet FINANCES (façon Finance FM) ===== */}
      {tab === "finances" && (
        <div className="pt-4 space-y-4">
          {/* Bilan hebdo estimé */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {(() => {
              const revenue = weeklyStreams * 0.0032;
              const net = revenue - weeklyCosts;
              return [
                { label: "Revenus / sem", value: `+${fmt(revenue)} €`, cls: "text-risePos" },
                { label: "Salaires / sem", value: `-${fmt(weeklyCosts)} €`, cls: "text-riseNeg" },
                { label: "Net estimé", value: `${net >= 0 ? "+" : ""}${fmt(net)} €`, cls: net >= 0 ? "text-risePos" : "text-riseNeg" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="glass-strong rounded-2xl p-3 sm:p-4">
                  <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wide text-ink-faint mb-1">{label}</p>
                  <p className={`font-impact text-lg sm:text-2xl leading-none ${cls}`}>{value}</p>
                </div>
              ));
            })()}
          </div>

          <SectionCard title="Masse salariale" icon={<Users size={11} />}>
            {state.roster.length === 0 ? (
              <p className="text-sm text-ink-faint">Aucun artiste sous contrat.</p>
            ) : (
              <div className="space-y-2">
                {state.roster.map((a) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <p className="text-sm">{a.name}</p>
                    <span className="font-mono text-xs text-riseNeg">-{fmt(a.salary)} €/sem</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Revenus par sortie" icon={<Radio size={11} />}>
            {state.releases.length === 0 ? (
              <p className="text-sm text-ink-faint">Aucune sortie active — les streams paient tes factures.</p>
            ) : (
              <div className="space-y-2">
                {state.releases.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3">
                    <p className="text-sm truncate min-w-0">« {r.title} » — {r.artistName}</p>
                    <span className="font-mono text-xs text-risePos shrink-0">+{fmt(r.weeklyStreams * 0.0032)} €/sem</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <p className="text-[11px] text-ink-faint font-mono">
            ~3,20 € pour 1 000 streams. Les budgets studio/clip/promo sont débités au lancement de la prod.
          </p>
        </div>
      )}

      {/* ===== Onglet STATS (carrière, façon Statistic FM) ===== */}
      {tab === "stats" && (
        <div className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[
              { label: "Streams carrière", value: fmt(state.totalStreamsAllTime) },
              { label: "Sorties publiées", value: `${state.totalReleases}` },
              { label: "Artistes au roster", value: `${state.roster.length}` },
              { label: "Semaines en poste", value: `${state.week}` },
            ].map(({ label, value }) => (
              <div key={label} className="glass-strong rounded-2xl p-4">
                <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint mb-1">{label}</p>
                <p className="font-impact text-2xl leading-none">{value}</p>
              </div>
            ))}
          </div>

          <SectionCard title="Réputation du label" icon={<Star size={11} />}>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.round(state.reputation)}%`, background: `linear-gradient(90deg, #7A0F0F, ${accent})` }}
                />
              </div>
              <span className="font-impact text-xl">{Math.round(state.reputation)}<span className="text-ink-faint text-sm">/100</span></span>
            </div>
            <p className="text-[11px] text-ink-faint font-mono mt-3">
              Monte en battant les labels rivaux au classement hebdo.
            </p>
          </SectionCard>

          <SectionCard title="Hype du roster" icon={<TrendingUp size={11} />}>
            {state.roster.length === 0 ? (
              <p className="text-sm text-ink-faint">Signe des artistes pour suivre leur hype ici.</p>
            ) : (
              <div className="space-y-1.5">
                {[...state.roster].sort((a, b) => b.hype - a.hype).map((a) => (
                  <StatBar key={a.id} label={a.name} value={a.hype} max={100} color={accent} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

        </div>{/* /colonne de contenu */}
      </div>{/* /flex sidebar + contenu */}

      {/* ===== Tab bar (mobile uniquement — la sidebar prend le relais sur desktop) ===== */}
      <nav className="fixed bottom-0 inset-x-0 z-40 nav-panel lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          {MENU.filter((m) => m.mobile).map(({ id, label, Icon }) => (
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
