/*
 * ARTISTS MANAGER 2026 — v6 : données statiques du moteur.
 * Tout est fictif et générique — aucun nom réel d'artiste, de média, de salle,
 * de plateforme ou de distributeur.
 */

import type { BudgetKey, BudgetOption, StaffRole } from "./types";

// ---------- Pools de noms ----------

export const ARTIST_NAMES = [
  "Zeyko", "Diako", "Sirem", "Kaira", "Noxx", "Tismé", "Rakelm", "Melza",
  "Solda K", "Ylane", "Braska", "Numen", "Vexo", "Damsa", "Kliff", "Orya",
  "Sazko", "Belka", "Riman", "Osyr", "Djelo", "Kanya", "Werso", "Halia",
];

export const STYLES = ["Drill", "Mélo", "Boom bap", "Trap", "Cloud", "Afro"];

export const FIRSTNAMES = [
  "Yanis", "Sofiane", "Inès", "Léa", "Mehdi", "Nadia", "Théo", "Awa",
  "Karim", "Julie", "Bakary", "Sarah", "Enzo", "Lina", "Ibrahim", "Chloé",
  "Rayan", "Fatou", "Lucas", "Amel", "Dylan", "Maëlys", "Moussa", "Eva",
];

export const LASTNAMES = [
  "Diallo", "Martin", "Benali", "Traoré", "Lefèvre", "Kacem", "Moreau",
  "N'Diaye", "Rossi", "Haddad", "Petit", "Cissé", "Garnier", "Amrani",
  "Leroy", "Sow", "Fontaine", "Bouzid", "Marchand", "Keïta",
];

export const CITIES = ["Paris", "Marseille", "Lyon", "Lille", "Seine-Saint-Denis", "Toulouse", "Strasbourg", "Bruxelles"];

export const PROJECT_TITLES = [
  "Minuit", "Zone 7", "Éclipse", "Sans retour", "Or noir", "Antidote",
  "Mirage", "Balafre", "Horizon", "Vertige", "Cendres", "Apnée",
  "Crépuscule", "Ravin", "Olympe", "Frontière", "Averse", "Béton rose",
];

export const RIVAL_TITLES = [
  "Sirène", "Aube grise", "Palissade", "Nova", "Contrefaçon", "Dernier étage",
  "Braquage doux", "Tempête", "Neuvième vie", "Pavé", "Lueur", "Angle mort",
];

export const VENUES = [
  "Le Kraft", "Warehouse 93", "L'Alvéole", "Le Bastion", "La Verrière",
  "Salle des Docks", "Le Continental", "Hangar Nord", "La Fonderie", "Le Prisme",
];

export const LOGOS = ["🎤", "💿", "🔥", "🐺", "🦅", "💎", "👑", "🌙"];

export const COLORS = [
  { label: "Rouge signal", v: "#F0001C" },
  { label: "Braise", v: "#FF3B4E" },
  { label: "Bordeaux", v: "#A3121B" },
  { label: "Or", v: "#D4A017" },
];

// ---------- Labels rivaux (agents du monde vivant) ----------

export const RIVAL_LABELS: { name: string; strategy: "agressif" | "prudent" | "opportuniste" }[] = [
  { name: "Wesko Records", strategy: "agressif" },
  { name: "Lynka Music", strategy: "prudent" },
  { name: "7ID Gang", strategy: "agressif" },
  { name: "Marzo Prod", strategy: "opportuniste" },
  { name: "Selva Corp", strategy: "prudent" },
  { name: "Dosia Label", strategy: "opportuniste" },
];

export const RIVAL_ARTIST_NAMES = [
  "Priam", "KMR", "Nelsko", "Waris", "Tayna", "Zorlak", "Miya", "Fesko",
  "Douma", "Serka", "Livio", "Anka",
];

// ---------- Staff : rôles et effets mécaniques ----------

