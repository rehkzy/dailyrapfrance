"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Wallet, Star, Users, Disc3, BarChart3, Inbox, ChevronRight,
  RotateCcw, TrendingUp, TrendingDown, Minus, Radio, CalendarClock, CheckCircle2, Circle,
  MapPin, User, Building2, LayoutDashboard, UserPlus, PiggyBank, LineChart, Briefcase,
  Mic2, AlertCircle, XCircle, Handshake, Sparkles, Target, Trophy, Calendar, Smartphone,
  Share2, Heart, MessageCircle, ShieldAlert, BookOpen, Lock,
} from "lucide-react";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import { sfx } from "@/lib/sfx";

import type { Artist, BudgetKey, GameState, LocationTier, Person, Profile, Project, SongStructure, StaffRole, Tab } from "@/lib/am26/types";
import {
  BPM_MAX, BPM_MIN, BUDGET_GROUPS, BUDGET_LABELS, BUDGET_PRESETS, CITIES, COLORS,
  CONTRACT_RENEWAL_WINDOW, DEFAULT_BUDGET_CHOICE, DROITS_RATE, FEATURING_FEE_RATE,
  FREEMIUM_STREAM_RATE, LIQUIDATION_FLOOR, LOAN_INTEREST,
  LOAN_MONTHS, LOAN_OFFERS, LOCATION_TIERS, LOGOS, MONTH_WEEKS, PREMIUM_STREAM_RATE, PROJECT_TITLES, PRO_KNOWLEDGE, PUSH_COST,
  PUSH_WINDOW_WEEKS, RADIO_RATE, SEASON_WEEKS, SONG_STRUCTURES, STAFF_ROLES, STAFF_ROLE_KEYS,
  STAFF_SEVERANCE_MONTHS, START_CASH, STREAM_RATE, STYLE_BPM, STYLES, TYPE_META, VAULT_RELEASE_COST,
} from "@/lib/am26/data";
import { fullName, nextId, personalityDesc } from "@/lib/am26/people";
import {
  acceptConcert, acceptCounter, acceptanceHint, advanceWeek, artistCareerProfile, artistContractValue,
  budgetTotalCost, catalogValue, computeAgenda, computeArtistChart, computeLabelChart,
  computeProductionStats, computeProjectChart, declineArtistIdea, declineConcert, declineCounter,
  effectiveBudgetCost, featuringCost, fireStaff, fmt, initialState, labelLegacy, load, makeOffer, persist,
  projectRiskLevel, pushRelease, releaseLifecycleStage, releaseVaultTrack, releaseWeeklyRevenue, resolveArtistDialogue,
  resolveChoice, sellArtistContract, sellCatalog, staffByRole, staffMonthlyCost, startProjectFromIdea, takeLoan, upgradeLocation,
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

const MENU: { id: Tab; label: string; Icon: typeof Wallet; mobile: boolean; group: string }[] = [
  // §10 — sidebar restructurée en sections professionnelles
  { id: "label", label: "Accueil", Icon: LayoutDashboard, mobile: true, group: "Principal" },
  { id: "artistes", label: "Artistes", Icon: Users, mobile: true, group: "Principal" },
  { id: "marche", label: "Scouting", Icon: UserPlus, mobile: false, group: "Principal" },
  { id: "studio", label: "Studio", Icon: Disc3, mobile: true, group: "Principal" },
  { id: "agenda", label: "Planning", Icon: Calendar, mobile: false, group: "Principal" },
  { id: "staff", label: "Équipe", Icon: Briefcase, mobile: false, group: "Business" },
  { id: "finances", label: "Finances", Icon: PiggyBank, mobile: false, group: "Business" },
  { id: "stats", label: "Analytics", Icon: LineChart, mobile: false, group: "Business" },
  { id: "messages", label: "Interactions", Icon: Inbox, mobile: false, group: "Communication" },
  { id: "telephone", label: "Téléphone", Icon: Smartphone, mobile: false, group: "Communication" },
  { id: "reseaux", label: "Réseaux", Icon: Share2, mobile: false, group: "Communication" },
  { id: "charts", label: "Charts", Icon: BarChart3, mobile: true, group: "Monde" },
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

// ---------- Onboarding (création de carrière) ----------

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
    <section className="fm-skin max-w-md mx-auto px-6 pt-10 pb-24">
      <a href="/jouer" className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide mb-8">
        <ArrowLeft size={14} /> Tous les jeux
      </a>

      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-2">Artists Manager 2026</p>
      <h1 className="font-impact text-3xl uppercase mb-1">Nouvelle carrière</h1>
      <p className="text-sm text-ink-muted mb-6">Crée ton identité de manager avant de te lancer.</p>

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
    body: () => "Signe, produis, entoure-toi, encaisse les concerts, bats les rivaux. La paie tombe chaque fin de mois — le découvert est possible (agios !) mais sous -20 000 €, c'est la liquidation. Prêt, ventes de contrats et cessions de catalogue peuvent te sauver. Tiens les 52 semaines.",
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

// v17 §4 — "Continuer" devient intelligent : impossible d'avancer tant qu'une
// discussion critique avec un artiste n'est pas tranchée.
function BlockedContinueNotice({ artistName, onDismiss }: { artistName: string; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 pb-8 sm:pb-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative nav-panel rounded-3xl p-6 max-w-sm w-full solved-pop">
        <p className="font-mono text-[10px] uppercase tracking-wide text-glow mb-3 flex items-center gap-1.5">
          <Lock size={11} /> Impossible d'avancer
        </p>
        <h2 className="font-impact text-xl uppercase mb-2">Une discussion t'attend</h2>
        <p className="text-sm text-ink-muted leading-relaxed mb-6">
          {artistName} a besoin d'une vraie réponse avant que la semaine puisse continuer — direction "À traiter" sur le dashboard.
        </p>
        <BorderMagicButton onClick={onDismiss} fullWidth size="lg">
          Voir la discussion <ArrowRight size={16} />
        </BorderMagicButton>
      </div>
    </div>
  );
}

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
  // v10 — création musicale construite : BPM, structure, featuring.
  const [projBpm, setProjBpm] = useState<number>(100);
  const [projStructure, setProjStructure] = useState<SongStructure>("classique");
  const [projFeaturing, setProjFeaturing] = useState<string>(""); // id d'un autre artiste du roster, "" = aucun
  const [projBeatmaker, setProjBeatmaker] = useState<string>(""); // v14 — id d'un beatmaker du marketplace, "" = aucun
  // Onglet Staff : filtre de rôle + candidat dont le panneau d'offre est ouvert +
  // confirmation de licenciement (double appui).
  const [roleFilter, setRoleFilter] = useState<StaffRole | "tous">("tous");
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [confirmFireId, setConfirmFireId] = useState<string | null>(null);
  // §5 — garde du temps : décisions en attente listées avant d'avancer la semaine.
  const [showContinueCheck, setShowContinueCheck] = useState(false);
  // Ventes (survie financière) — double confirmation pour éviter les fausses manips.
  const [confirmSellArtistId, setConfirmSellArtistId] = useState<string | null>(null);
  const [confirmSellReleaseId, setConfirmSellReleaseId] = useState<string | null>(null);
  // v17 §4 — "Continuer" devient intelligent : bloqué tant qu'une discussion
  // d'artiste critique n'est pas résolue.
  const [showBlockedContinue, setShowBlockedContinue] = useState(false);
  // Sous-onglet des classements (Artistes / Labels / Projets).
  const [chartView, setChartView] = useState<"artistes" | "labels" | "projets">("artistes");

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

  const artistChart = useMemo(() => (state ? computeArtistChart(state) : []), [state]);
  const labelChart = useMemo(() => (state ? computeLabelChart(state) : []), [state]);
  const projectChart = useMemo(() => (state ? computeProjectChart(state) : []), [state]);
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
      <section className="fm-skin max-w-md mx-auto px-6 pt-16 pb-24 text-center">
        <p className="text-4xl mb-4">{bankrupt ? "💸" : "🏆"}</p>
        <h1 className="font-impact text-3xl uppercase mb-2">{bankrupt ? "Liquidation judiciaire" : "Fin de saison"}</h1>
        <p className="text-sm text-ink-muted mb-8">
          {bankrupt
            ? `Le tribunal a prononcé la liquidation de ${profile.labelName} à la semaine ${state.week} — le découvert a dépassé le point de non-retour. La rue n'oublie pas, mais elle pardonne : retente ta chance, ${profile.pseudo}.`
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
        body: `Prime de signature : ${fmt(artist.signingFee)} €. Avance mensuelle : ${fmt(artist.salary)} €/mois (versée à chaque fin de mois). Potentiel estimé : ${artist.shownPotential[0]}-${artist.shownPotential[1]} — le vrai plafond, tu le découvriras au travail.`,
      }, ...state.messages].slice(0, 16),
    });
  }

  function startProject() {
    if (!state || state.project) return;
    const artist = state.roster.find((a) => a.id === projArtist);
    if (!artist) return;
    const featArtist = projFeaturing ? state.roster.find((a) => a.id === projFeaturing) ?? null : null;
    const featCost = featArtist ? featuringCost(featArtist) : 0;
    const beatmaker = projBeatmaker ? state.beatmakerMarket.find((b) => b.id === projBeatmaker) ?? null : null;
    const cost = effectiveBudgetCost(budgetChoice, state.locationTier, beatmaker) + featCost;
    if (state.cash < cost) return;
    sfx.click();
    const meta = TYPE_META[projType];
    const stats = computeProductionStats(artist, budgetChoice, projType, state.staff, projBpm, projStructure, featArtist, beatmaker, state.locationTier);
    const title = PROJECT_TITLES[Math.floor(Math.random() * PROJECT_TITLES.length)];
    update({
      ...state,
      cash: state.cash - cost,
      project: {
        artistId: artist.id, type: projType, title, weeksLeft: meta.weeks,
        bpm: projBpm, structure: projStructure, featuringArtistId: featArtist ? featArtist.id : null,
        beatmakerId: beatmaker ? beatmaker.id : null,
        ...stats,
      },
      beatmakerMarket: beatmaker && beatmaker.exclusive
        ? state.beatmakerMarket.filter((b) => b.id !== beatmaker.id)
        : state.beatmakerMarket,
      messages: [{
        id: nextId(), week: state.week, title: `Studio : « ${title} »`,
        body: `${artist.name}${featArtist ? ` feat. ${featArtist.name}` : ""} entre en studio (${meta.label.toLowerCase()}, ${meta.weeks} semaines)${beatmaker ? ` sur une prod de ${beatmaker.name}` : ""}. Budget engagé : ${fmt(cost)} €${featCost > 0 ? ` (dont ${fmt(featCost)} € de featuring)` : ""}${state.locationTier > 0 ? ` — ${LOCATION_TIERS[state.locationTier - 1].name} déjà déduit` : ""}.`,
      }, ...state.messages].slice(0, 16),
    });
    setProjFeaturing("");
    setProjBeatmaker("");
    setTab("label");
  }

  function continueWeek() {
    if (!state) return;
    if (state.artistDialogue) {
      sfx.click();
      setShowBlockedContinue(true);
      return;
    }
    sfx.click();
    setConfirmFireId(null);
    setOfferFor(null);
    setConfirmSellArtistId(null);
    setConfirmSellReleaseId(null);
    update(advanceWeek(state));
  }

  function resolveDialogue(optionId: "defend" | "control" | "compromise" | "postpone") {
    if (!state) return;
    sfx.click();
    setShowBlockedContinue(false);
    update(resolveArtistDialogue(state, optionId));
  }

  const projectArtist = state.project ? state.roster.find((a) => a.id === state.project!.artistId) : null;
  const rosterCosts = state.roster.reduce((sum, a) => sum + a.salary, 0);
  const staffCosts = staffMonthlyCost(state.staff);
  const loanPayment = state.loan ? state.loan.monthlyPayment : 0;
  const monthlyCosts = rosterCosts + staffCosts + loanPayment;
  // Prochaine fin de mois (la paie tombe aux semaines 4, 8, 12...).
  const nextPayWeek = (Math.floor(state.week / MONTH_WEEKS) + 1) * MONTH_WEEKS;
  const totalCost = budgetTotalCost(budgetChoice);
  const previewArtist = state.roster.find((a) => a.id === projArtist);
  const featuringCandidates = state.roster.filter((a) => a.id !== projArtist);
  const previewFeatArtist = projFeaturing ? state.roster.find((a) => a.id === projFeaturing) ?? null : null;
  const previewFeatCost = previewFeatArtist ? featuringCost(previewFeatArtist) : 0;
  const previewBeatmaker = projBeatmaker ? state.beatmakerMarket.find((b) => b.id === projBeatmaker) ?? null : null;
  const grandTotalCost = effectiveBudgetCost(budgetChoice, state.locationTier, previewBeatmaker) + previewFeatCost;
  const preview = previewArtist
    ? computeProductionStats(previewArtist, budgetChoice, projType, state.staff, projBpm, projStructure, previewFeatArtist, previewBeatmaker, state.locationTier)
    : null;
  const accent = profile.color;
  const legacy = labelLegacy(state);

  const counteredNegos = state.negotiations.filter((n) => n.status === "countered");
  const pendingNegos = state.negotiations.filter((n) => n.status === "pending");
  const todoCount = state.concertOffers.length + counteredNegos.length + state.pendingChoices.length + state.artistIdeas.length + (state.artistDialogue ? 1 : 0);
  // Objectif de saison en cours (le premier encore actif) — le fil rouge.
  const activeObjective = state.objectives.find((o) => o.status === "active") ?? null;
  const objectiveValue = activeObjective
    ? activeObjective.metric === "streams" ? state.totalStreamsAllTime
      : activeObjective.metric === "reputation" ? Math.round(state.reputation)
      : state.certifications.length
    : 0;

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
    { label: "Serré", v: Math.max(500, Math.round((p.askSalary * 0.85) / 50) * 50) },
    { label: "Demandé", v: p.askSalary },
    { label: "Généreux", v: Math.round((p.askSalary * 1.15) / 50) * 50 },
  ];
  const hintLabel = (p: number) => (p < 0.25 ? "faible" : p < 0.6 ? "moyenne" : "élevée");

  return (
    <div className="fm-skin max-w-6xl mx-auto px-4 sm:px-6 pb-44 lg:pb-16">
      {showResetNotice && <ResetNotice onDismiss={() => setShowResetNotice(false)} />}

      {/* v17 §4 — bouton Continuer intelligent */}
      {showBlockedContinue && state.artistDialogue && (
        <BlockedContinueNotice
          artistName={state.artistDialogue.artistName}
          onDismiss={() => { setShowBlockedContinue(false); setTab("label"); }}
        />
      )}

      {/* Tutoriel — une seule fois, après l'onboarding */}
      {!state.tutorialDone && !showResetNotice && (
        <Tutorial profile={profile} onDone={() => update({ ...state, tutorialDone: true })} />
      )}

      {/* ===== Barre du haut — style "Portal" FM26 : blason · nav · date · CONTINUER ===== */}
      <div className="sticky top-16 z-30 pt-3">
        <div className="fm-topbar rounded-2xl flex items-center gap-3 px-3 sm:px-4 py-2">
          <a href="/jouer" aria-label="Tous les jeux" className="shrink-0 text-ink-faint hover:text-ink transition-colors">
            <ArrowLeft size={18} />
          </a>
          {/* Blason du label, cerclé comme le crest FM */}
          <span
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ background: `${accent}22`, border: `2px solid ${accent}66`, boxShadow: `0 0 18px ${accent}44` }}
          >
            {profile.logo}
          </span>
          <div className="min-w-0">
            <p className="font-impact text-sm sm:text-base uppercase leading-none truncate" style={{ color: accent }}>
              {profile.labelName}
            </p>
            <p className="font-mono text-[10px] text-ink-faint mt-0.5 truncate">
              {profile.city} · {profile.pseudo}
            </p>
          </div>

          <div className="flex-1" />

          {/* Bloc date/semaine — comme le "4 Jan 2026 · Sun 18:30" de FM */}
          <div className="hidden sm:flex flex-col items-center px-3 py-1 rounded-xl border border-white/10 bg-white/[0.04]">
            <span className="font-impact text-sm leading-none">Semaine {state.week}</span>
            <span className="font-mono text-[9px] uppercase tracking-wide text-ink-faint mt-0.5">
              Saison · {SEASON_WEEKS} sem.
            </span>
          </div>

          {/* CONTINUER — contrôleur du temps (§4-5) : vérifie les décisions en attente */}
          <button
            onClick={() => {
              if (todoCount > 0 && !showContinueCheck) { sfx.click(); setShowContinueCheck(true); }
              else { setShowContinueCheck(false); continueWeek(); }
            }}
            className="fm-continue shrink-0"
          >
            ▶ Continuer <ChevronRight size={16} />
          </button>
        </div>

        {/* §5 — le temps peut être bloqué : panneau des décisions avant d'avancer */}
        {showContinueCheck && todoCount > 0 && (
          <div className="fm-topbar rounded-2xl mt-2 p-4">
            <p className="font-impact text-sm uppercase mb-2">
              {todoCount} situation{todoCount > 1 ? "s" : ""} nécessite{todoCount > 1 ? "nt" : ""} votre attention
            </p>
            <ul className="space-y-1.5 mb-3">
              {state.artistDialogue && (
                <li className="text-xs text-ink-muted flex items-center gap-2"><span className="prio-dot prio-r" /> {state.artistDialogue.artistName} attend une discussion</li>
              )}
              {state.pendingChoices.length > 0 && (
                <li className="text-xs text-ink-muted flex items-center gap-2"><span className="prio-dot prio-y" /> {state.pendingChoices.length} dossier{state.pendingChoices.length > 1 ? "s" : ""} à trancher</li>
              )}
              {counteredNegos.length > 0 && (
                <li className="text-xs text-ink-muted flex items-center gap-2"><span className="prio-dot prio-y" /> {counteredNegos.length} contre-proposition{counteredNegos.length > 1 ? "s" : ""} de recrutement</li>
              )}
              {state.concertOffers.length > 0 && (
                <li className="text-xs text-ink-muted flex items-center gap-2"><span className="prio-dot prio-g" /> {state.concertOffers.length} offre{state.concertOffers.length > 1 ? "s" : ""} de concert en attente</li>
              )}
              {state.artistIdeas.length > 0 && (
                <li className="text-xs text-ink-muted flex items-center gap-2"><span className="prio-dot prio-g" /> {state.artistIdeas.length} idée{state.artistIdeas.length > 1 ? "s" : ""} de projet proposée{state.artistIdeas.length > 1 ? "s" : ""}</li>
              )}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => { sfx.click(); setShowContinueCheck(false); setTab("label"); }}
                className="fm-continue text-xs"
              >
                Voir les décisions
              </button>
              <button
                onClick={() => { sfx.click(); setShowContinueCheck(false); continueWeek(); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/15 text-ink-muted hover:text-ink hover:border-white/30 transition-colors"
              >
                Ignorer et continuer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== Sidebar (desktop) + colonne de contenu ===== */}
      <div className="lg:flex lg:gap-6 lg:items-start">
        <aside className="hidden lg:block w-52 shrink-0 sticky top-[7.25rem] self-start pt-4">
          <nav className="glass-strong rounded-2xl py-2 overflow-hidden">
            {["Principal", "Business", "Communication", "Monde"].map((group) => (
              <div key={group}>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint px-4 pt-3 pb-1">
                  {group}
                </p>
                {MENU.filter((m) => m.group === group).map(({ id, label, Icon }) => (
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
              </div>
            ))}
          </nav>
          <p className="font-mono text-[9px] text-ink-faint uppercase tracking-wide px-4 mt-3">
            Saison 2026 · {profile.labelName}
          </p>
        </aside>

        <div className="min-w-0 flex-1">

      {/* ===== COMMAND CENTER (§2) — état de la semaine en un regard ===== */}
      <div className="glass-strong rounded-2xl px-4 py-3 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-impact text-sm uppercase tracking-wide shrink-0">
          Semaine {state.week} <span className="text-ink-faint">/ {SEASON_WEEKS}</span>
        </p>
        <span className="hidden sm:block w-px h-5 bg-white/10" />
        {[
          { n: state.concertOffers.length + state.artistIdeas.length, label: "opportunités", cls: "prio-g", go: () => setTab("agenda") },
          { n: state.pendingChoices.length + counteredNegos.length, label: "décisions", cls: "prio-y", go: () => setTab("label") },
          { n: (state.cash < 0 ? 1 : 0) + (state.artistDialogue ? 1 : 0), label: "urgent", cls: "prio-r", go: () => setTab(state.cash < 0 ? "finances" : "label") },
          { n: state.messages.length, label: "messages", cls: "prio-b", go: () => setTab("messages") },
        ].map(({ n, label, cls, go }) => (
          <button
            key={label}
            onClick={() => { sfx.click(); go(); }}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity ${n === 0 ? "opacity-35" : "hover:opacity-80"}`}
          >
            <span className={`prio-dot ${cls}`} />
            <span className="font-impact text-sm">{n}</span> {label}
          </button>
        ))}
      </div>

      {/* ===== KPI pro (§17-18) — chiffres contextualisés, cliquables (§19) ===== */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3">
        {[
          {
            label: "Trésorerie", value: `${fmt(state.cash)} €`, Icon: Wallet,
            alert: state.cash < monthlyCosts,
            sub: monthlyCosts > 0
              ? `−${fmt(monthlyCosts)} €/mois · runway ${state.cash > 0 ? Math.max(0, state.cash / monthlyCosts).toFixed(1) : "0"} mois`
              : "aucune charge fixe",
            go: () => setTab("finances"),
          },
          {
            label: "Réputation", value: `${Math.round(state.reputation)}`, Icon: Star, alert: false,
            sub: state.reputation < 15 ? "structure encore peu connue" : state.reputation < 40 ? "label qui monte" : "acteur reconnu",
            go: () => setTab("stats"),
          },
          {
            label: "Streams / sem", value: fmt(weeklyStreams), Icon: Radio, alert: false,
            sub: state.releases.length === 0 ? "aucune sortie active" : `${state.releases.length} sortie${state.releases.length > 1 ? "s" : ""} au catalogue`,
            go: () => setTab("stats"),
          },
        ].map(({ label, value, Icon, alert, sub, go }) => (
          <button key={label} onClick={() => { sfx.click(); go(); }} className="glass-strong rounded-2xl p-3 sm:p-4 text-left transition-transform hover:scale-[1.015]">
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wide text-ink-faint flex items-center gap-1 mb-1">
              <Icon size={10} style={{ color: accent }} /> {label}
            </p>
            <p className={`font-impact text-lg sm:text-2xl leading-none ${alert ? "text-riseNeg" : ""}`}>{value}</p>
            <p className="font-mono text-[9px] text-ink-faint mt-1.5 truncate">{sub}</p>
          </button>
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
          {/* Découvert — pression réaliste : agios chaque semaine, liquidation
              seulement sous le plancher, et des options pour s'en sortir. */}
          {state.cash < 0 && (
            <div className="rounded-2xl border border-signal/60 bg-signal/10 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-glow flex items-center gap-1.5 mb-2">
                <AlertCircle size={11} /> Compte à découvert
              </p>
              <p className="text-sm text-ink-muted leading-relaxed">
                La banque prélève des agios chaque semaine. En dessous de{" "}
                <span className="text-glow font-semibold">{fmt(LIQUIDATION_FLOOR)} €</span>, c'est la
                liquidation judiciaire. Tu peux encore t'en sortir : prêt bancaire, vente d'un contrat
                d'artiste, cession de catalogue.
              </p>
              <button
                onClick={() => { sfx.click(); setTab("finances"); }}
                className="mt-3 text-xs font-semibold text-gold hover:text-glow"
              >
                Voir les options de survie →
              </button>
            </div>
          )}

          {/* Dossiers à traiter — le cœur de la boucle v6 : de vraies décisions,
              pas des événements subis. */}
          {todoCount > 0 && (
            <SectionCard title={`À traiter (${todoCount})`} icon={<AlertCircle size={11} />}>
              <div className="space-y-3">
                {state.artistDialogue && (
                  <div className="rounded-xl border border-gold/40 bg-gold/5 p-3">
                    <div className="flex items-start gap-2.5 mb-1">
                      <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}1f`, color: accent }}>
                        <MessageCircle size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{state.artistDialogue.artistName} veut te parler</p>
                        <p className="font-mono text-[9px] text-ink-faint uppercase mt-0.5">
                          À propos de « {state.artistDialogue.projectTitle} »
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-ink-muted italic leading-relaxed my-3 pl-1 border-l-2 border-gold/30">
                      « {state.artistDialogue.prompt} »
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => resolveDialogue("defend")}
                        className="rounded-xl px-3 py-2.5 text-xs font-semibold border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 transition-colors text-left"
                      >
                        Défendre la stratégie
                      </button>
                      <button
                        onClick={() => resolveDialogue("control")}
                        className="rounded-xl px-3 py-2.5 text-xs font-semibold border border-white/10 text-ink-muted hover:text-ink transition-colors text-left"
                      >
                        Donner le contrôle
                      </button>
                      <button
                        onClick={() => resolveDialogue("compromise")}
                        className="rounded-xl px-3 py-2.5 text-xs font-semibold border border-white/10 text-ink-muted hover:text-ink transition-colors text-left"
                      >
                        Chercher un compromis
                      </button>
                      <button
                        onClick={() => resolveDialogue("postpone")}
                        className="rounded-xl px-3 py-2.5 text-xs font-semibold border border-white/10 text-ink-muted hover:text-ink transition-colors text-left"
                      >
                        Reporter (+1 semaine)
                      </button>
                    </div>
                  </div>
                )}
                {state.pendingChoices.map((c) => (
                  <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-start gap-2.5">
                      <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}1f`, color: accent }}>
                        <Sparkles size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{c.body}</p>
                        <p className="font-mono text-[9px] text-ink-faint mt-1 uppercase">Expire semaine {c.expiresWeek}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={() => { sfx.correct(); update(resolveChoice(state, c.id, "a")); }}
                        className="flex-1 rounded-xl py-2 text-xs font-semibold border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                      >
                        {c.optionA}
                      </button>
                      <button
                        onClick={() => { sfx.click(); update(resolveChoice(state, c.id, "b")); }}
                        className="rounded-xl px-4 py-2 text-xs font-semibold border border-white/10 text-ink-muted hover:text-ink transition-colors"
                      >
                        {c.optionB}
                      </button>
                    </div>
                  </div>
                ))}
                {state.concertOffers.map((o) => (
                  <div key={o.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-start gap-2.5">
                      <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}1f`, color: accent }}>
                        <Mic2 size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{o.dates > 1 ? "Tournée" : "Concert"} — {o.artistName}</p>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {o.venue}, {o.cityName} · cachet {o.dates > 1 ? "total " : ""}<span className="text-risePos font-semibold">{fmt(o.fee)} €</span> · expire S{o.expiresWeek}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={() => { sfx.correct(); update(acceptConcert(state, o.id)); }}
                        className="flex-1 rounded-xl py-2 text-xs font-semibold border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                      >
                        {o.dates > 1 ? "Accepter la tournée" : "Accepter la date"}
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
                {state.artistIdeas.map((idea) => (
                  <div key={idea.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-start gap-2.5">
                      <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}1f`, color: accent }}>
                        <Sparkles size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Idée de projet — {idea.artistName}</p>
                        <p className="text-xs text-ink-muted mt-0.5 italic">{idea.pitch}</p>
                        <p className="font-mono text-[9px] text-ink-faint mt-1">
                          « {idea.title} » · {TYPE_META[idea.type].label} · -{Math.round(idea.costDiscount * 100)}% de budget · expire S{idea.expiresWeek}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={() => { sfx.correct(); update(startProjectFromIdea(state, idea.id)); }}
                        disabled={!!state.project}
                        className="flex-1 rounded-xl py-2 text-xs font-semibold border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 disabled:border-white/8 disabled:text-ink-faint disabled:cursor-not-allowed transition-colors"
                      >
                        {state.project ? "Studio occupé" : "Suivre l'idée"}
                      </button>
                      <button
                        onClick={() => { sfx.click(); update(declineArtistIdea(state, idea.id)); }}
                        className="rounded-xl px-4 py-2 text-xs font-semibold border border-white/10 text-ink-muted hover:text-ink transition-colors"
                      >
                        Laisser filer
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
                            {STAFF_ROLES[person.role].label} · demande <span className="text-gold font-semibold">{fmt(n.counter)} €/mois</span> (ton offre : {fmt(n.offer)} €)
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2.5">
                        <button
                          onClick={() => { sfx.correct(); update(acceptCounter(state, n.id)); }}
                          className="flex-1 rounded-xl py-2 text-xs font-semibold border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                        >
                          Accepter — {fmt(n.counter)} €/mois
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

          {/* Objectif de saison — le fil rouge : une cible, une deadline, une
              récompense inspirée des vrais leviers du secteur (CNM, synchro...). */}
          {activeObjective && (
            <SectionCard title="Objectif de saison" icon={<Target size={11} />}>
              <p className="text-sm font-medium">{activeObjective.label}</p>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">{activeObjective.desc}</p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((objectiveValue / activeObjective.target) * 100))}%`,
                      background: `linear-gradient(90deg, #7A0F0F, ${accent})`,
                    }}
                  />
                </div>
                <span className="font-mono text-[11px] text-ink-muted shrink-0">
                  {fmt(objectiveValue)} / {fmt(activeObjective.target)}
                </span>
              </div>
              <p className="font-mono text-[10px] text-ink-faint mt-2">
                Avant la semaine {activeObjective.deadlineWeek} ({Math.max(0, activeObjective.deadlineWeek - state.week)} restantes) ·
                récompense : <span className="text-risePos">+{fmt(activeObjective.reward)} €</span> ({activeObjective.rewardLabel})
              </p>
            </SectionCard>
          )}

          {/* Checklist premiers pas — disparaît une fois complétée */}
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
                Prochaine paie (S{nextPayWeek}) : <span className="text-riseNeg">-{fmt(monthlyCosts)} €</span>
                {staffCosts > 0 && <span className="block mt-0.5">dont staff : -{fmt(staffCosts)} €</span>}
                {loanPayment > 0 && <span className="block mt-0.5">dont prêt : -{fmt(loanPayment)} €</span>}
              </p>
            </SectionCard>
          </div>

          <SectionCard
            title="Classement artistes"
            icon={<BarChart3 size={11} />}
            action={
              <button onClick={() => setTab("charts")} className="font-mono text-[10px] uppercase text-gold hover:text-glow">
                Tout voir →
              </button>
            }
          >
            <div className="space-y-1.5">
              {artistChart.slice(0, 5).map((e, i) => {
                const prevIdx = state.prevChartOrder.indexOf(e.key);
                const delta = state.prevChartOrder.length === 0 ? 0 : prevIdx === -1 ? null : prevIdx - i;
                return (
                  <div key={e.key} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${e.mine ? "bg-gold/10" : ""}`}>
                    <span className="font-impact text-sm w-4 text-center text-ink-faint">{i + 1}</span>
                    <Movement delta={delta} />
                    <p className={`text-sm flex-1 min-w-0 truncate ${e.mine ? "text-gold font-medium" : ""}`}>
                      {e.name}{e.title ? <span className="text-ink-faint"> · {e.title}</span> : null}
                    </p>
                    <span className="font-mono text-[11px] text-ink-muted shrink-0">{fmt(e.streams)}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {state.releases.length > 0 && (
            <SectionCard title="Sorties actives" icon={<Radio size={11} />}>
              <div className="space-y-3">
                {state.releases.slice(0, 4).map((r) => {
                  const canPush = !r.pushed && r.weeksOut <= PUSH_WINDOW_WEEKS;
                  return (
                    <div key={r.id}>
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">« {r.title} » — {r.artistName}</p>
                          <p className="font-mono text-[10px] text-ink-faint">{fmt(r.totalStreams)} cumulés · sem. {r.weeksOut}</p>
                          {r.tracks && (
                            <p className="font-mono text-[9px] text-gold mt-0.5">
                              Album · {r.tracks.length} titres · phare : « {r.tracks.find((t) => t.lead)?.title ?? r.tracks[0].title} »
                            </p>
                          )}
                        </div>
                        <span className="font-mono text-xs text-gold shrink-0">{fmt(r.weeklyStreams)}/sem</span>
                      </div>
                      {canPush && (
                        <button
                          onClick={() => { sfx.click(); update(pushRelease(state, r.id)); }}
                          disabled={state.cash < PUSH_COST}
                          className="mt-1 text-[10px] font-mono uppercase text-gold hover:text-glow disabled:text-ink-faint disabled:cursor-not-allowed"
                        >
                          Relancer la campagne — {fmt(PUSH_COST)} €
                        </button>
                      )}
                    </div>
                  );
                })}
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
                      <p className="font-mono text-[10px] text-ink-muted mt-1">{a.style} · {fmt(a.salary)} €/mois</p>
                      <p className="font-mono text-[9px] uppercase tracking-wide text-gold mt-1">
                        {artistCareerProfile(a, state.releases, state.certifications)}
                      </p>
                    </div>
                    <div className="p-4 space-y-1.5">
                      <StatBar label="Flow" value={a.flow} color={accent} />
                      <StatBar label="Plume" value={a.plume} color={accent} />
                      <StatBar label="Charisme" value={a.charisme} color={accent} />
                      <StatBar label="Hype" value={a.hype} max={100} color={accent} />
                      <RangeBar label="Potentiel" range={a.shownPotential} color={accent} />
                      <p className={`font-mono text-[10px] ${a.contractWeeksLeft <= CONTRACT_RENEWAL_WINDOW ? "text-glow" : "text-ink-faint"}`}>
                        Contrat : {a.contractWeeksLeft} semaine{a.contractWeeksLeft > 1 ? "s" : ""} restante{a.contractWeeksLeft > 1 ? "s" : ""}
                        {a.leaving ? " — partira en fin de contrat" : ""}
                      </p>
                      <p className={`font-mono text-[10px] ${a.advanceRecouped ? "text-risePos" : "text-ink-faint"}`}>
                        {a.advanceRecouped
                          ? "Avance recoupée — rentable"
                          : `Avance : ${fmt(Math.min(a.lifetimeRevenue, a.signingFee))} / ${fmt(a.signingFee)} € recoupés`}
                      </p>
                      {state.promises.some((pr) => pr.artistId === a.id && pr.kept === null) && (
                        <p className="font-mono text-[10px] text-gold">
                          Promesse en cours — le prochain projet lui est dû
                        </p>
                      )}
                      {confirmSellArtistId === a.id ? (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => { sfx.click(); setConfirmSellArtistId(null); update(sellArtistContract(state, a.id)); }}
                            className="flex-1 rounded-xl py-2 text-xs font-semibold border border-signal/60 bg-signal/15 text-glow hover:bg-signal/25 transition-colors"
                          >
                            Confirmer la vente — {fmt(artistContractValue(a))} €
                          </button>
                          <button
                            onClick={() => setConfirmSellArtistId(null)}
                            className="rounded-xl px-3 py-2 text-xs font-semibold border border-white/10 text-ink-muted hover:text-ink"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmSellArtistId(a.id)}
                          className="pt-2 text-[11px] font-mono uppercase text-ink-faint hover:text-glow inline-flex items-center gap-1"
                        >
                          <Handshake size={11} /> Vendre le contrat — {fmt(artistContractValue(a))} €
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-ink-faint font-mono mt-4">
              Le potentiel affiché est une estimation — le vrai plafond de chaque artiste est caché. La valeur de revente d'un contrat dépend surtout de la hype : développe avant de vendre, sinon c'est à perte.
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
            Les labels rivaux scoutent le même marché que toi — un talent qui traîne ici peut signer ailleurs. Le potentiel est une fourchette : signer, c'est parier. Un(e) responsable A&R affine ces fourchettes semaine après semaine, élargit le vivier et repère les pépites.
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
                        {person.age} ans · {person.city} · {fmt(person.askSalary)} €/mois
                      </p>
                    </div>
                    <div className="p-4">
                      <div className="space-y-1.5 mb-3">
                        <RangeBar label="Niveau" range={person.shownSkill} color={accent} />
                        <StatBar label="Réput." value={person.reputation} max={100} color={accent} />
                        <StatBar label="Motiv." value={Math.round(person.motivation)} max={100} color={accent} />
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
                            Confirmer — {fmt(person.askSalary * STAFF_SEVERANCE_MONTHS)} € d'indemnité
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
                          Salaire demandé : <span className="text-gold font-semibold">{fmt(p.askSalary)} €/mois</span>
                        </p>

                        {roleTaken ? (
                          <p className="text-[11px] text-ink-faint font-mono">
                            Poste déjà occupé — libère-le pour recruter ici.
                          </p>
                        ) : nego && nego.status === "pending" ? (
                          <p className="text-xs text-gold font-medium flex items-center gap-1.5">
                            <Handshake size={13} /> Offre envoyée ({fmt(nego.offer)} €/mois) — réponse à la prochaine semaine.
                          </p>
                        ) : nego && nego.status === "countered" && nego.counter !== null ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => { sfx.correct(); update(acceptCounter(state, nego.id)); }}
                              className="flex-1 rounded-xl py-2 text-xs font-semibold border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                            >
                              Accepter {fmt(nego.counter)} €/mois
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
                            <p className="font-mono text-[9px] uppercase text-ink-faint mb-2">Ton offre (€/mois)</p>
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
              Le niveau affiché est une fourchette — elle se resserre avec le temps passé ensemble. Motivation basse (salaire sous le marché, label en berne) = risque de démission. Les candidats ont une disponibilité limitée, et les rivaux recrutent aussi. Entre parenthèses : chance estimée que l'offre soit acceptée.
            </p>
          </div>
        </div>
      )}

      {/* ===== Onglet STUDIO ===== */}
      {tab === "studio" && (
        <div className="pt-4 space-y-4">
          {/* v16 — progression immobilière par paliers (§2 approfondi) : achat
              dans l'ordre, effet cumulatif et permanent à chaque palier. */}
          <SectionCard title="Local de travail" icon={<Building2 size={11} />}>
            <div className="space-y-2">
              {LOCATION_TIERS.map((info) => {
                const owned = state.locationTier >= info.tier;
                const buyable = state.locationTier === info.tier - 1;
                return (
                  <div
                    key={info.tier}
                    className={`rounded-xl border px-3 py-2.5 ${owned ? "border-risePos/40 bg-risePos/5" : buyable ? "border-white/10 bg-white/[0.03]" : "border-white/5 opacity-50"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${owned ? "text-risePos" : ""}`}>
                          {owned ? "✓ " : ""}{info.name}
                        </p>
                        <p className="text-[11px] text-ink-muted mt-0.5">{info.bonusDesc}</p>
                      </div>
                      {!owned && buyable && (
                        <button
                          onClick={() => { sfx.click(); update(upgradeLocation(state, info.tier)); }}
                          disabled={state.cash < info.cost}
                          className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 disabled:border-white/8 disabled:text-ink-faint disabled:cursor-not-allowed transition-colors"
                        >
                          {fmt(info.cost)} €
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-ink-faint font-mono mt-3">
              Chaque palier s'achète dans l'ordre — l'effet du précédent reste acquis. Un siège du label, c'est aussi un signal envoyé aux artistes et aux partenaires.
            </p>
          </SectionCard>

          {/* v14 — vault musicale (§9) : les chutes de studio dorment ici,
              exploitables plus tard à moindre coût. */}
          {state.vault.length > 0 && (
            <SectionCard title="Vault musicale" icon={<Disc3 size={11} />}>
              <div className="space-y-3">
                {state.vault.map((v) => {
                  const stillSigned = state.roster.some((a) => a.id === v.artistId);
                  return (
                    <div key={v.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">« {v.title} » — {v.artistName}</p>
                        <p className="font-mono text-[9px] text-ink-faint">Qualité ~{v.quality} · en attente depuis S{v.createdWeek}</p>
                      </div>
                      {stillSigned ? (
                        <button
                          onClick={() => { sfx.click(); update(releaseVaultTrack(state, v.id)); }}
                          disabled={state.cash < VAULT_RELEASE_COST}
                          className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 disabled:border-white/8 disabled:text-ink-faint disabled:cursor-not-allowed transition-colors"
                        >
                          Sortir — {fmt(VAULT_RELEASE_COST)} €
                        </button>
                      ) : (
                        <span className="font-mono text-[9px] text-ink-faint shrink-0">Artiste parti</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-ink-faint font-mono mt-3">
                Sortie rapide, sans vrai travail de studio — démarrage plus modeste qu'une sortie travaillée, mais un revenu presque gratuit.
              </p>
            </SectionCard>
          )}

          {state.project ? (
            <SectionCard title={`War room — « ${state.project.title} »`} icon={<ShieldAlert size={11} />}>
              {(() => {
                const totalWeeks = TYPE_META[state.project!.type].weeks;
                const risk = projectRiskLevel(state.project!.weeksLeft, totalWeeks, state.cash, monthlyCosts);
                const riskColor = risk === "élevé" ? "text-riseNeg" : risk === "modéré" ? "text-gold" : "text-risePos";
                const featGuest = state.project!.featuringArtistId ? state.roster.find((a) => a.id === state.project!.featuringArtistId) : null;
                const beatmakerUsed = state.project!.beatmakerId ? state.beatmakerMarket.find((b) => b.id === state.project!.beatmakerId) : null;
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="font-mono text-[9px] uppercase text-ink-faint mb-1">Artiste</p>
                        <p className="text-sm font-medium">{projectArtist ? projectArtist.name : "—"}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase text-ink-faint mb-1">Avancement</p>
                        <p className="text-sm font-medium">{totalWeeks - state.project!.weeksLeft} / {totalWeeks} sem.</p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase text-ink-faint mb-1">Niveau de risque</p>
                        <p className={`text-sm font-bold uppercase ${riskColor}`}>{risk}</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${((totalWeeks - state.project!.weeksLeft) / totalWeeks) * 100}%`, background: `linear-gradient(90deg, #7A0F0F, ${accent})` }}
                      />
                    </div>
                    <p className="text-[11px] text-ink-faint font-mono">
                      {state.project!.type === "album" ? "Album" : state.project!.type === "ep" ? "EP" : "Single"} · {state.project!.bpm} BPM · {SONG_STRUCTURES.find((s) => s.id === state.project!.structure)?.label ?? state.project!.structure}
                      {featGuest ? ` · feat. ${featGuest.name}` : ""}
                      {beatmakerUsed ? ` · prod ${beatmakerUsed.name}` : ""}
                    </p>
                    <p className="text-[11px] text-ink-faint font-mono">
                      {risk === "élevé"
                        ? "Trésorerie tendue à l'approche de la sortie — surveille tes charges de fin de mois."
                        : risk === "modéré"
                          ? "Rien d'alarmant, mais reste attentif d'ici la sortie."
                          : "Tout est sous contrôle pour l'instant."}
                    </p>
                  </div>
                );
              })()}
            </SectionCard>
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

              {/* v10 — création musicale construite : BPM, structure, featuring */}
              <SectionCard title="3 · BPM" icon={<Sparkles size={11} />}>
                {previewArtist && (
                  <p className="text-[11px] text-ink-faint font-mono mb-2">
                    Plage idéale pour le {previewArtist.style} :{" "}
                    <span className="text-gold">
                      {(STYLE_BPM[previewArtist.style] ?? [80, 140])[0]}-{(STYLE_BPM[previewArtist.style] ?? [80, 140])[1]} BPM
                    </span>{" "}
                    — coller au tempo du style améliore la qualité, s'en éloigner trop la pénalise.
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={BPM_MIN}
                    max={BPM_MAX}
                    value={projBpm}
                    onChange={(e) => setProjBpm(Number(e.target.value))}
                    className="flex-1 accent-gold"
                  />
                  <span className="font-mono text-sm w-16 text-right">{projBpm} BPM</span>
                </div>
              </SectionCard>

              <SectionCard title="4 · Structure du morceau" icon={<Disc3 size={11} />}>
                <div className="space-y-2">
                  {SONG_STRUCTURES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setProjStructure(s.id)}
                      className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                        projStructure === s.id ? "border-gold/50 bg-gold/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"
                      }`}
                    >
                      <p className={`text-sm font-medium ${projStructure === s.id ? "text-gold" : ""}`}>{s.label}</p>
                      <p className="text-[11px] text-ink-muted mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </SectionCard>

              {featuringCandidates.length > 0 && (
                <SectionCard title="5 · Featuring (optionnel)" icon={<Handshake size={11} />}>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setProjFeaturing("")} className={`filter-pill ${projFeaturing === "" ? "is-active" : ""}`}>
                      Aucun
                    </button>
                    {featuringCandidates.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setProjFeaturing(a.id)}
                        className={`filter-pill ${projFeaturing === a.id ? "is-active" : ""}`}
                      >
                        {a.name} · {fmt(featuringCost(a))} €
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-ink-faint font-mono mt-2">
                    Croise les deux fanbases — bonus de portée et de hype pour les deux artistes, contre {Math.round(FEATURING_FEE_RATE * 100)} % de la cote du featuré.
                  </p>
                </SectionCard>
              )}

              {/* v14 — marketplace de beatmakers (§8) : une prod refusée peut
                  devenir le hit d'un concurrent — le marché tourne chaque semaine. */}
              <SectionCard title="6 · Prod (optionnel)" icon={<Disc3 size={11} />}>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setProjBeatmaker("")} className={`filter-pill ${projBeatmaker === "" ? "is-active" : ""}`}>
                    Instru générique
                  </button>
                  {state.beatmakerMarket.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setProjBeatmaker(b.id)}
                      className={`filter-pill ${projBeatmaker === b.id ? "is-active" : ""}`}
                    >
                      {b.name}{b.exclusive ? " (exclu)" : ""} · +{Math.round(b.qualityBonus * 100)}% · {fmt(b.fee)} €
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-ink-faint font-mono mt-2">
                  {previewBeatmaker
                    ? `${previewBeatmaker.name}${previewBeatmaker.styleAffinity ? ` (spécialiste ${previewBeatmaker.styleAffinity})` : ""} — bonus qualité ${previewBeatmaker.styleAffinity === previewArtist?.style ? "renforcé par l'affinité de style" : "standard"}.${previewBeatmaker.exclusive ? " Prod exclusive : elle disparaît du marché une fois prise." : ""}`
                    : "Une prod nommée peut booster la qualité, surtout si son style colle à celui de l'artiste. Optionnel — le budget instru générique suffit pour démarrer."}
                </p>
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
                  <p className={`font-impact text-xl ${state.cash >= grandTotalCost ? "" : "text-riseNeg"}`}>{fmt(grandTotalCost)} €</p>
                  {previewFeatCost > 0 && (
                    <p className="font-mono text-[10px] text-ink-faint">dont {fmt(previewFeatCost)} € de featuring</p>
                  )}
                </div>
                <p className="font-mono text-[10px] text-ink-faint">Dispo : {fmt(state.cash)} €</p>
              </div>

              <BorderMagicButton onClick={startProject} fullWidth size="lg" disabled={!projArtist || state.cash < grandTotalCost}>
                Lancer la prod
              </BorderMagicButton>
            </>
          )}
        </div>
      )}

      {/* ===== Onglet CHARTS — trois classements + tendances ===== */}
      {tab === "charts" && (
        <div className="pt-4 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
            {([
              { id: "artistes", label: "Artistes" },
              { id: "labels", label: "Labels" },
              { id: "projets", label: "Projets de la saison" },
            ] as { id: "artistes" | "labels" | "projets"; label: string }[]).map((v) => (
              <button
                key={v.id}
                onClick={() => { sfx.click(); setChartView(v.id); }}
                className={`filter-pill shrink-0 ${chartView === v.id ? "is-active" : ""}`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* --- Classement ARTISTES (streams hebdo) --- */}
          {chartView === "artistes" && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-3">Top artistes — streams hebdo · semaine {state.week}</p>
              <div className="card divide-y divide-white/8 overflow-hidden">
                {artistChart.length === 0 ? (
                  <p className="text-sm text-ink-faint p-4">Personne dans les charts — sors un projet pour exister.</p>
                ) : artistChart.map((e, i) => {
                  const prevIdx = state.prevChartOrder.indexOf(e.key);
                  const delta = state.prevChartOrder.length === 0 ? 0 : prevIdx === -1 ? null : prevIdx - i;
                  return (
                    <div key={e.key} className={`flex items-center gap-3 py-3 px-4 ${e.mine ? "bg-gold/8" : ""}`}>
                      <span className="font-impact text-lg w-6 text-center text-ink-faint">{i + 1}</span>
                      <Movement delta={delta} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${e.mine ? "text-gold" : ""}`}>{e.name}</p>
                        <p className="font-mono text-[9px] text-ink-faint uppercase">{e.mine ? profile.labelName : e.title}</p>
                      </div>
                      <span className="font-mono text-xs text-ink-muted shrink-0">{fmt(e.streams)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-ink-faint font-mono mt-3">
                ▲▼ = mouvement vs semaine passée. Tes artistes comptent la somme de leurs sorties actives.
              </p>
            </div>
          )}

          {/* --- Classement LABELS (streams agrégés + réputation) --- */}
          {chartView === "labels" && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-3">Top labels — puissance hebdo · semaine {state.week}</p>
              <div className="card divide-y divide-white/8 overflow-hidden">
                {labelChart.map((e, i) => (
                  <div key={e.key} className={`flex items-center gap-3 py-3 px-4 ${e.mine ? "bg-gold/8" : ""}`}>
                    <span className="font-impact text-lg w-6 text-center text-ink-faint">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${e.mine ? "text-gold" : ""}`}>{e.name}</p>
                      <p className="font-mono text-[9px] text-ink-faint uppercase">Réputation {e.reputation}</p>
                    </div>
                    <span className="font-mono text-xs text-ink-muted shrink-0">{fmt(e.streams)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-ink-faint font-mono mt-3">
                Streams hebdo agrégés de chaque écurie. Battre au moins 2 labels fait grimper ta réputation chaque semaine (3 points si tu en bats 5+).
              </p>
            </div>
          )}

          {/* --- Top PROJETS de la saison (cumulés) --- */}
          {chartView === "projets" && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-3">Top projets de la saison — streams cumulés</p>
              <div className="card divide-y divide-white/8 overflow-hidden">
                {projectChart.length === 0 ? (
                  <p className="text-sm text-ink-faint p-4">Aucun projet marquant pour l'instant — la saison est jeune.</p>
                ) : projectChart.map((e, i) => (
                  <div key={e.key} className={`flex items-center gap-3 py-3 px-4 ${e.mine ? "bg-gold/8" : ""}`}>
                    <span className="font-impact text-lg w-6 text-center text-ink-faint">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${e.mine ? "text-gold" : ""}`}>« {e.title} » — {e.artistName}</p>
                      <p className="font-mono text-[9px] text-ink-faint uppercase">{e.labelName}</p>
                    </div>
                    <span className="font-mono text-xs text-ink-muted shrink-0">{fmt(e.totalStreams)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-ink-faint font-mono mt-3">
                Le palmarès de l'année, toutes écuries confondues — c'est ici qu'on écrit l'histoire. Streams cumulés depuis la sortie.
              </p>
            </div>
          )}

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
              const radioWeekly = state.releases.reduce((sum, r) => sum + r.radioPlays * RADIO_RATE, 0);
              const weeklyGross = weeklyStreams * STREAM_RATE + radioWeekly;
              const monthlyRevenue = weeklyGross * (1 + DROITS_RATE) * MONTH_WEEKS;
              const net = monthlyRevenue - monthlyCosts;
              return [
                { label: "Revenus / mois (est.)", value: `+${fmt(monthlyRevenue)} €`, cls: "text-risePos" },
                { label: "Charges / mois", value: `-${fmt(monthlyCosts)} €`, cls: "text-riseNeg" },
                { label: "Net mensuel estimé", value: `${net >= 0 ? "+" : ""}${fmt(net)} €`, cls: net >= 0 ? "text-risePos" : "text-riseNeg" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="glass-strong rounded-2xl p-3 sm:p-4">
                  <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wide text-ink-faint mb-1">{label}</p>
                  <p className={`font-impact text-lg sm:text-2xl leading-none ${cls}`}>{value}</p>
                </div>
              ));
            })()}
          </div>

          {/* Détail des revenus de la semaine écoulée — comme un vrai relevé de
              répartition : chaque source d'exploitation a sa ligne. */}
          <SectionCard title="Revenus — estimation de la semaine" icon={<LineChart size={11} />}>
            {(() => {
              const inc = state.lastWeekIncome;
              const total = inc.streaming + inc.droits + inc.radio + inc.concerts;
              const rows = [
                { label: "Streaming (plateformes)", v: inc.streaming, hint: "premium + freemium, mix propre à chaque sortie" },
                { label: "Droits voisins & édition", v: inc.droits, hint: `${Math.round(DROITS_RATE * 100)} % de l'exploitation` },
                { label: "Radio (rémunération équitable)", v: inc.radio, hint: `${fmt(RADIO_RATE)} € / passage` },
                { label: "Concerts (cachets)", v: inc.concerts, hint: "encaissés à l'acceptation" },
              ];
              return (
                <div>
                  <div className="space-y-2">
                    {rows.map((r) => (
                      <div key={r.label} className="flex items-baseline justify-between gap-3">
                        <p className="text-sm min-w-0">
                          {r.label}
                          <span className="block font-mono text-[9px] text-ink-faint">{r.hint}</span>
                        </p>
                        <span className={`font-mono text-xs shrink-0 ${r.v > 0 ? "text-risePos" : "text-ink-faint"}`}>+{fmt(r.v)} €</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/8">
                    <p className="font-mono text-[10px] uppercase text-ink-faint">Total semaine (estimé)</p>
                    <span className="font-impact text-lg text-risePos">+{fmt(total)} €</span>
                  </div>
                  {state.advanceDeal && (
                    <p className="font-mono text-[10px] text-riseNeg mt-2">
                      Avance distributeur en cours : {Math.round(state.advanceDeal.share * 100)} % du streaming retenus encore {state.advanceDeal.weeksLeft} semaine{state.advanceDeal.weeksLeft > 1 ? "s" : ""}.
                    </p>
                  )}
                </div>
              );
            })()}
          </SectionCard>

          {/* v13 — décalage de reporting (§36) : les chiffres définitifs de la
              semaine PRÉCÉDENTE arrivent maintenant, consolidés. Comme un vrai
              relevé distributeur qui met du temps à tomber. */}
          <SectionCard title="Revenus — chiffres confirmés (semaine précédente)" icon={<CheckCircle2 size={11} />}>
            {(() => {
              const c = state.confirmedIncome;
              const total = c.streaming + c.droits + c.radio + c.concerts;
              return total === 0 ? (
                <p className="text-sm text-ink-faint">Pas encore de relevé consolidé — reviens après la prochaine semaine.</p>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-ink-faint font-mono">
                    Streaming {fmt(c.streaming)} € · Droits {fmt(c.droits)} € · Radio {fmt(c.radio)} € · Concerts {fmt(c.concerts)} €
                  </p>
                  <span className="font-impact text-lg">{fmt(total)} €</span>
                </div>
              );
            })()}
            <p className="text-[11px] text-ink-faint font-mono mt-3">
              Les plateformes ne reportent jamais tout instantanément — ce relevé consolide (avec un léger ajustement) l'estimation de la semaine passée, comme un vrai relevé distributeur.
            </p>
          </SectionCard>

          {/* Banque : prêt en cours ou offres disponibles — la bouée de sauvetage
              (et un levier de croissance pour les ambitieux). */}
          <SectionCard title="Banque & prêt" icon={<PiggyBank size={11} />}>
            {state.loan ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Prêt de {fmt(state.loan.amount)} € en cours</p>
                  <span className="font-mono text-xs text-riseNeg">-{fmt(state.loan.monthlyPayment)} €/mois</span>
                </div>
                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(3, Math.round((1 - state.loan.remaining / (state.loan.amount * (1 + LOAN_INTEREST))) * 100))}%`,
                      background: `linear-gradient(90deg, #7A0F0F, ${accent})`,
                    }}
                  />
                </div>
                <p className="font-mono text-[10px] text-ink-faint mt-2">
                  Reste à rembourser : {fmt(state.loan.remaining)} € — prélevé à chaque fin de mois. Nouveau prêt possible une fois celui-ci soldé.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex gap-2 flex-wrap">
                  {LOAN_OFFERS.map((o) => {
                    const ok = state.reputation >= o.minRep;
                    return (
                      <button
                        key={o.amount}
                        onClick={() => { if (ok) { sfx.correct(); update(takeLoan(state, o.amount)); } }}
                        disabled={!ok}
                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold border transition-colors ${
                          ok
                            ? "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20"
                            : "border-white/8 text-ink-faint cursor-not-allowed"
                        }`}
                      >
                        Emprunter {fmt(o.amount)} €{!ok && ` (réput. ${o.minRep})`}
                      </button>
                    );
                  })}
                </div>
                <p className="font-mono text-[10px] text-ink-faint mt-3">
                  Intérêts {Math.round(LOAN_INTEREST * 100)} %, remboursé sur {LOAN_MONTHS} mois à chaque fin de mois. Un seul prêt à la fois — les gros montants exigent de la réputation.
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Masse salariale — artistes" icon={<Users size={11} />}>
            {state.roster.length === 0 ? (
              <p className="text-sm text-ink-faint">Aucun artiste sous contrat.</p>
            ) : (
              <div className="space-y-2">
                {state.roster.map((a) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <p className="text-sm">{a.name}</p>
                    <span className="font-mono text-xs text-riseNeg">-{fmt(a.salary)} €/mois</span>
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
                    <span className="font-mono text-xs text-riseNeg shrink-0">-{fmt(p.askSalary)} €/mois</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Catalogue & revenus par sortie" icon={<Radio size={11} />}>
            {state.releases.length === 0 ? (
              <p className="text-sm text-ink-faint">Aucune sortie active — les streams paient tes factures.</p>
            ) : (
              <div className="space-y-3">
                {state.releases.map((r) => (
                  <div key={r.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm truncate min-w-0">
                        « {r.title} » — {r.artistName}
                        {r.radioPlays > 0 && <span className="block font-mono text-[9px] text-ink-faint">{r.radioPlays} passage{r.radioPlays > 1 ? "s" : ""} radio / sem</span>}
                      </p>
                      <span className="font-mono text-xs text-risePos shrink-0">+{fmt(releaseWeeklyRevenue(r))} €/sem</span>
                    </div>
                    {r.tracks && (
                      <div className="mt-1.5 mb-1 pl-3 border-l border-white/10 space-y-0.5">
                        {r.tracks.map((t) => (
                          <p key={t.title} className={`text-[11px] ${t.lead ? "text-gold font-medium" : "text-ink-faint"}`}>
                            {t.lead ? "★ " : "· "}{t.title} <span className="font-mono text-[9px]">(qualité {t.quality}{t.lead ? `, ${Math.round(t.streamShare * 100)}% du streaming` : ""})</span>
                          </p>
                        ))}
                      </div>
                    )}
                    {confirmSellReleaseId === r.id ? (
                      <div className="flex gap-2 mt-1.5">
                        <button
                          onClick={() => { sfx.click(); setConfirmSellReleaseId(null); update(sellCatalog(state, r.id)); }}
                          className="flex-1 rounded-xl py-1.5 text-xs font-semibold border border-signal/60 bg-signal/15 text-glow hover:bg-signal/25 transition-colors"
                        >
                          Confirmer la cession — {fmt(catalogValue(r))} €
                        </button>
                        <button
                          onClick={() => setConfirmSellReleaseId(null)}
                          className="rounded-xl px-3 py-1.5 text-xs font-semibold border border-white/10 text-ink-muted hover:text-ink"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmSellReleaseId(r.id)}
                        className="mt-1 text-[10px] font-mono uppercase text-ink-faint hover:text-glow"
                      >
                        Céder les droits — {fmt(catalogValue(r))} €
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* v13 — "Label Intelligence Center" : la donnée derrière chaque
              sortie, comme un vrai dashboard Spotify/Deezer/Apple/Amazon
              simplifié. Chaque sortie a SON mix, pas une moyenne générale. */}
          {state.releases.length > 0 && (
            <SectionCard title="Data label — par sortie" icon={<BarChart3 size={11} />}>
              <div className="space-y-4">
                {state.releases.map((r) => {
                  const topSource = Object.entries(r.streamSource).sort((a, b) => b[1] - a[1])[0];
                  const stage = releaseLifecycleStage(r);
                  const stageColor = stage === "Hit certifié" ? "text-gold" : stage === "Croissance" ? "text-risePos" : stage === "Déclin" ? "text-riseNeg" : "text-ink-muted";
                  return (
                    <div key={r.id}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium truncate min-w-0">« {r.title} » — {r.artistName}</p>
                        <span className={`font-mono text-[10px] uppercase shrink-0 ${stageColor}`}>{stage}</span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-white/8">
                        {Object.entries(r.platformSplit).map(([name, pct]) => (
                          <span
                            key={name}
                            style={{ width: `${pct * 100}%`, background: name === "Spotify" ? "#1DB954" : name === "Deezer" ? "#A238FF" : name === "Apple Music" ? "#FA586A" : name === "Amazon Music" ? "#00A8E1" : "#666" }}
                            title={`${name} : ${Math.round(pct * 100)}%`}
                          />
                        ))}
                      </div>
                      <p className="font-mono text-[9px] text-ink-faint mt-1">
                        {Object.entries(r.platformSplit).map(([name, pct]) => `${name} ${Math.round(pct * 100)}%`).join(" · ")}
                      </p>
                      <p className="font-mono text-[10px] text-ink-muted mt-1.5">
                        {Math.round(r.premiumShare * 100)}% premium · source principale : {topSource[0]} ({Math.round(topSource[1] * 100)}%)
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-ink-faint font-mono mt-3">
                Le premium paie nettement plus que le freemium (publicitaire) — le mix change d'une sortie à l'autre selon l'audience touchée. Répartition plateformes calée sur le marché streaming français (Deezer y pèse plus qu'ailleurs).
              </p>
            </SectionCard>
          )}

          <p className="text-[11px] text-ink-faint font-mono">
            Streaming : mix premium (~{fmt(PREMIUM_STREAM_RATE * 1000)} €/1 000) et freemium (~{fmt(FREEMIUM_STREAM_RATE * 1000)} €/1 000) propre à chaque sortie — pas de taux fixe. Droits voisins & édition ({Math.round(DROITS_RATE * 100)} % de l'exploitation), radio ({fmt(RADIO_RATE)} €/passage), cachets de concert. Paie (salaires + prêt) toutes les {MONTH_WEEKS} semaines. Indemnité de licenciement = {STAFF_SEVERANCE_MONTHS} mois. Découvert autorisé avec agios — liquidation sous {fmt(LIQUIDATION_FLOOR)} €.
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

          <SectionCard title="Patrimoine du label" icon={<Trophy size={11} />}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="font-mono text-[9px] uppercase text-ink-faint mb-1">Valeur du catalogue actif</p>
                <p className="font-impact text-xl">{fmt(legacy.activeCatalogValue)} €</p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase text-ink-faint mb-1">Certifications</p>
                <p className="font-impact text-xl">
                  🥇{legacy.certifCounts.or ?? 0} 💿{legacy.certifCounts.platine ?? 0} 💎{legacy.certifCounts.diamant ?? 0}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-ink-faint font-mono">
              Le catalogue actif, c'est ce qui tourne encore aujourd'hui — la vraie valeur du label si tu devais tout céder d'un coup. {fmt(state.totalStreamsAllTime)} streams cumulés depuis le début, {state.totalReleases} sorties publiées : c'est déjà une histoire.
            </p>
          </SectionCard>

          {/* v17 §23 — encyclopédie professionnelle : les notions réelles du
              métier débloquées au fil de la partie, toujours consultables. */}
          <SectionCard title="Encyclopédie pro" icon={<BookOpen size={11} />}>
            {state.seenConcepts.length === 0 ? (
              <p className="text-sm text-ink-faint">
                Les vraies notions du métier (recoupment, dédouanement de samples, certifications...) se débloquent ici au fil de ta partie, la première fois que tu y es confronté.
              </p>
            ) : (
              <div className="space-y-3">
                {state.seenConcepts.map((id) => {
                  const entry = PRO_KNOWLEDGE[id];
                  if (!entry) return null;
                  return (
                    <div key={id} className="border-l-2 border-gold/30 pl-3">
                      <p className="text-sm font-medium text-gold">{entry.title}</p>
                      <p className="text-xs text-ink-muted leading-relaxed mt-0.5">{entry.body}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-ink-faint font-mono mt-3">
              {state.seenConcepts.length} / {Object.keys(PRO_KNOWLEDGE).length} notions débloquées.
            </p>
          </SectionCard>

          <SectionCard title="Palmarès — certifications" icon={<Trophy size={11} />}>
            {state.certifications.length === 0 ? (
              <p className="text-sm text-ink-faint">
                Aucune certification pour l'instant — 500 000 streams cumulés sur une sortie = single d'or. À toi de jouer.
              </p>
            ) : (
              <div className="space-y-2">
                {[...state.certifications].reverse().map((c, i) => (
                  <div key={`${c.title}-${c.level}-${i}`} className="flex items-center justify-between gap-3">
                    <p className="text-sm truncate min-w-0">
                      {c.level === "or" ? "🥇" : c.level === "platine" ? "💿" : "💎"} « {c.title} » — {c.artistName}
                    </p>
                    <span className="font-mono text-[10px] text-ink-faint uppercase shrink-0">
                      {c.level} · S{c.week}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-ink-faint font-mono mt-3">
              Or : 500 k · Platine : 1,5 M · Diamant : 4 M streams cumulés. (En vrai en France : 15 M / 30 M / 50 M d'équivalents streams.)
            </p>
          </SectionCard>

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

      {/* ===== Onglet AGENDA — v16 §1 : le calendrier comme cœur du jeu ===== */}
      {tab === "agenda" && (
        <div className="pt-4 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-1">
            Semaine {state.week} — ce qui t'attend
          </p>
          <p className="text-[11px] text-ink-faint font-mono mb-3">
            Toutes les échéances réelles en cours, triées par semaine — projet, dates, dilemmes, promesses, fins de contrat.
          </p>
          {(() => {
            const agenda = computeAgenda(state);
            if (agenda.length === 0) {
              return (
                <p className="text-sm text-ink-faint glass rounded-2xl p-4">
                  Rien de programmé pour l'instant — lance une prod, réponds aux offres, ou attends que le monde bouge.
                </p>
              );
            }
            const iconFor = (kind: string) =>
              kind === "project" ? <Disc3 size={13} /> :
              kind === "concert" ? <Mic2 size={13} /> :
              kind === "choice" ? <AlertCircle size={13} /> :
              kind === "promise" ? <Handshake size={13} /> :
              <Users size={13} />;
            return (
              <div className="card divide-y divide-white/8 overflow-hidden">
                {agenda.map((item) => {
                  const weeksAway = item.week - state.week;
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                      <span className="shrink-0 w-9 h-9 rounded-full flex flex-col items-center justify-center font-mono" style={{ background: `${accent}1f`, color: accent }}>
                        {iconFor(item.kind)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        <p className="text-xs text-ink-muted mt-0.5">{item.detail}</p>
                      </div>
                      <span className="font-mono text-[10px] text-ink-faint shrink-0 uppercase">
                        {weeksAway <= 0 ? "cette semaine" : `S${item.week}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ===== Onglet TÉLÉPHONE — v16 §19 : le smartphone comme interface ===== */}
      {tab === "telephone" && (
        <div className="pt-4">
          <div className="max-w-sm mx-auto">
            <div className="rounded-[2rem] border border-white/15 bg-black/40 p-3 shadow-xl">
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <span className="font-mono text-[10px] text-ink-faint">Semaine {state.week}</span>
                <span className="font-mono text-[10px] text-ink-faint">🔋 100%</span>
              </div>
              <div className="rounded-2xl overflow-hidden bg-white/[0.02] border border-white/8">
                <div className="px-4 py-3 border-b border-white/8" style={{ background: `linear-gradient(135deg, ${accent}30, transparent)` }}>
                  <p className="font-display text-sm font-semibold">Notifications</p>
                  <p className="font-mono text-[9px] text-ink-faint">{state.messages.length} non lues</p>
                </div>
                {state.messages.length === 0 ? (
                  <p className="text-sm text-ink-faint p-6 text-center">Aucune notification pour l'instant.</p>
                ) : (
                  <div className="divide-y divide-white/6 max-h-[60vh] overflow-y-auto">
                    {state.messages.map((m) => (
                      <div key={m.id} className="px-4 py-3">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <p className="text-sm font-semibold truncate">{m.title}</p>
                          <span className="font-mono text-[9px] text-ink-faint shrink-0">S{m.week}</span>
                        </div>
                        <p className="text-xs text-ink-muted leading-relaxed">{m.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-[11px] text-ink-faint font-mono text-center mt-4">
              Le fil de tout ce qui se passe autour du label, format notifications.
            </p>
          </div>
        </div>
      )}

      {/* ===== Onglet RÉSEAUX — v16 §14 : réseaux sociaux vivants ===== */}
      {tab === "reseaux" && (
        <div className="pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-3">
            Ce qui se dit sur les réseaux
          </p>
          {state.socialFeed.length === 0 ? (
            <p className="text-sm text-ink-faint glass rounded-2xl p-4">
              Rien pour l'instant — les réseaux réagissent aux vrais événements : certifications, buzz, classement, silence prolongé...
            </p>
          ) : (
            <div className="space-y-3">
              {state.socialFeed.map((post) => (
                <div key={post.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0" style={{ background: `${accent}1f` }}>
                      {post.avatar}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{post.handle}</p>
                      <p className="font-mono text-[9px] text-ink-faint">Semaine {post.week}</p>
                    </div>
                  </div>
                  <p className="text-sm text-ink-muted leading-relaxed mb-3">{post.text}</p>
                  <div className="flex items-center gap-4 font-mono text-[10px] text-ink-faint">
                    <span className="inline-flex items-center gap-1"><Heart size={11} /> {fmt(post.likes)}</span>
                    <span className="inline-flex items-center gap-1"><MessageCircle size={11} /> {fmt(post.comments)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-ink-faint font-mono mt-4">
            Comptes et contenus entièrement fictifs, générés par les événements réels de ta partie — jamais gratuits.
          </p>
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
