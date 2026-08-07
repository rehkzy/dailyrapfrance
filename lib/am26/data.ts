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
  ar: {
    label: "Responsable A&R",
    short: "A&R",
    effect: "Affine les estimations de potentiel des talents du marché semaine après semaine, élargit le vivier, et déniche des pépites que les autres ne voient pas.",
    baseSalary: [2300, 4200],
  },
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

export const STAFF_ROLE_KEYS: StaffRole[] = ["ar", "da", "presse", "marketing", "inge", "cm", "booker"];

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

// Tarifs calés sur les prix réels du milieu en France, échelle "artiste en
// développement" : lease d'instru ~30-70 €, exclu ~200-500 €, prod prestige
// 1000-3000 € ; home studio à la séance ; clip street 500-1500 €, réalisateur
// 4000-10000 € ; agence RP 1500-3000 € la campagne.
export const BUDGET_PRESETS: Record<BudgetKey, BudgetOption[]> = {
  instru: [
    { label: "Lease (non-exclusif)", v: 50, mult: 0.85 },
    { label: "Achat exclusif", v: 300, mult: 1.0 },
    { label: "Exclusif prestige", v: 1800, mult: 1.15 },
  ],
  enregistrement: [
    { label: "Home studio", v: 200, add: 2 },
    { label: "Studio pro", v: 800, add: 6 },
    { label: "Résidence studio", v: 2500, add: 12 },
  ],
  mix: [
    { label: "Auto-mix", v: 100, mult: 0.9 },
    { label: "Ingé son", v: 500, mult: 1.0 },
    { label: "Ingé son reconnu", v: 1500, mult: 1.12 },
  ],
  mastering: [
    { label: "Standard", v: 80, mult: 0.92 },
    { label: "Pro", v: 250, mult: 1.0 },
    { label: "Broadcast", v: 800, mult: 1.1 },
  ],
  cover: [
    { label: "Template", v: 0, mult: 0.92 },
    { label: "Graphiste freelance", v: 300, mult: 1.0 },
    { label: "DA + shooting", v: 1500, mult: 1.12 },
  ],
  clip: [
    { label: "Aucun", v: 0, mult: 1.0, hypeBoost: 0 },
    { label: "Clip street", v: 800, mult: 1.08, hypeBoost: 8 },
    { label: "Réalisateur", v: 6000, mult: 1.18, hypeBoost: 16 },
  ],
  // v11 — le concept du clip est un choix créatif séparé du budget de tournage :
  // même avec un petit budget, le bon concept peut faire la différence.
  clipConcept: [
    { label: "Performance simple", v: 0, mult: 0.96 },
    { label: "Narratif", v: 500, mult: 1.06 },
    { label: "Concept artistique", v: 2000, mult: 1.15 },
  ],
  distribution: [
    { label: "Sélective", v: 50, mult: 0.85 },
    { label: "Large", v: 300, mult: 1.0 },
    { label: "Premium (pitch playlists)", v: 1500, mult: 1.2 },
  ],
  publicite: [
    { label: "Bouche à oreille", v: 150, mult: 1.0 },
    { label: "Campagne ciblée", v: 1200, mult: 1.35 },
    { label: "Campagne large", v: 4000, mult: 1.8 },
  ],
  presse: [
    { label: "Aucune", v: 0, mediaChance: 0 },
    { label: "Relance presse", v: 700, mediaChance: 0.35 },
    { label: "Agence RP", v: 2500, mediaChance: 0.7 },
  ],
};

export const BUDGET_LABELS: Record<BudgetKey, string> = {
  instru: "Instru", enregistrement: "Enregistrement", mix: "Mix", mastering: "Mastering",
  cover: "Cover / Artwork", clip: "Tournage du clip", clipConcept: "Concept du clip",
  distribution: "Distribution", publicite: "Publicité", presse: "Presse / RP",
};

export const BUDGET_GROUPS: { title: string; keys: BudgetKey[] }[] = [
  { title: "7 · Production", keys: ["instru", "enregistrement", "mix", "mastering"] },
  { title: "8 · Visuel", keys: ["cover", "clip", "clipConcept"] },
  { title: "9 · Sortie", keys: ["distribution", "publicite", "presse"] },
];

export const DEFAULT_BUDGET_CHOICE: Record<BudgetKey, number> = {
  instru: 1, enregistrement: 1, mix: 1, mastering: 1, cover: 1, clip: 1, clipConcept: 1, distribution: 1, publicite: 1, presse: 1,
};

// ---------- Constantes de partie ----------

