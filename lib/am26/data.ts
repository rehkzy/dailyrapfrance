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
    baseSalary: [450, 1100],
  },
  presse: {
    label: "Attaché(e) de presse",
    short: "Presse",
    effect: "Augmente la chance qu'un média parle de chaque sortie, et entretient ta réputation chaque semaine.",
    baseSalary: [350, 850],
  },
  marketing: {
    label: "Responsable marketing",
    short: "Marketing",
    effect: "Rend chaque euro de publicité plus efficace : meilleur démarrage de streams à la sortie.",
    baseSalary: [400, 950],
  },
  inge: {
    label: "Ingénieur(e) son maison",
    short: "Ingé son",
    effect: "Améliore le rendu mix/mastering de toutes les prods (qualité et tenue dans le temps).",
    baseSalary: [380, 900],
  },
  cm: {
    label: "Community manager",
    short: "CM",
    effect: "Ralentit la perte de hype du roster et fait remonter la hype des artistes délaissés.",
    baseSalary: [300, 700],
  },
  booker: {
    label: "Booker",
    short: "Booker",
    effect: "Décroche des offres de concert (cachets à accepter ou refuser). Meilleur booker = meilleures salles, meilleurs cachets.",
    baseSalary: [350, 800],
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

export const BUDGET_PRESETS: Record<BudgetKey, BudgetOption[]> = {
  instru: [
    { label: "Lease (non-exclusif)", v: 300, mult: 0.85 },
    { label: "Achat exclusif", v: 1500, mult: 1.0 },
    { label: "Exclusif prestige", v: 4000, mult: 1.15 },
  ],
  enregistrement: [
    { label: "Home studio", v: 500, add: 2 },
    { label: "Studio pro", v: 2000, add: 6 },
    { label: "Résidence studio", v: 6000, add: 12 },
  ],
  mix: [
    { label: "Auto-mix", v: 300, mult: 0.9 },
    { label: "Ingé son", v: 1500, mult: 1.0 },
    { label: "Ingé son reconnu", v: 4000, mult: 1.12 },
  ],
  mastering: [
    { label: "Standard", v: 200, mult: 0.92 },
    { label: "Pro", v: 800, mult: 1.0 },
    { label: "Broadcast", v: 2500, mult: 1.1 },
  ],
  cover: [
    { label: "Template", v: 0, mult: 0.92 },
    { label: "Graphiste freelance", v: 600, mult: 1.0 },
    { label: "DA + shooting", v: 2500, mult: 1.12 },
  ],
  clip: [
    { label: "Aucun", v: 0, mult: 1.0, hypeBoost: 0 },
    { label: "Clip street", v: 3000, mult: 1.08, hypeBoost: 8 },
    { label: "Réalisateur", v: 10000, mult: 1.18, hypeBoost: 16 },
  ],
  distribution: [
    { label: "Sélective", v: 500, mult: 0.85 },
    { label: "Large", v: 2000, mult: 1.0 },
    { label: "Premium (pitch playlists)", v: 6000, mult: 1.2 },
  ],
  publicite: [
    { label: "Bouche à oreille", v: 500, mult: 1.0 },
    { label: "Campagne ciblée", v: 3000, mult: 1.35 },
    { label: "Campagne large", v: 9000, mult: 1.8 },
  ],
  presse: [
    { label: "Aucune", v: 0, mediaChance: 0 },
    { label: "Relance presse", v: 1500, mediaChance: 0.35 },
    { label: "Agence RP", v: 5000, mediaChance: 0.7 },
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

export const START_CASH = 30000;
export const SEASON_WEEKS = 52;
export const SAVE_KEY = "drf-am26";
export const SAVE_VERSION = 6;
export const OLD_SAVE_BACKUP_KEY = "drf-am26-v5-backup";
export const STREAM_RATE = 0.0032; // € pour 1 stream
export const STAFF_SEVERANCE_WEEKS = 4; // indemnité de licenciement (semaines de salaire)
