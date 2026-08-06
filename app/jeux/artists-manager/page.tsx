"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowLeft, Wallet, Star, Users, Disc3, BarChart3, Inbox, ChevronRight, RotateCcw } from "lucide-react";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import { sfx } from "@/lib/sfx";

/*
 * ARTISTS MANAGER 26 — v1 jouable du "Football Manager du rap français".
 *
 * Boucle de jeu (inspirée FM, pensée mobile-first) :
 *   1. Signer des artistes (fictifs) sur son label — chacun a ses stats, son salaire.
 *   2. Lancer des projets (single/EP/album) avec des budgets studio/clip/promo.
 *   3. CONTINUER (le bouton FM) → la semaine avance : le projet progresse, les sorties
 *      génèrent des streams qui déclinent, la trésorerie bouge (revenus - salaires),
 *      la hype évolue, des événements tombent dans la boîte de réception, le chart
 *      hebdo se recalcule face à des artistes rivaux simulés.
 *   4. Trésorerie négative = faillite (game over). Semaine 52 = bilan de saison.
 *
 * Tout est côté client (localStorage "drf-am26") — aucune table à créer. Le score final
 * (réputation + semaines tenues) part dans blindtest_scores via la route existante
 * (thème "jeu-artists-manager"), donc visible dans les profils et le classement.
 *
 * Les artistes sont FICTIFS (noms inventés) — impossible d'utiliser de vrais rappeurs
 * sans accords de droits à l'image/nom.
 */

// ---------- Types ----------

type Artist = {
  id: string;
  name: string;
  style: string;
  flow: number;      // 1-20
  plume: number;     // 1-20
  charisme: number;  // 1-20
  hype: number;      // 0-100
  salary: number;    // €/semaine
  signingFee: number;
};

type Project = {
  artistId: string;
  type: "single" | "ep" | "album";
  title: string;
  weeksLeft: number;
  quality: number;   // calculée au lancement
  promo: number;     // budget promo réservé pour la sortie
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
  reputation: number; // 0-100
  roster: Artist[];
  market: Artist[];
  project: Project | null;
  releases: Release[];
  messages: Message[];
  rivals: Rival[];
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
  const talent = rnd(0.35, 0.95); // niveau global caché — influence toutes les stats
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
    gameOver: null,
    scoreSaved: false,
  };
}

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
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

// ---------- Simulation d'une semaine ----------

