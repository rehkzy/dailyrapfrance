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

export type StaffRole = "ar" | "da" | "presse" | "marketing" | "inge" | "cm" | "booker";

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
  radioPlays: number; // passages radio hebdo (rémunération équitable + boost de streams)
  expected: number;   // prévision de démarrage annoncée à la sortie (suspense S+1)
  certified: "or" | "platine" | "diamant" | null; // dernier palier atteint
};

// Objectifs de saison — arcs à deadline avec récompense (aides, synchro...).
// Inspirés des vrais leviers de financement du secteur en France.
export type Objective = {
  id: string;
  label: string;
  desc: string;
  metric: "streams" | "reputation" | "certifs";
  target: number;
  deadlineWeek: number;
  reward: number;       // € versés si atteint avant la deadline
  rewardLabel: string;  // ex : "Aide à la création (CNM)"
  status: "active" | "done" | "failed";
};

// Dilemmes de l'industrie — dossiers à trancher (2 options, vrais arbitrages).
export type ChoiceEvent = {
  id: string;
  kind: "brand" | "playlist" | "advance" | "feat";
  refId: string | null; // id de la sortie ou de l'artiste concerné
  createdWeek: number;
  expiresWeek: number;
  title: string;
  body: string;
  optionA: string;      // libellé du choix A (l'accepter)
  optionB: string;      // libellé du choix B (refuser / alternative)
};

// Avance distributeur : cash immédiat contre une part du streaming pendant N semaines.
export type AdvanceDeal = { weeksLeft: number; share: number };

// Certification obtenue (palmarès carrière — survit à la vente du catalogue).
export type Certification = { title: string; artistName: string; level: "or" | "platine" | "diamant"; week: number };

// ---------- Monde vivant ----------

export type RivalStrategy = "agressif" | "prudent" | "opportuniste";

// v8 : chaque artiste rival a ses propres streams — nécessaires aux classements
// par artiste et pour que les sorties rivales soient crédibles.
export type RivalArtist = { name: string; weeklyStreams: number };

export type RivalLabel = {
  name: string;
  reputation: number;             // 0-100
  strategy: RivalStrategy;
  roster: RivalArtist[];          // artistes signés (dont ceux volés au joueur)
  lastRelease: string | null;     // libellé de leur dernière sortie
};

// Sorties du monde (rivaux) — alimentent le Top Projets de la saison.
export type WorldRelease = {
  id: string;
  labelName: string;
  artistName: string;
  title: string;
  weeklyStreams: number;
  totalStreams: number;
  weeksOut: number;
};

// Tendances par style — multiplicateur autour de 1, qui dérive chaque semaine.
export type Trends = Record<string, number>;

// Détail des revenus de la semaine écoulée — affiché dans Finances.
export type IncomeBreakdown = {
  streaming: number;  // plateformes de streaming
  droits: number;     // droits voisins + édition (SACEM & co, abstraction)
  radio: number;      // rémunération équitable des passages radio
  concerts: number;   // cachets encaissés cette semaine
};

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
  worldReleases: WorldRelease[];  // sorties rivales (Top Projets)
  trends: Trends;
  loan: Loan | null;
  lastWeekIncome: IncomeBreakdown;
  pendingConcertIncome: number;   // cachets encaissés depuis la dernière avancée
  objectives: Objective[];        // arcs de saison (aides, synchro, bonus)
  pendingChoices: ChoiceEvent[];  // dilemmes à trancher (max 1 actif)
  advanceDeal: AdvanceDeal | null; // avance distributeur en cours de remboursement
  certifications: Certification[]; // palmarès carrière
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

export type LabelChartEntry = {
  key: string;
  name: string;
  streams: number;      // streams hebdo agrégés du label
  reputation: number;
  mine: boolean;
};

export type ProjectChartEntry = {
  key: string;
  labelName: string;
  artistName: string;
  title: string;
  totalStreams: number;
  mine: boolean;
};

// Onglets de l'interface — vit ici pour que l'UI et d'éventuels helpers du
// moteur partagent la même source de vérité.
export type Tab = "label" | "artistes" | "marche" | "staff" | "studio" | "charts" | "messages" | "finances" | "stats";
