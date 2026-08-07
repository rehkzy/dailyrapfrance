/*
 * ARTISTS MANAGER 2026 — v6 : types du moteur de simulation.
 *
 * Refonte "simulation systémique" (brief Florian) : le moteur vit dans lib/am26/
 * (types, données, génération de personnes, monde vivant, moteur hebdo) et l'UI
 * dans app/jeux/artists-manager/page.tsx ne fait qu'afficher et déclencher.
 *
 * Principes appliqués partout :
 *  - Les personnes (staff, artistes) ont des attributs VISIBLES et CACHÉS —
 *    le vrai niveau n'est jamais parfaitement connu, seulement une fourchette.
 *  - Chaque poste de staff a un effet MÉCANIQUE distinct (pas décoratif).
 *  - Le monde agit sans le joueur : labels rivaux qui signent/sortent, tendances
 *    de styles qui montent et descendent, candidats qui quittent le marché.
 *  - "Continuer" ne fait que résoudre ce qui a été préparé (négos, offres...).
 */

// ---------- Artistes ----------

export type Artist = {
  id: string;
  name: string;
  style: string;
  flow: number;      // 0-20 (visible : c'est le niveau actuel, mesurable)
  plume: number;     // 0-20
  charisme: number;  // 0-20
  hype: number;      // 0-100
  salary: number;    // avance mensuelle (€/mois)
  signingFee: number;
  // v6 — potentiel caché : jamais montré tel quel, seulement une fourchette
  // estimée par le scouting. Un artiste peut progresser vers son potentiel
  // au fil des semaines (flow/plume qui montent).
  potential: number;              // 0-20, CACHÉ
  shownPotential: [number, number]; // fourchette affichée au joueur
};

// ---------- Staff (personnes simulées) ----------

export type StaffRole = "da" | "presse" | "marketing" | "inge" | "cm" | "booker";

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  city: string;
  role: StaffRole;
  expYears: number;
  reputation: number;             // 0-100, visible
  skill: number;                  // 0-20, CACHÉ — le vrai niveau
  shownSkill: [number, number];   // fourchette visible (scouting imparfait)
  personality: string;            // trait de personnalité (influence les négos)
  askSalary: number;              // salaire mensuel demandé (€/mois)
  availabilityWeeks: number;      // encore dispo X semaines sur le marché
  styleAffinity: string | null;   // style de prédilection (bonus avec artiste assorti)
  motivation: number;             // 0-100
};

// Négociation d'embauche — se résout à la semaine suivante, pas instantanément.
export type Negotiation = {
  id: string;
  personId: string;
  offer: number;                  // salaire hebdo proposé
  createdWeek: number;
  status: "pending" | "accepted" | "refused" | "countered";
  counter: number | null;         // contre-proposition éventuelle
};

// ---------- Concerts (générés par le booker, à accepter/refuser) ----------

export type ConcertOffer = {
  id: string;
  artistId: string;
  artistName: string;
  venue: string;
  cityName: string;
  fee: number;
  expiresWeek: number;
};

// ---------- Production ----------

export type BudgetOption = {
  label: string;
  v: number;
  mult?: number;
  add?: number;
  hypeBoost?: number;
  mediaChance?: number;
};

export type BudgetKey =
  | "instru" | "enregistrement" | "mix" | "mastering"
  | "cover" | "clip" | "distribution" | "publicite" | "presse";

export type Project = {
  artistId: string;
  type: "single" | "ep" | "album";
  title: string;
  weeksLeft: number;
  quality: number;
  reach: number;
  adsMult: number;
  mediaChance: number;
  hypeBoost: number;
  retention: number;
};

export type Release = {
  id: string;
  artistId: string;
  artistName: string;
  artistStyle: string;
  title: string;
  type: Project["type"];
  quality: number;
  retention: number;
  weeklyStreams: number;
  totalStreams: number;
  weeksOut: number;
};

// ---------- Monde vivant ----------

export type RivalStrategy = "agressif" | "prudent" | "opportuniste";

export type RivalLabel = {
  name: string;
  streams: number;                // streams hebdo de leur sortie phare
  reputation: number;             // 0-100
  strategy: RivalStrategy;
  rosterNames: string[];          // artistes qu'ils ont signés (dont ceux volés au joueur)
  lastRelease: string | null;     // titre de leur dernière sortie
};

// Tendances par style — multiplicateur autour de 1, qui dérive chaque semaine.
export type Trends = Record<string, number>;

// Prêt bancaire — un seul à la fois, remboursé par échéances mensuelles.
export type Loan = {
  amount: number;         // capital débloqué
  remaining: number;      // capital + intérêts restant à rembourser
  monthlyPayment: number; // prélevé à chaque fin de mois
  takenWeek: number;
};

// ---------- Divers ----------

export type Message = { id: string; week: number; title: string; body: string };

export type Profile = {
  firstName: string;
  pseudo: string;
  labelName: string;
  city: string;
  logo: string;
  color: string;
};

export type GameState = {
  version: number;                // 6 — sert au reset propre des vieilles sauvegardes
  week: number;
  cash: number;
  reputation: number;
  roster: Artist[];
  market: Artist[];
  staff: Person[];                // équipe en poste (1 max par rôle en v6)
  staffMarket: Person[];          // candidats disponibles sur le marché
  negotiations: Negotiation[];
  concertOffers: ConcertOffer[];
  project: Project | null;
  releases: Release[];
  messages: Message[];
  rivals: RivalLabel[];
  trends: Trends;
  loan: Loan | null;
  prevChartOrder: string[];
  totalReleases: number;
  totalStreamsAllTime: number;
  totalConcerts: number;
  profile: Profile | null;
  tutorialDone: boolean;
  gameOver: null | "bankrupt" | "season_end";
  scoreSaved: boolean;
};

export type ChartEntry = {
  key: string;
  name: string;
  title: string | null;
  streams: number;
  mine: boolean;
};

// Onglets de l'interface — vit ici pour que l'UI et d'éventuels helpers du
// moteur partagent la même source de vérité.
export type Tab = "label" | "artistes" | "marche" | "staff" | "studio" | "charts" | "messages" | "finances" | "stats";