export const START_CASH = 40000;
export const SEASON_WEEKS = 52;
export const MONTH_WEEKS = 4;              // 1 mois de jeu = 4 semaines (paie en fin de mois)
export const SAVE_KEY = "drf-am26";
export const SAVE_VERSION = 13;            // v15 : incertitude, promesses, carrières, patrimoine, crises
export const OLD_SAVE_BACKUP_KEY = "drf-am26-v5-backup";
export const STREAM_RATE = 0.0032;         // € pour 1 stream (~3,20 € / 1000)
// Droits voisins + édition (SACEM/SDRM, abstraction) : quote-part label sur
// l'exploitation, en plus des revenus streaming/radio directs.
export const DROITS_RATE = 0.12;
// Rémunération équitable & droits voisins par passage radio (abstraction).
export const RADIO_RATE = 9;
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

// Paliers de certification (échelle du jeu — en vrai, en France : single d'or
// = 15 M d'équivalents streams, platine = 30 M, diamant = 50 M).
export const CERT_LEVELS: { level: "or" | "platine" | "diamant"; at: number; emoji: string; rep: number }[] = [
  { level: "or", at: 500000, emoji: "🥇", rep: 3 },
  { level: "platine", at: 1500000, emoji: "💿", rep: 5 },
  { level: "diamant", at: 4000000, emoji: "💎", rep: 8 },
];

// ---------- v10 : création musicale ----------

// BPM idéal par style — coller au tempo du style rapporte, s'en éloigner coûte.
// Repères réalistes du rap FR : la drill est rapide et sombre, le boom bap
// plus posé, la trap et le cloud dans l'entre-deux, l'afro chaloupé.
export const STYLE_BPM: Record<string, [number, number]> = {
  Drill: [138, 145],
  Trap: [125, 145],
  "Boom bap": [85, 96],
  Cloud: [60, 80],
  Afro: [95, 110],
  Mélo: [70, 90],
};
export const BPM_MIN = 60;
export const BPM_MAX = 180;

export const SONG_STRUCTURES: { id: "classique" | "minimaliste" | "experimental"; label: string; desc: string }[] = [
  { id: "classique", label: "Classique (couplets/refrain)", desc: "Format radio éprouvé — équilibré, sans surprise." },
  { id: "minimaliste", label: "Sans refrain", desc: "Format plus confidentiel : moins de portée immédiate, mais un public qui reste fidèle plus longtemps." },
  { id: "experimental", label: "Expérimental", desc: "Pari risqué : plus de portée potentielle et de buzz, mais un public qui décroche plus vite si ça ne prend pas." },
];

// Coût d'un featuring avec un autre artiste du roster — part de sa cote.
export const FEATURING_FEE_RATE = 0.15;

// ---------- v11 : campagne de sortie ----------

// Boost de campagne post-sortie (relance presse/réseaux) — utilisable une
// fois par sortie, dans les 4 semaines qui suivent le drop.
export const PUSH_COST = 500;
export const PUSH_WINDOW_WEEKS = 4;

// ---------- v12 : tournées & contrats ----------

export const TOUR_MIN_DATES = 3;
export const TOUR_MAX_DATES = 5;
export const CONTRACT_MIN_WEEKS = 30;
export const CONTRACT_MAX_WEEKS = 48;
export const CONTRACT_RENEWAL_WINDOW = 4; // semaines avant échéance où le dilemme apparaît
export const CONTRACT_RENEWAL_RAISE = 0.15; // hausse de salaire demandée au renouvellement

// Clashs de personnalité — tensions d'équipe réalistes (v12, relations légères).
export const PERSONALITY_CLASHES: [string, string][] = [
  ["Instable", "Perfectionniste"],
  ["Carriériste", "Loyal"],
];

// ---------- v13 : Label Intelligence Center (data réaliste) ----------

// §35 du GDD data-réalisme : pas de prix fixe au stream. Le premium paie
// nettement plus que le freemium (publicitaire) — écart réaliste ~5-6x.
export const PREMIUM_STREAM_RATE = 0.0044;
export const FREEMIUM_STREAM_RATE = 0.0008;

// §20-23 : répartition plateformes du marché FR (Deezer, français, y est
// structurellement plus fort qu'à l'international — ordre de grandeur réaliste).
export const PLATFORM_BASE_SPLIT: Record<string, number> = {
  Spotify: 0.52, Deezer: 0.22, "Apple Music": 0.14, "Amazon Music": 0.07, Autres: 0.05,
};

// §20, §52 : source des streams — d'où vient l'écoute.
export const STREAM_SOURCE_BASE_SPLIT: Record<string, number> = {
  "Playlists éditoriales": 0.16, "Algorithmique / recommandé": 0.30,
  "Profil & catalogue": 0.26, "Radio / autoplay": 0.18, "Recherche": 0.10,
};