const EVENTS: { title: string; body: (s: GameState) => string; apply: (s: GameState) => void }[] = [
  {
    title: "Offre de concert",
    body: () => "Une salle propose une date à ton artiste principal. Cachet encaissé.",
    apply: (s) => { const gain = ri(1500, 4500); s.cash += gain; },
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
  s.week += 1;

  // 1. Projet en cours
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

  // 2. Sorties existantes — streams, revenus, déclin
  let weekRevenue = 0;
  for (const r of s.releases) {
    r.weeksOut += 1;
    r.totalStreams += r.weeklyStreams;
    weekRevenue += r.weeklyStreams * 0.0032; // ~3,2 € / 1000 streams
    const decay = 0.68 + Math.min(0.18, r.promo / 60000) + Math.min(0.08, r.quality / 300);
    r.weeklyStreams = Math.round(r.weeklyStreams * decay);
  }
  s.releases = s.releases.filter((r) => r.weeklyStreams > 200);
  s.cash += weekRevenue;

  // 3. Salaires
  const salaries = s.roster.reduce((sum, a) => sum + a.salary, 0);
  s.cash -= salaries;

  // 4. Hype — décroît doucement sans actualité
  for (const a of s.roster) a.hype = Math.max(0, a.hype - 2);

  // 5. Rivaux — marche aléatoire
  for (const r of s.rivals) {
    r.streams = Math.max(20000, Math.round(r.streams * rnd(0.85, 1.18)));
  }

  // 6. Réputation — tirée par la meilleure sortie du moment face aux rivaux
  const best = s.releases[0]?.weeklyStreams ?? 0;
  const beaten = s.rivals.filter((r) => best > r.streams).length;
  s.reputation = Math.max(0, Math.min(100, s.reputation + (beaten >= 5 ? 3 : beaten >= 2 ? 1 : best > 0 ? 0 : -1)));

  // 7. Événement aléatoire (si roster non vide)
  if (s.roster.length > 0 && Math.random() < 0.4) {
    const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    ev.apply(s);
    s.messages.unshift({ id: nextId(), week: s.week, title: ev.title, body: ev.body(s) });
  }

  // 8. Marché — rotation d'un prospect de temps en temps
  if (Math.random() < 0.3) {
    const used = new Set([...s.roster, ...s.market].map((a) => a.name));
    s.market = [...s.market.slice(1), makeArtist(used)];
  }

  s.messages = s.messages.slice(0, 12);

  // 9. Fin de partie
  if (s.cash < 0) s.gameOver = "bankrupt";
  else if (s.week > SEASON_WEEKS) s.gameOver = "season_end";

  return s;
}

// ---------- UI ----------

type Tab = "label" | "artistes" | "studio" | "charts";

function StatBar({ label, value, max = 20 }: { label: string; value: number; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase text-ink-faint w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full bg-gold rounded-full" style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="font-mono text-[11px] text-ink-muted w-6 text-right">{value}</span>
    </div>
  );
}

export default function ArtistsManagerPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [tab, setTab] = useState<Tab>("label");
  // Formulaire studio
  const [projArtist, setProjArtist] = useState<string>("");
  const [projType, setProjType] = useState<Project["type"]>("single");
  // Annotation <number> explicite — BUDGET_PRESETS est en `as const`, donc sans elle
  // TypeScript infère le type LITTÉRAL (5000, pas number) et refuse ensuite set(p.v).
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

  // Score final — envoyé UNE fois quand la partie se termine
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

  const chart = useMemo(() => {
    if (!state) return [];
    const entries = [
      ...state.rivals.map((r) => ({ name: r.name, streams: r.streams, mine: false, title: null as string | null })),
      ...state.releases.map((r) => ({ name: r.artistName, streams: r.weeklyStreams, mine: true, title: r.title })),
    ];
    return entries.sort((a, b) => b.streams - a.streams).slice(0, 10);
  }, [state]);

  if (!state) {
    return <div className="h-64 flex items-center justify-center text-ink-faint text-sm font-mono">Chargement du label...</div>;
  }

  // ----- Écran de fin -----
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
    const skill = (artist.flow + artist.plume) / 2; // /20
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-40">
      {/* Barre du haut — semaine, trésorerie, réputation, CONTINUER (le bouton FM) */}
      <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 nav-panel flex items-center gap-3">
        <a href="/jouer" aria-label="Tous les jeux" className="shrink-0 text-ink-faint hover:text-ink">
          <ArrowLeft size={18} />
        </a>
        <div className="min-w-0 flex-1">
          <p className="font-impact text-sm uppercase leading-none">Semaine {state.week}<span className="text-ink-faint">/{SEASON_WEEKS}</span></p>
          <p className="font-mono text-[10px] text-ink-faint mt-0.5 truncate">
            <Wallet size={9} className="inline mr-1" />{fmt(state.cash)} €
            <Star size={9} className="inline ml-2 mr-1 text-gold" />Rép. {Math.round(state.reputation)}
          </p>
        </div>
        <BorderMagicButton onClick={continueWeek} size="sm">
          Continuer <ChevronRight size={14} />
        </BorderMagicButton>
      </div>

      {/* ---- Onglet LABEL (dashboard) ---- */}
      {tab === "label" && (
        <div className="pt-5 space-y-5">
          {/* Projet en cours */}
          <div className="glass-strong rounded-2xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-wide text-gold mb-2 flex items-center gap-1.5">
              <Disc3 size={11} /> Projet en cours
            </p>
            {state.project && projectArtist ? (
              <div>
                <p className="font-display font-semibold">« {state.project.title} » — {projectArtist.name}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {TYPE_META[state.project.type].label} · sortie dans {state.project.weeksLeft} semaine{state.project.weeksLeft > 1 ? "s" : ""}
                </p>
                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-gold rounded-full transition-all"
                    style={{ width: `${(1 - state.project.weeksLeft / TYPE_META[state.project.type].weeks) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-faint">
                Aucun projet en studio.{" "}
                <button onClick={() => setTab("studio")} className="text-gold hover:text-glow">Lancer une prod →</button>
              </p>
            )}
          </div>

          {/* Sorties actives */}
          {state.releases.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="font-mono text-[10px] uppercase tracking-wide text-gold mb-3">Sorties actives</p>
              <div className="space-y-2.5">
                {state.releases.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">« {r.title} » — {r.artistName}</p>
                      <p className="font-mono text-[10px] text-ink-faint">{fmt(r.totalStreams)} streams cumulés</p>
                    </div>
                    <span className="font-mono text-xs text-gold shrink-0">{fmt(r.weeklyStreams)}/sem</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coûts hebdo */}
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">Salaires hebdo</p>
            <p className="font-mono text-sm text-riseNeg">-{fmt(weeklyCosts)} €</p>
          </div>

          {/* Boîte de réception */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-gold mb-3 flex items-center gap-1.5">
              <Inbox size={11} /> Messages
            </p>
            <div className="space-y-2">
              {state.messages.map((m) => (
                <div key={m.id} className="glass rounded-xl px-4 py-3">
                  <p className="text-sm font-medium flex items-baseline gap-2">
                    {m.title}
                    <span className="font-mono text-[9px] text-ink-faint shrink-0">S{m.week}</span>
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{m.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- Onglet ARTISTES ---- */}
      {tab === "artistes" && (
        <div className="pt-5 space-y-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-gold mb-3">Ton roster ({state.roster.length})</p>
            {state.roster.length === 0 ? (
              <p className="text-sm text-ink-faint glass rounded-2xl p-4">Personne pour l'instant — signe ton premier artiste ci-dessous.</p>
            ) : (
              <div className="space-y-3">
                {state.roster.map((a) => (
                  <div key={a.id} className="glass-strong rounded-2xl p-4">
                    <div className="flex items-baseline justify-between mb-3">
                      <p className="font-display font-semibold">{a.name}</p>
                      <span className="font-mono text-[10px] text-ink-faint">{a.style} · {fmt(a.salary)} €/sem</span>
                    </div>
                    <div className="space-y-1.5">
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
            <p className="font-mono text-[10px] uppercase tracking-wide text-gold mb-3">Sur le marché</p>
            <div className="space-y-3">
              {state.market.map((a) => {
                const affordable = state.cash >= a.signingFee;
                return (
                  <div key={a.id} className="glass rounded-2xl p-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="font-display font-semibold">{a.name}</p>
                      <span className="font-mono text-[10px] text-ink-faint">{a.style}</span>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      <StatBar label="Flow" value={a.flow} />
                      <StatBar label="Plume" value={a.plume} />
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
                      Signer — {fmt(a.signingFee)} € {!affordable && "(fonds insuffisants)"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---- Onglet STUDIO ---- */}
      {tab === "studio" && (
        <div className="pt-5 space-y-5">
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
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-gold mb-2">Artiste</p>
                <div className="flex gap-2 flex-wrap">
                  {state.roster.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setProjArtist(a.id)}
                      className={`filter-pill ${projArtist === a.id ? "is-active" : ""}`}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-gold mb-2">Format</p>
                <div className="flex gap-2">
                  {(Object.keys(TYPE_META) as Project["type"][]).map((t) => (
                    <button key={t} onClick={() => setProjType(t)} className={`filter-pill ${projType === t ? "is-active" : ""}`}>
                      {TYPE_META[t].label} · {TYPE_META[t].weeks} sem
                    </button>
                  ))}
                </div>
              </div>

              {(["studio", "clip", "promo"] as const).map((k) => {
                const value = k === "studio" ? projStudio : k === "clip" ? projClip : projPromo;
                const set: Dispatch<SetStateAction<number>> =
                  k === "studio" ? setProjStudio : k === "clip" ? setProjClip : setProjPromo;
                return (
                  <div key={k}>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-gold mb-2">
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

              <div className="glass rounded-2xl p-4 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase text-ink-faint">Coût total</p>
                <p className={`font-mono text-sm ${state.cash >= projStudio + projClip + projPromo ? "text-ink" : "text-riseNeg"}`}>
                  {fmt(projStudio + projClip + projPromo)} € / {fmt(state.cash)} € dispo
                </p>
              </div>

              <BorderMagicButton
                onClick={startProject}
                fullWidth
                size="lg"
                disabled={!projArtist || state.cash < projStudio + projClip + projPromo}
              >
                Lancer la prod
              </BorderMagicButton>
            </>
          )}
        </div>
      )}

      {/* ---- Onglet CHARTS ---- */}
      {tab === "charts" && (
        <div className="pt-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-gold mb-3">Top streams — semaine {state.week}</p>
          <div className="card divide-y divide-white/8 overflow-hidden">
            {chart.map((e, i) => (
              <div key={e.name + i} className={`flex items-center gap-3 py-3 px-4 ${e.mine ? "bg-gold/8" : ""}`}>
                <span className="font-impact text-lg w-6 text-center text-ink-faint">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${e.mine ? "text-gold" : ""}`}>
                    {e.name}{e.title ? ` — « ${e.title} »` : ""}
                  </p>
                  {e.mine && <p className="font-mono text-[9px] text-gold/70 uppercase">Ton label</p>}
                </div>
                <span className="font-mono text-xs text-ink-muted shrink-0">{fmt(e.streams)}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ink-faint font-mono mt-4">
            Bats les rivaux pour faire grimper ta réputation. Artistes et chiffres simulés.
          </p>
        </div>
      )}

      {/* Tab bar bas — mobile-first, façon app */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 nav-panel"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-2xl mx-auto grid grid-cols-4">
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