// Chaque rôle a un effet DISTINCT et documenté — la règle absolue du brief :
// "est-ce que cette fonctionnalité donne une vraie capacité d'action et crée
// des conséquences simulées ?" — ici, oui pour chacun.
export const STAFF_ROLES: Record<StaffRole, { label: string; short: string; effect: string; baseSalary: [number, number] }> = {
  da: {
    label: "Directeur artistique",
    short: "DA",
    effect: "Améliore la qualité des productions (jusqu'à +20 %). Bonus supplémentaire si son style de prédilection correspond à l'artiste.",
    baseSalary: [2500, 4500],
  },
  presse: {
    label: "Attaché(e) de presse",
    short: "Presse",
    effect: "Augmente la chance qu'un média parle de chaque sortie, et entretient ta réputation chaque semaine.",
    baseSalary: [2000, 3500],
  },
  marketing: {
    label: "Responsable marketing",
    short: "Marketing",
    effect: "Rend chaque euro de publicité plus efficace : meilleur démarrage de streams à la sortie.",
    baseSalary: [2200, 4000],
  },
  inge: {
    label: "Ingénieur(e) son maison",
    short: "Ingé son",
    effect: "Améliore le rendu mix/mastering de toutes les prods (qualité et tenue dans le temps).",
    baseSalary: [2200, 3800],
  },
  cm: {
    label: "Community manager",
    short: "CM",
    effect: "Ralentit la perte de hype du roster et fait remonter la hype des artistes délaissés.",
    baseSalary: [1800, 2800],
  },
  booker: {
    label: "Booker",
    short: "Booker",
    effect: "Décroche des offres de concert (cachets à accepter ou refuser). Meilleur booker = meilleures salles, meilleurs cachets.",
    baseSalary: [2000, 3200],
  },
};

export const STAFF_ROLE_KEYS: StaffRole[] = ["da", "presse", "marketing", "inge", "cm", "booker"];

// Traits de personnalité — influencent les négociations (et poseront les bases
// des relations humaines du point 15 en v10).
export const PERSONALITIES: { name: string; desc: string; negoMod: number; refusesLowball: boolean }[] = [
  { name: "Loyal", desc: "Accepte plus facilement, s'investit sur la durée.", negoMod: 0.10, refusesLowball: false },
  { name: "Ambitieux", desc: "Veut un label qui monte — sensible à ta réputation.", negoMod: 0, refusesLowball: false },
  { name: "Carriériste", desc: "Ne descendra jamais sous son salaire demandé.", negoMod: -0.05, refusesLowball: true },
  { name: "Perfectionniste", desc: "Exigeant en négo, mais rarement décevant en poste.", negoMod: -0.08, refusesLowball: false },
  { name: "Discret", desc: "Peu d'exigences, peu de vagues.", negoMod: 0.05, refusesLowball: false },
  { name: "Instable", desc: "Facile à convaincre... et à perdre.", negoMod: 0.12, refusesLowball: false },
];

// ---------- Production : formats et chaîne de budget ----------

export const TYPE_META = {
  single: { label: "Single", weeks: 2, studioBase: 1 },
  ep: { label: "EP", weeks: 4, studioBase: 1.6 },
  album: { label: "Album", weeks: 7, studioBase: 2.4 },
} as const;

