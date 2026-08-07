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
  // v12 — contrat à durée : un artiste n'est pas signé pour toujours. Le
  // renouvellement se négocie avant l'échéance (dilemme ChoiceEvent "renewal").
  contractWeeksLeft: number;
  contractWeeksTotal: number;
  leaving: boolean; // renouvellement refusé — partira en fin de contrat
  // v13 — recoupment (Label Intelligence Center) : la prime de signature est
  // une avance récupérable sur les revenus générés par l'artiste, comme dans
  // un vrai contrat. Tant qu'elle n'est pas recoupée, c'est le label qui
  // porte le risque financier.
  lifetimeRevenue: number;
  advanceRecouped: boolean;
  // v14 — momentum & surexposition (§15) : sortir trop vite après la
  // précédente sortie fatigue le public ; disparaître trop longtemps casse
  // le momentum. 0 = jamais sorti.
  lastReleaseWeek: number;
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
  dates: number; // 1 = date unique ; 3-5 = tournée (v12)
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
  | "cover" | "clip" | "clipConcept" | "distribution" | "publicite" | "presse";

// v10 — structure du morceau : un vrai arbitrage créatif, pas juste un curseur
// de budget. Chaque choix a un vrai effet mécanique et un vrai risque.
export type SongStructure = "classique" | "minimaliste" | "experimental";

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
  // v10 — création musicale construite.
  bpm: number;
  structure: SongStructure;
  featuringArtistId: string | null; // autre artiste du roster en featuring
  beatmakerId: string | null; // v14 — beatmaker choisi sur le marketplace
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
  pushed: boolean;    // v11 — boost de campagne post-sortie déjà utilisé ?
  // v13 — Label Intelligence Center : pas de prix fixe au stream, la réalité
  // de la donnée streaming (§19, §35 du GDD data-réalisme).
  premiumShare: number;              // 0-1, part d'écoutes premium (vs freemium)
  platformSplit: Record<string, number>;  // Spotify/Deezer/Apple/Amazon/Autres, somme = 1
  streamSource: Record<string, number>;   // playlists éditoriales/algo/profil/radio/recherche, somme = 1
  certAlerted: "or" | "platine" | "diamant" | null; // dernier palier signalé "proche du seuil"
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
  kind: "brand" | "playlist" | "advance" | "feat" | "renewal" | "fraud";
  refId: string | null; // id de la sortie ou de l'artiste concerné
  createdWeek: number;
  expiresWeek: number;
  title: string;
  body: string;
  optionA: string;      // libellé du choix A (l'accepter)
  optionB: string;      // libellé du choix B (refuser / alternative)
  fraudCost?: number;    // v13 — coût du dilemme "fraud" (streams artificiels)
  fraudStreams?: number; // v13 — streams promis par le prestataire douteux
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

// ---------- v14 : monde physique, marketplace, autonomie des artistes ----------

// §8 — Marketplace de prods et beatmakers : chaque prod a une existence
// propre, refusée elle peut devenir le hit d'un concurrent.
export type Beatmaker = {
  id: string;
  name: string;
  styleAffinity: string | null; // bonus si le style de l'artiste correspond
  qualityBonus: number;         // 0 à ~0.14, s'ajoute au multiplicateur qualité
  fee: number;                  // coût de la prod, en plus du budget instru
  exclusive: boolean;           // une exclu ne repasse pas sur le marché une fois prise
};

// §9 — Vault musicale : les chutes de studio ne sont pas perdues, elles
// dorment et peuvent ressortir plus tard, à moindre coût.
export type VaultTrack = {
  id: string;
  artistId: string;
  artistName: string;
  artistStyle: string;
  title: string;
  quality: number;    // hérité du projet dont la session est issue
  createdWeek: number;
};

// §6 — Autonomie des artistes : un artiste a parfois sa propre idée de
// projet. L'accepter la respecte (bonus d'inspiration) ; l'ignorer laisse
// filer l'occasion.
export type ArtistIdeaOffer = {
  id: string;
  artistId: string;
  artistName: string;
  type: Project["type"];
  title: string;
  pitch: string;         // ce que l'artiste dit pour convaincre
  qualityBonus: number;  // bonus d'inspiration si on suit son idée
  costDiscount: number;  // 0-1, réduction sur le coût studio par défaut
  expiresWeek: number;
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
  lastWeekIncome: IncomeBreakdown;    // estimation de la semaine qui vient de s'écouler
  confirmedIncome: IncomeBreakdown;   // v13 — chiffres consolidés de la semaine PRÉCÉDENTE (décalage de reporting réel)
  pendingConcertIncome: number;   // cachets encaissés depuis la dernière avancée
  objectives: Objective[];        // arcs de saison (aides, synchro, bonus)
  pendingChoices: ChoiceEvent[];  // dilemmes à trancher (max 1 actif)
  advanceDeal: AdvanceDeal | null; // avance distributeur en cours de remboursement
  certifications: Certification[]; // palmarès carrière
  // v14 — monde physique, marketplace, autonomie.
  hasHomeStudio: boolean;         // §2 — local aménagé, réduit durablement le coût d'enregistrement
  beatmakerMarket: Beatmaker[];   // §8 — marketplace de prods, tourne chaque semaine
  vault: VaultTrack[];            // §9 — chutes de studio en attente
  artistIdeas: ArtistIdeaOffer[]; // §6 — idées de projet spontanées à traiter
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
