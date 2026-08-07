"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Wallet, Star, Users, Disc3, BarChart3, Inbox, ChevronRight,
  RotateCcw, TrendingUp, TrendingDown, Minus, Radio, CalendarClock, CheckCircle2, Circle,
  MapPin, User, Building2, LayoutDashboard, UserPlus, PiggyBank, LineChart, Briefcase,
  Mic2, AlertCircle, XCircle, Handshake, Sparkles,
} from "lucide-react";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import { sfx } from "@/lib/sfx";

import type { Artist, BudgetKey, GameState, Person, Profile, Project, StaffRole, Tab } from "@/lib/am26/types";
import {
  BUDGET_GROUPS, BUDGET_LABELS, BUDGET_PRESETS, CITIES, COLORS, DEFAULT_BUDGET_CHOICE,
  LOGOS, PROJECT_TITLES, SEASON_WEEKS, STAFF_ROLES, STAFF_ROLE_KEYS, STAFF_SEVERANCE_WEEKS,
  START_CASH, STREAM_RATE, STYLES, TYPE_META,
} from "@/lib/am26/data";
import { fullName, nextId, personalityDesc } from "@/lib/am26/people";
import {
  acceptConcert, acceptCounter, acceptanceHint, advanceWeek, budgetTotalCost, computeChart,
  computeProductionStats, declineConcert, declineCounter, fireStaff, fmt, initialState,
  load, makeOffer, persist, staffByRole, staffWeeklyCost,
} from "@/lib/am26/engine";

/*
 * ARTISTS MANAGER 2026 — v6 : refonte "simulation systémique".
 *
 * Le moteur vit désormais dans lib/am26/ (types, data, people, world, engine) —
 * ce fichier ne contient plus que l'interface. Nouveautés v6 :
 *  - Onglet STAFF : recruter de vraies personnes simulées (âge, ville, expérience,
 *    réputation, personnalité, niveau estimé en fourchette — le vrai niveau est
 *    caché), négocier le salaire (réponse à la semaine suivante, contre-offres),
 *    licencier (indemnité). Chaque poste a un effet mécanique distinct.
 *  - MONDE VIVANT : les labels rivaux signent des talents sur TON marché,
 *    débauchent des candidats, sortent des projets. Les tendances de styles
 *    montent et descendent (visibles dans Charts, impact réel sur les sorties).
 *  - DOSSIERS À TRAITER sur le dashboard : offres de concert à accepter/refuser,
 *    contre-propositions salariales — plus d'événements aléatoires scriptés.
 *  - Les artistes ont un POTENTIEL CACHÉ (fourchette affichée) et peuvent
 *    progresser — signer, c'est parier.
 *
 * Sauvegardes < v6 : reset propre (structure du moteur incompatible), ancienne
 * sauvegarde archivée dans une clé de secours, écran d'explication au premier
 * chargement.
 */

// ---------- Navigation ----------

const MENU: { id: Tab; label: string; Icon: typeof Wallet; mobile: boolean }[] = [
  { id: "label", label: "Dashboard", Icon: LayoutDashboard, mobile: true },
  { id: "artistes", label: "Artistes", Icon: Users, mobile: true },
  { id: "marche", label: "Marché", Icon: UserPlus, mobile: false },
  { id: "staff", label: "Staff", Icon: Briefcase, mobile: false },
  { id: "studio", label: "Studio", Icon: Disc3, mobile: true },
  { id: "charts", label: "Charts", Icon: BarChart3, mobile: true },
  { id: "messages", label: "Messages", Icon: Inbox, mobile: false },
  { id: "finances", label: "Finances", Icon: PiggyBank, mobile: false },
  { id: "stats", label: "Stats", Icon: LineChart, mobile: false },
];

// ---------- Petits composants UI ----------

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