// §31 du GDD : seuils SNEP RÉELS 2026 pour référence pédagogique (affichés
// dans les messages). Le jeu certifie sur une échelle adaptée à son économie
// (CERT_LEVELS ci-dessus) car reproduire 15M de streams littéralement casserait
// l'équilibre — mais le joueur voit toujours le vrai seuil français.
export const SNEP_REAL_THRESHOLDS = {
  or: "15 000 000 équivalents streams",
  platine: "30 000 000 équivalents streams",
  diamant: "50 000 000 équivalents streams",
};
// §32.3 : conversion freemium → équivalent premium pour les charts/certifs officiels.
export const SNEP_FREEMIUM_RATIO = 7; // 7 streams freemium = 1 équivalent premium

// §51 : streaming artificiel — un prestataire douteux propose des streams
// garantis. Risque de détection réel, sanction sévère si pris.
export const FRAUD_DETECTION_CHANCE = 0.4;
export const FRAUD_REPUTATION_PENALTY = 8;

// ---------- v14 : monde physique, marketplace, autonomie des artistes ----------

// §2 — Lieu de travail simplifié : un home studio aménagé réduit durablement
// le coût des sessions d'enregistrement (achat unique, effet permanent).
export const HOME_STUDIO_COST = 8000;
export const HOME_STUDIO_DISCOUNT = 0.35; // -35% sur le budget "enregistrement"

// §8 — Marketplace de beatmakers : noms fictifs, pas de vrais artistes/labels.
export const BEATMAKER_NAMES = [
  "Kydro", "Lassko", "Wavenoir", "Tempo Sale", "Ondine Beats", "Fresk",
  "Dalla Prod", "Nuit Grave", "Skalpel", "Rimeur Fantôme", "Basbleu", "Miro",
];

// §15 — Momentum & surexposition : sortir trop tôt après la précédente sortie
// fatigue le public ; disparaître trop longtemps casse le momentum.
export const SUREXPOSITION_WEEKS = 3;      // en dessous de ce délai : pénalité
export const SUREXPOSITION_PENALTY = 0.82; // multiplicateur qualité/portée
export const MOMENTUM_LOSS_WEEKS = 14;     // au-delà : hype décroît plus vite
export const MOMENTUM_LOSS_EXTRA_DECAY = 1.2;

// §9 — Vault musicale.
export const VAULT_CHANCE = 0.22;          // chance qu'une session laisse une chute
export const VAULT_RELEASE_COST = 400;     // coût pour sortir une chute de vault
export const VAULT_RELEASE_WEEKS = 1;      // sortie quasi immédiate, pas de vrai studio

// ---------- v15 : incertitude, mémoire, carrières, patrimoine, crises ----------

// §11-12 — registre des promesses. Un seul type de promesse pour l'instant :
// "tu seras sur mon prochain projet", vérifiable sans ambiguïté.
export const PROMISE_WINDOW_WEEKS = 10;      // délai laissé pour tenir la promesse
export const PROMISE_KEPT_HYPE_BONUS = 10;   // bonus si tenue
export const PROMISE_KEPT_MOTIV_BONUS = 8;
export const PROMISE_BROKEN_HYPE_PENALTY = 12; // pénalité si rompue — plus lourd qu'un simple oubli
export const PROMISE_BROKEN_REP_PENALTY = 4;
export const PROMISE_CHANCE = 0.1;           // chance par semaine qu'un artiste en demande une

// §4-5 — avis contradictoires du staff sur une sortie fraîche (incertitude
// assumée : jamais de vérité affichée, seulement des interprétations).
export const STAFF_TAKES_BULLISH = [
  "Les indicateurs sont excellents. Il faut investir immédiatement.",
  "Ça peut devenir énorme — fonce là-dessus tant que c'est chaud.",
  "Le public accroche fort. C'est le moment de pousser.",
];
export const STAFF_TAKES_CAUTIOUS = [
  "Attendons encore un peu avant de tirer des conclusions.",
  "C'est encourageant, mais rien n'est joué à ce stade.",
  "Trop tôt pour s'emballer — laissons la courbe se dessiner.",
];

// §18 — crises de production : un risque concret lié à la préparation, pas un
// événement gratuit. Un beatmaker du marketplace peut avoir livré une prod
// dont un sample n'est pas dédouané — ça se découvre au pire moment.
export const CLEARANCE_RISK_CHANCE = 0.1;    // chance qu'une prod de marketplace ait ce souci
export const CLEARANCE_COST_RATE = 0.25;     // coût du dédouanement = 25% du coût de la prod