// Tarifs calés sur les prix réels du milieu en France (ordres de grandeur indé) :
// lease d'instru ~30-70 €, exclu 500-2000 €, prod prestige 3000-8000 € ; studio
// 300-600 €/jour ; mix 150-400 €/titre (800-2500 € pour un ingé reconnu à
// l'échelle d'un projet) ; mastering 80-150 €/titre ; clip street 1500-4000 €,
// réalisateur 8000-25000 € ; agence RP 2000-5000 € la campagne.
export const BUDGET_PRESETS: Record<BudgetKey, BudgetOption[]> = {
  instru: [
    { label: "Lease (non-exclusif)", v: 50, mult: 0.85 },
    { label: "Achat exclusif", v: 800, mult: 1.0 },
    { label: "Exclusif prestige", v: 4000, mult: 1.15 },
  ],
  enregistrement: [
    { label: "Home studio", v: 300, add: 2 },
    { label: "Studio pro", v: 1500, add: 6 },
    { label: "Résidence studio", v: 5000, add: 12 },
  ],
  mix: [
    { label: "Auto-mix", v: 150, mult: 0.9 },
    { label: "Ingé son", v: 800, mult: 1.0 },
    { label: "Ingé son reconnu", v: 2500, mult: 1.12 },
  ],
  mastering: [
    { label: "Standard", v: 100, mult: 0.92 },
    { label: "Pro", v: 400, mult: 1.0 },
    { label: "Broadcast", v: 1200, mult: 1.1 },
  ],
  cover: [
    { label: "Template", v: 0, mult: 0.92 },
    { label: "Graphiste freelance", v: 500, mult: 1.0 },
    { label: "DA + shooting", v: 2500, mult: 1.12 },
  ],
  clip: [
    { label: "Aucun", v: 0, mult: 1.0, hypeBoost: 0 },
    { label: "Clip street", v: 2500, mult: 1.08, hypeBoost: 8 },
    { label: "Réalisateur", v: 12000, mult: 1.18, hypeBoost: 16 },
  ],
  distribution: [
    { label: "Sélective", v: 100, mult: 0.85 },
    { label: "Large", v: 500, mult: 1.0 },
    { label: "Premium (pitch playlists)", v: 2500, mult: 1.2 },
  ],
  publicite: [
    { label: "Bouche à oreille", v: 200, mult: 1.0 },
    { label: "Campagne ciblée", v: 2000, mult: 1.35 },
    { label: "Campagne large", v: 7000, mult: 1.8 },
  ],
  presse: [
    { label: "Aucune", v: 0, mediaChance: 0 },
    { label: "Relance presse", v: 1000, mediaChance: 0.35 },
    { label: "Agence RP", v: 3500, mediaChance: 0.7 },
  ],
};

export const BUDGET_LABELS: Record<BudgetKey, string> = {
  instru: "Instru", enregistrement: "Enregistrement", mix: "Mix", mastering: "Mastering",
  cover: "Cover / Artwork", clip: "Clip", distribution: "Distribution", publicite: "Publicité", presse: "Presse / RP",
};

export const BUDGET_GROUPS: { title: string; keys: BudgetKey[] }[] = [
  { title: "3 · Production", keys: ["instru", "enregistrement", "mix", "mastering"] },
  { title: "4 · Visuel", keys: ["cover", "clip"] },
  { title: "5 · Sortie", keys: ["distribution", "publicite", "presse"] },
];

export const DEFAULT_BUDGET_CHOICE: Record<BudgetKey, number> = {
  instru: 1, enregistrement: 1, mix: 1, mastering: 1, cover: 1, clip: 1, distribution: 1, publicite: 1, presse: 1,
};

// ---------- Constantes de partie ----------

export const START_CASH = 35000;
export const SEASON_WEEKS = 52;
export const MONTH_WEEKS = 4;              // 1 mois de jeu = 4 semaines (paie en fin de mois)
export const SAVE_KEY = "drf-am26";
export const SAVE_VERSION = 7;             // v7 : économie mensuelle réaliste + banque
export const OLD_SAVE_BACKUP_KEY = "drf-am26-v5-backup";
export const STREAM_RATE = 0.0032;         // € pour 1 stream (~3,20 € / 1000)
export const STAFF_SEVERANCE_MONTHS = 2;   // indemnité de licenciement (mois de salaire)

// Banque : découvert autorisé avec agios, liquidation seulement sous le plancher.
export const OVERDRAFT_RATE = 0.015;       // agios hebdo sur le montant à découvert
export const LIQUIDATION_FLOOR = -20000;   // en dessous → liquidation judiciaire
export const LOAN_INTEREST = 0.10;         // intérêts totaux du prêt
export const LOAN_MONTHS = 12;             // remboursé sur 12 échéances mensuelles
export const LOAN_OFFERS: { amount: number; minRep: number }[] = [
  { amount: 10000, minRep: 0 },
  { amount: 25000, minRep: 30 },
  { amount: 50000, minRep: 55 },
];