// Fourchette (potentiel/niveau estimé) — matérialise l'incertitude du scouting.
function RangeBar({ label, range, max = 20, color = "#F0001C" }: { label: string; range: [number, number]; max?: number; color?: string }) {
  const [lo, hi] = range;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase text-ink-faint w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden relative">
        <div
          className="absolute inset-y-0 rounded-full opacity-90"
          style={{
            left: `${(lo / max) * 100}%`,
            width: `${Math.max(4, ((hi - lo) / max) * 100)}%`,
            background: `linear-gradient(90deg, ${color}55, ${color})`,
          }}
        />
      </div>
      <span className="font-mono text-[11px] text-ink-muted w-10 text-right">{lo}-{hi}</span>
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

// ---------- Tutoriel (5 écrans, v6) ----------

const TUTO_STEPS = [
  {
    title: "Bienvenue au label 👋",
    body: (p: Profile) => `${p.pseudo}, te voilà à la tête de ${p.labelName} (${p.city}). Ici, tout est simulé : les gens, la concurrence, les tendances. Tes décisions font vivre ou couler le label.`,
  },
  {
    title: "Un monde qui vit sans toi",
    body: () => "Les labels rivaux scoutent, signent et sortent des projets pendant que tu réfléchis. Un talent que tu hésites à signer peut partir chez eux. Les styles montent et descendent — surveille les tendances dans Charts.",
  },
  {
    title: "Ton staff, tes armes",
    body: () => "Dans l'onglet Staff, recrute de vraies personnes simulées : DA, attaché de presse, booker... Leur niveau exact est caché (fourchette estimée), leur salaire se négocie, et chaque poste a un effet concret sur le jeu.",
  },
  {
    title: "Le bouton Continuer",
    body: () => "Il fait avancer d'une semaine — mais il ne fait qu'exécuter ce que tu as préparé : réponses aux offres, prods qui avancent, négos qui se résolvent. Les dossiers à traiter t'attendent sur le dashboard.",
  },
  {
    title: "Ton objectif",
    body: () => "Signe, produis, entoure-toi, encaisse les concerts, bats les rivaux. Trésorerie négative = faillite. Tiens les 52 semaines — ta checklist \"Premiers pas\" t'attend sur le dashboard.",
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

// ---------- Écran de reset (sauvegarde < v6) ----------

function ResetNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 pb-8 sm:pb-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative nav-panel rounded-3xl p-6 max-w-sm w-full solved-pop">
        <p className="font-mono text-[10px] uppercase tracking-wide text-gold mb-3 flex items-center gap-1.5">
          <Sparkles size={11} /> Mise à jour majeure
        </p>
        <h2 className="font-impact text-xl uppercase mb-2">Le jeu a changé de dimension</h2>
        <p className="text-sm text-ink-muted leading-relaxed mb-3">
          Artists Manager est devenu une vraie simulation : staff à recruter et à négocier,
          labels rivaux qui agissent, tendances qui évoluent, potentiels cachés...
        </p>
        <p className="text-sm text-ink-muted leading-relaxed mb-6">
          Ton ancienne partie n'était pas compatible avec ce nouveau moteur — une nouvelle
          carrière démarre. Bonne nouvelle : tout ce que tu vas construire ici compte vraiment.
        </p>
        <BorderMagicButton onClick={onDismiss} fullWidth size="lg">
          Découvrir la nouvelle version <ArrowRight size={16} />
        </BorderMagicButton>
      </div>
    </div>
  );
}

// ---------- Page ----------

export default function ArtistsManagerPage() {
  const [state, setState] = useState<GameState | null>(null);
  const [showResetNotice, setShowResetNotice] = useState(false);
  const [tab, setTab] = useState<Tab>("label");
  const [projArtist, setProjArtist] = useState<string>("");
  const [projType, setProjType] = useState<Project["type"]>("single");
  // Choix de budget stockés comme INDICES (number générique) — jamais les objets
  // BudgetOption ni des littéraux `as const` (piège des types littéraux déjà vécu).
  const [budgetChoice, setBudgetChoice] = useState<Record<BudgetKey, number>>(DEFAULT_BUDGET_CHOICE);
  const selectBudget = (key: BudgetKey, idx: number) => setBudgetChoice((prev) => ({ ...prev, [key]: idx }));
  // Onglet Staff : filtre de rôle + candidat dont le panneau d'offre est ouvert +
  // confirmation de licenciement (double appui).
  const [roleFilter, setRoleFilter] = useState<StaffRole | "tous">("tous");
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [confirmFireId, setConfirmFireId] = useState<string | null>(null);

  useEffect(() => {
    const { state: loaded, resetFromOldSave } = load();
    setState(loaded ?? initialState());
    if (resetFromOldSave) setShowResetNotice(true);
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
      <>
        {showResetNotice && <ResetNotice onDismiss={() => setShowResetNotice(false)} />}
        <Onboarding
          onDone={(p) => {
            sfx.victory();
            update({
              ...state,
              profile: p,
              messages: [{
                id: nextId(), week: state.week, title: `${p.labelName} ouvre ses portes`,
                body: `${p.pseudo}, tu démarres à ${p.city} avec ${fmt(START_CASH)} €. Signe, produis, recrute ton staff — et garde un œil sur les rivaux : eux n'attendront pas. Faillite = fin de partie.`,
              }, ...state.messages].slice(0, 16),
            });
          }}
        />
      </>
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
            <p className="font-mono text-[10px] uppercase text-ink-faint mb-1">Streams carrière</p>
            <p className="font-impact text-3xl">{fmt(state.totalStreamsAllTime)}</p>
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
    update({
      ...state,
      cash: state.cash - artist.signingFee,
      roster: [...state.roster, artist],
      market: state.market.filter((a) => a.id !== artist.id),
      messages: [{
        id: nextId(), week: state.week, title: `${artist.name} rejoint ${state.profile!.labelName}`,
        body: `Prime de signature : ${fmt(artist.signingFee)} €. Salaire : ${fmt(artist.salary)} €/semaine. Potentiel estimé : ${artist.shownPotential[0]}-${artist.shownPotential[1]} — le vrai plafond, tu le découvriras au travail.`,
      }, ...state.messages].slice(0, 16),
    });
  }

  function startProject() {
    if (!state || state.project) return;
    const artist = state.roster.find((a) => a.id === projArtist);
    if (!artist) return;
    const cost = budgetTotalCost(budgetChoice);
    if (state.cash < cost) return;
    sfx.click();
    const meta = TYPE_META[projType];
    const stats = computeProductionStats(artist, budgetChoice, projType, state.staff);
    const title = PROJECT_TITLES[Math.floor(Math.random() * PROJECT_TITLES.length)];
    update({
      ...state,
      cash: state.cash - cost,
      project: { artistId: artist.id, type: projType, title, weeksLeft: meta.weeks, ...stats },
      messages: [{
        id: nextId(), week: state.week, title: `Studio : « ${title} »`,
        body: `${artist.name} entre en studio (${meta.label.toLowerCase()}, ${meta.weeks} semaines). Budget engagé : ${fmt(cost)} €.`,
      }, ...state.messages].slice(0, 16),
    });
    setTab("label");
  }

  function continueWeek() {
    if (!state) return;
    sfx.click();
    setConfirmFireId(null);
    setOfferFor(null);
    update(advanceWeek(state));
  }

  const projectArtist = state.project ? state.roster.find((a) => a.id === state.project!.artistId) : null;
  const rosterCosts = state.roster.reduce((sum, a) => sum + a.salary, 0);
  const staffCosts = staffWeeklyCost(state.staff);
  const weeklyCosts = rosterCosts + staffCosts;
  const totalCost = budgetTotalCost(budgetChoice);
  const previewArtist = state.roster.find((a) => a.id === projArtist);
  const preview = previewArtist ? computeProductionStats(previewArtist, budgetChoice, projType, state.staff) : null;
  const accent = profile.color;

  const counteredNegos = state.negotiations.filter((n) => n.status === "countered");
  const pendingNegos = state.negotiations.filter((n) => n.status === "pending");
  const todoCount = state.concertOffers.length + counteredNegos.length;

  // Checklist "Premiers pas" — auto-cochée selon la progression réelle
  const firstSteps = [
    { label: "Signer ton premier artiste", done: state.roster.length > 0, go: () => setTab("marche") },
    { label: "Recruter un premier membre du staff", done: state.staff.length > 0 || state.negotiations.length > 0, go: () => setTab("staff") },
    { label: "Lancer une première prod", done: state.project !== null || state.releases.length > 0, go: () => setTab("studio") },
    { label: "Passer ta première semaine", done: state.week > 1, go: continueWeek },
  ];
  const allStepsDone = firstSteps.every((s) => s.done);

  // Candidats affichés (filtre de rôle) + rôles occupés
  const filteredCandidates = state.staffMarket.filter((p) => roleFilter === "tous" || p.role === roleFilter);
  const filledRoles = new Set(state.staff.map((p) => p.role));

  const offerOptionsFor = (p: Person) => [
    { label: "Serré", v: Math.max(50, Math.round((p.askSalary * 0.85) / 10) * 10) },
    { label: "Demandé", v: p.askSalary },
    { label: "Généreux", v: Math.round((p.askSalary * 1.15) / 10) * 10 },
  ];
  const hintLabel = (p: number) => (p < 0.25 ? "faible" : p < 0.6 ? "moyenne" : "élevée");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-44 lg:pb-16">
      {showResetNotice && <ResetNotice onDismiss={() => setShowResetNotice(false)} />}

      {/* Tutoriel — une seule fois, après l'onboarding */}
      {!state.tutorialDone && !showResetNotice && (
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
                {id === "staff" && counteredNegos.length > 0 && (
                  <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: accent }}>
                    {counteredNegos.length}
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
            {id === "staff" && counteredNegos.length > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: accent }}>
                {counteredNegos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== Onglet LABEL ===== */}
      {tab === "label" && (
        <div className="pt-4 space-y-4">
          {/* Dossiers à traiter — le cœur de la boucle v6 : de vraies décisions,
              pas des événements subis. */}
          {todoCount > 0 && (
            <SectionCard title={`À traiter (${todoCount})`} icon={<AlertCircle size={11} />}>
              <div className="space-y-3">
                {state.concertOffers.map((o) => (
                  <div key={o.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-start gap-2.5">
                      <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}1f`, color: accent }}>
                        <Mic2 size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Concert — {o.artistName}</p>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {o.venue}, {o.cityName} · cachet <span className="text-risePos font-semibold">{fmt(o.fee)} €</span> · expire S{o.expiresWeek}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={() => { sfx.correct(); update(acceptConcert(state, o.id)); }}
                        className="flex-1 rounded-xl py-2 text-xs font-semibold border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                      >
                        Accepter la date
                      </button>
                      <button
                        onClick={() => { sfx.click(); update(declineConcert(state, o.id)); }}
                        className="rounded-xl px-4 py-2 text-xs font-semibold border border-white/10 text-ink-muted hover:text-ink transition-colors"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
                {counteredNegos.map((n) => {
                  const person = state.staffMarket.find((p) => p.id === n.personId);
                  if (!person || n.counter === null) return null;
                  return (
                    <div key={n.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-start gap-2.5">
                        <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}1f`, color: accent }}>
                          <Handshake size={13} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">Contre-proposition — {fullName(person)}</p>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {STAFF_ROLES[person.role].label} · demande <span className="text-gold font-semibold">{fmt(n.counter)} €/sem</span> (ton offre : {fmt(n.offer)} €)
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2.5">
                        <button
                          onClick={() => { sfx.correct(); update(acceptCounter(state, n.id)); }}
                          className="flex-1 rounded-xl py-2 text-xs font-semibold border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                        >
                          Accepter — {fmt(n.counter)} €/sem
                        </button>
                        <button
                          onClick={() => { sfx.click(); update(declineCounter(state, n.id)); }}
                          className="rounded-xl px-4 py-2 text-xs font-semibold border border-white/10 text-ink-muted hover:text-ink transition-colors"
                        >
                          Abandonner
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

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
              ) : pendingNegos.length > 0 ? (
                <p className="text-sm">
                  {pendingNegos.length} négociation{pendingNegos.length > 1 ? "s" : ""} d'embauche en attente
                  <span className="block font-mono text-[11px] text-gold mt-1">Réponse à la prochaine semaine</span>
                </p>
              ) : (
                <p className="text-sm text-ink-faint">Rien de planifié.</p>
              )}
              <p className="font-mono text-[10px] text-ink-faint mt-3 pt-3 border-t border-white/8">
                Salaires hebdo : <span className="text-riseNeg">-{fmt(weeklyCosts)} €</span>
                {staffCosts > 0 && <span className="block mt-0.5">dont staff : -{fmt(staffCosts)} €</span>}
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
                      {e.name}{e.title ? ` — ${e.title}` : ""}
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
                      <RangeBar label="Potentiel" range={a.shownPotential} color={accent} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-ink-faint font-mono mt-4">
              Le potentiel affiché est une estimation — le vrai plafond de chaque artiste est caché. Le travail (et le temps) le révèlent.
            </p>
          </div>
        </div>
      )}

      {/* ===== Onglet MARCHÉ (recrutement d'artistes) ===== */}
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
                      <RangeBar label="Potentiel" range={a.shownPotential} color={accent} />
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
            Les labels rivaux scoutent le même marché que toi — un talent qui traîne ici peut signer ailleurs. Le potentiel est une fourchette : signer, c'est parier.
          </p>
        </div>
      )}

      {/* ===== Onglet STAFF (v6 — recrutement de personnes simulées) ===== */}
      {tab === "staff" && (
        <div className="pt-4 space-y-5">
          {/* Mon équipe : les 6 postes, occupés ou vacants */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-3">Mon équipe</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {STAFF_ROLE_KEYS.map((role) => {
                const person = staffByRole(state.staff, role);
                const meta = STAFF_ROLES[role];
                if (!person) {
                  return (
                    <div key={role} className="glass rounded-2xl p-4 border border-dashed border-white/12">
                      <p className="font-mono text-[10px] uppercase text-ink-faint">{meta.label}</p>
                      <p className="text-xs text-ink-faint mt-1.5 leading-relaxed">{meta.effect}</p>
                      <button
                        onClick={() => { setRoleFilter(role); sfx.click(); }}
                        className="mt-3 text-xs font-semibold text-gold hover:text-glow"
                      >
                        Voir les candidats →
                      </button>
                    </div>
                  );
                }
                return (
                  <div key={role} className="glass-strong rounded-2xl overflow-hidden">
                    <div className="px-4 py-3" style={{ background: `linear-gradient(135deg, ${accent}45, ${accent}10)` }}>
                      <p className="font-mono text-[9px] uppercase text-ink-muted">{meta.label}</p>
                      <p className="font-impact text-base uppercase leading-tight mt-0.5">{fullName(person)}</p>
                      <p className="font-mono text-[10px] text-ink-muted mt-1">
                        {person.age} ans · {person.city} · {fmt(person.askSalary)} €/sem
                      </p>
                    </div>
                    <div className="p-4">
                      <div className="space-y-1.5 mb-3">
                        <RangeBar label="Niveau" range={person.shownSkill} color={accent} />
                        <StatBar label="Réput." value={person.reputation} max={100} color={accent} />
                      </div>
                      <p className="text-[11px] text-ink-muted leading-relaxed mb-1">{meta.effect}</p>
                      <p className="text-[11px] text-ink-faint mb-3">
                        {person.personality} — {personalityDesc(person.personality)}
                        {person.styleAffinity ? ` Affinité : ${person.styleAffinity}.` : ""}
                      </p>
                      {confirmFireId === person.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => { sfx.click(); setConfirmFireId(null); update(fireStaff(state, person.id)); }}
                            className="flex-1 rounded-xl py-2 text-xs font-semibold border border-signal/60 bg-signal/15 text-glow hover:bg-signal/25 transition-colors"
                          >
                            Confirmer — {fmt(person.askSalary * STAFF_SEVERANCE_WEEKS)} € d'indemnité
                          </button>
                          <button
                            onClick={() => setConfirmFireId(null)}
                            className="rounded-xl px-3 py-2 text-xs font-semibold border border-white/10 text-ink-muted hover:text-ink"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmFireId(person.id)}
                          className="text-[11px] font-mono uppercase text-ink-faint hover:text-glow inline-flex items-center gap-1"
                        >
                          <XCircle size={11} /> Licencier
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recrutement : filtres par rôle + candidats */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-3">Candidats sur le marché</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" style={{ scrollbarWidth: "none" }}>
              <button onClick={() => setRoleFilter("tous")} className={`filter-pill shrink-0 ${roleFilter === "tous" ? "is-active" : ""}`}>
                Tous
              </button>
              {STAFF_ROLE_KEYS.map((role) => (
                <button key={role} onClick={() => setRoleFilter(role)} className={`filter-pill shrink-0 ${roleFilter === role ? "is-active" : ""}`}>
                  {STAFF_ROLES[role].short}
                </button>
              ))}
            </div>

            {filteredCandidates.length === 0 ? (
              <p className="text-sm text-ink-faint glass rounded-2xl p-4 mt-3">
                Aucun candidat {roleFilter !== "tous" ? `${STAFF_ROLES[roleFilter].short} ` : ""}disponible cette semaine — le marché tourne, reviens plus tard.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                {filteredCandidates.map((p) => {
                  const nego = state.negotiations.find((n) => n.personId === p.id);
                  const roleTaken = filledRoles.has(p.role);
                  const meta = STAFF_ROLES[p.role];
                  return (
                    <div key={p.id} className="glass rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/8">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-impact text-base uppercase leading-tight">{fullName(p)}</p>
                          <span className="font-mono text-[9px] uppercase text-ink-faint shrink-0">
                            dispo {p.availabilityWeeks} sem
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-ink-muted mt-1">
                          {meta.label} · {p.age} ans · {p.city} · {p.expYears} ans d'exp.
                        </p>
                      </div>
                      <div className="p-4">
                        <div className="space-y-1.5 mb-3">
                          <RangeBar label="Niveau" range={p.shownSkill} color={accent} />
                          <StatBar label="Réput." value={p.reputation} max={100} color={accent} />
                        </div>
                        <p className="text-[11px] text-ink-muted leading-relaxed mb-1">{meta.effect}</p>
                        <p className="text-[11px] text-ink-faint mb-3">
                          {p.personality} — {personalityDesc(p.personality)}
                          {p.styleAffinity ? ` Affinité : ${p.styleAffinity}.` : ""}
                        </p>
                        <p className="font-mono text-[11px] text-ink-muted mb-3">
                          Salaire demandé : <span className="text-gold font-semibold">{fmt(p.askSalary)} €/sem</span>
                        </p>

                        {roleTaken ? (
                          <p className="text-[11px] text-ink-faint font-mono">
                            Poste déjà occupé — libère-le pour recruter ici.
                          </p>
                        ) : nego && nego.status === "pending" ? (
                          <p className="text-xs text-gold font-medium flex items-center gap-1.5">
                            <Handshake size={13} /> Offre envoyée ({fmt(nego.offer)} €/sem) — réponse à la prochaine semaine.
                          </p>
                        ) : nego && nego.status === "countered" && nego.counter !== null ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => { sfx.correct(); update(acceptCounter(state, nego.id)); }}
                              className="flex-1 rounded-xl py-2 text-xs font-semibold border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                            >
                              Accepter {fmt(nego.counter)} €/sem
                            </button>
                            <button
                              onClick={() => { sfx.click(); update(declineCounter(state, nego.id)); }}
                              className="rounded-xl px-3 py-2 text-xs font-semibold border border-white/10 text-ink-muted hover:text-ink"
                            >
                              Non
                            </button>
                          </div>
                        ) : offerFor === p.id ? (
                          <div>
                            <p className="font-mono text-[9px] uppercase text-ink-faint mb-2">Ton offre (€/semaine)</p>
                            <div className="flex gap-2 flex-wrap">
                              {offerOptionsFor(p).map((opt) => (
                                <button
                                  key={opt.label}
                                  onClick={() => { sfx.click(); setOfferFor(null); update(makeOffer(state, p.id, opt.v)); }}
                                  className="filter-pill"
                                >
                                  {opt.label} · {fmt(opt.v)} €
                                  <span className="ml-1 text-[9px] text-ink-faint">
                                    ({hintLabel(acceptanceHint(p, opt.v, state.reputation))})
                                  </span>
                                </button>
                              ))}
                            </div>
                            <button onClick={() => setOfferFor(null)} className="mt-2 text-[10px] font-mono uppercase text-ink-faint hover:text-ink">
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { sfx.click(); setOfferFor(p.id); }}
                            className="w-full rounded-xl py-2.5 text-sm font-semibold border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                          >
                            Faire une offre
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-ink-faint font-mono mt-4">
              Le niveau affiché est une fourchette — le vrai se découvre en poste. Les candidats ont une disponibilité limitée, et les rivaux recrutent aussi. Entre parenthèses : chance estimée que l'offre soit acceptée.
            </p>
          </div>
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
                {previewArtist && (
                  <p className="font-mono text-[10px] text-ink-faint mt-3">
                    Tendance {previewArtist.style} :{" "}
                    <span className={
                      (state.trends[previewArtist.style] ?? 1) >= 1.15 ? "text-risePos" :
                      (state.trends[previewArtist.style] ?? 1) <= 0.85 ? "text-riseNeg" : "text-ink-muted"
                    }>
                      {Math.round((state.trends[previewArtist.style] ?? 1) * 100)} %
                    </span>{" "}
                    — impact direct sur le démarrage de la sortie.
                  </p>
                )}
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

              {BUDGET_GROUPS.map((group) => (
                <SectionCard key={group.title} title={group.title} icon={<Disc3 size={11} />}>
                  <div className="space-y-4">
                    {group.keys.map((k) => (
                      <div key={k}>
                        <p className="font-mono text-[10px] uppercase text-ink-faint mb-2">{BUDGET_LABELS[k]}</p>
                        <div className="flex gap-2 flex-wrap">
                          {BUDGET_PRESETS[k].map((opt, idx) => (
                            <button
                              key={opt.label}
                              onClick={() => selectBudget(k, idx)}
                              className={`filter-pill ${budgetChoice[k] === idx ? "is-active" : ""}`}
                            >
                              {opt.label} · {fmt(opt.v)} €
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              ))}

              {/* Aperçu en direct — inclut désormais les effets du staff en poste */}
              {preview && (
                <SectionCard title="Aperçu de la sortie" icon={<LineChart size={11} />}>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="font-mono text-[9px] uppercase text-ink-faint mb-1">Qualité</p>
                      <p className="font-impact text-xl">{preview.quality}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase text-ink-faint mb-1">Portée</p>
                      <p className="font-impact text-xl">{Math.round(preview.reach * 100)}%</p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase text-ink-faint mb-1">Chance presse</p>
                      <p className="font-impact text-xl">{Math.round(preview.mediaChance * 100)}%</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-ink-faint font-mono mt-3">
                    Qualité = classement + tenue dans le temps. Portée = combien de monde peut tomber dessus.
                    {state.staff.length > 0
                      ? " Ton staff en poste (DA, ingé son, marketing, presse) est déjà compté dans ces chiffres."
                      : " Un staff en poste (DA, ingé son, marketing, presse) améliorerait ces chiffres."}
                  </p>
                </SectionCard>
              )}

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
        <div className="pt-4 space-y-4">
          <div>
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
                        {e.name}{e.title ? ` — ${e.title}` : ""}
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

          {/* Tendances de styles — le monde évolue, adapte ta stratégie */}
          <SectionCard title="Tendances par style" icon={<TrendingUp size={11} />}>
            <div className="space-y-1.5">
              {[...STYLES]
                .sort((a, b) => (state.trends[b] ?? 1) - (state.trends[a] ?? 1))
                .map((style) => {
                  const t = state.trends[style] ?? 1;
                  return (
                    <div key={style} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase text-ink-faint w-16 shrink-0">{style}</span>
                      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (t / 1.5) * 100)}%`,
                            background: t >= 1.15
                              ? "linear-gradient(90deg, #1d5c40, #4CC38A)"
                              : t <= 0.85
                                ? "linear-gradient(90deg, #7A3A16, #E8894A)"
                                : `linear-gradient(90deg, #7A0F0F, ${accent})`,
                          }}
                        />
                      </div>
                      <span className={`font-mono text-[11px] w-10 text-right ${t >= 1.15 ? "text-risePos" : t <= 0.85 ? "text-riseNeg" : "text-ink-muted"}`}>
                        {Math.round(t * 100)}%
                      </span>
                    </div>
                  );
                })}
            </div>
            <p className="text-[11px] text-ink-faint font-mono mt-3">
              Multiplicateur appliqué au démarrage des sorties selon le style. Les tendances dérivent chaque semaine — un style en feu aujourd'hui peut s'essouffler demain.
            </p>
          </SectionCard>
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

      {/* ===== Onglet FINANCES ===== */}
      {tab === "finances" && (
        <div className="pt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {(() => {
              const revenue = weeklyStreams * STREAM_RATE;
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

          <SectionCard title="Masse salariale — artistes" icon={<Users size={11} />}>
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

          <SectionCard title="Masse salariale — staff" icon={<Briefcase size={11} />}>
            {state.staff.length === 0 ? (
              <p className="text-sm text-ink-faint">
                Aucun staff en poste —{" "}
                <button onClick={() => setTab("staff")} className="text-gold hover:text-glow">recruter →</button>
              </p>
            ) : (
              <div className="space-y-2">
                {state.staff.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <p className="text-sm truncate min-w-0">{fullName(p)} <span className="text-ink-faint">· {STAFF_ROLES[p.role].short}</span></p>
                    <span className="font-mono text-xs text-riseNeg shrink-0">-{fmt(p.askSalary)} €/sem</span>
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
                    <span className="font-mono text-xs text-risePos shrink-0">+{fmt(r.weeklyStreams * STREAM_RATE)} €/sem</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <p className="text-[11px] text-ink-faint font-mono">
            ~3,20 € pour 1 000 streams. Budgets studio débités au lancement, cachets de concert encaissés à l'acceptation, indemnité de licenciement = {STAFF_SEVERANCE_WEEKS} semaines de salaire.
          </p>
        </div>
      )}

      {/* ===== Onglet STATS ===== */}
      {tab === "stats" && (
        <div className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[
              { label: "Streams carrière", value: fmt(state.totalStreamsAllTime) },
              { label: "Sorties publiées", value: `${state.totalReleases}` },
              { label: "Concerts joués", value: `${state.totalConcerts}` },
              { label: "Équipe (staff)", value: `${state.staff.length}/${STAFF_ROLE_KEYS.length}` },
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
              Monte en battant les rivaux au classement, via les retombées presse... et un(e) bon(ne) attaché(e) de presse l'entretient chaque semaine.
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
