/*
 * ARTISTS MANAGER 2026 — v6 : le moteur.
 *
 * advanceWeek() ne fait qu'exécuter ce que le joueur a préparé + faire vivre le
 * monde : résolution des négociations d'embauche, progression des prods, sorties
 * (avec effets du staff et des tendances), offres de concert du booker, salaires,
 * agents rivaux. Plus AUCUN événement aléatoire scripté : tout ce qui arrive
 * découle d'un système.
 */

import type {
  Artist, ArtistIdeaOffer, Beatmaker, BudgetKey, BudgetOption, ChartEntry, ChoiceEvent,
  ConcertOffer, GameState, LabelChartEntry, Negotiation, Objective, Person, Project, Promise_,
  ProjectChartEntry, Release, SongStructure, StaffRole, VaultTrack,
} from "./types";
import {
  BUDGET_PRESETS, CERT_LEVELS, CLEARANCE_COST_RATE, CLEARANCE_RISK_CHANCE, CONTRACT_MAX_WEEKS,
  CONTRACT_MIN_WEEKS, CONTRACT_RENEWAL_RAISE, CONTRACT_RENEWAL_WINDOW, DEFAULT_BUDGET_CHOICE,
  DROITS_RATE, FEATURING_FEE_RATE, FRAUD_DETECTION_CHANCE, FRAUD_REPUTATION_PENALTY, HOME_STUDIO_COST,
  HOME_STUDIO_DISCOUNT, LIQUIDATION_FLOOR, LOAN_INTEREST, LOAN_MONTHS, LOAN_OFFERS, MOMENTUM_LOSS_EXTRA_DECAY,
  MOMENTUM_LOSS_WEEKS, MONTH_WEEKS, OLD_SAVE_BACKUP_KEY, OVERDRAFT_RATE, PERSONALITIES, PERSONALITY_CLASHES,
  PLATFORM_BASE_SPLIT, PREMIUM_STREAM_RATE, FREEMIUM_STREAM_RATE, PROJECT_TITLES, PROMISE_BROKEN_HYPE_PENALTY,
  PROMISE_BROKEN_REP_PENALTY, PROMISE_CHANCE, PROMISE_KEPT_HYPE_BONUS,
  PROMISE_WINDOW_WEEKS, PUSH_COST, PUSH_WINDOW_WEEKS, RADIO_RATE, SAVE_KEY, SAVE_VERSION, SEASON_WEEKS,
  SNEP_REAL_THRESHOLDS, STAFF_ROLES, STAFF_ROLE_KEYS, STAFF_SEVERANCE_MONTHS, START_CASH, STAFF_TAKES_BULLISH,
  STAFF_TAKES_CAUTIOUS, STREAM_RATE, STREAM_SOURCE_BASE_SPLIT, STYLE_BPM,
  SUREXPOSITION_PENALTY, SUREXPOSITION_WEEKS, TOUR_MAX_DATES, TOUR_MIN_DATES, TYPE_META,
  VAULT_CHANCE, VAULT_RELEASE_COST, VAULT_RELEASE_WEEKS, VENUES,
} from "./data";
import { fullName, makeArtist, makeBeatmaker, makeInitialStaffMarket, makeStaffCandidate, nextId, pick, ri, rnd } from "./people";
import { makeRivals, makeTrends, rivalLabelStreams, tickWorld } from "./world";

export const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

// ---------- Budget ----------

export function budgetPreset(key: BudgetKey, choice: Record<BudgetKey, number>): BudgetOption {
  return BUDGET_PRESETS[key][choice[key]];
}

export function budgetTotalCost(choice: Record<BudgetKey, number>): number {
  return (Object.keys(BUDGET_PRESETS) as BudgetKey[]).reduce((sum, k) => sum + budgetPreset(k, choice).v, 0);
}

// v14 — coût réel d'une prod : le home studio réduit durablement le budget
// d'enregistrement (§2), un beatmaker choisi sur le marketplace s'ajoute (§8).
export function effectiveBudgetCost(
  choice: Record<BudgetKey, number>,
  hasHomeStudio: boolean,
  beatmaker: Beatmaker | null
): number {
  const enrCost = budgetPreset("enregistrement", choice).v * (hasHomeStudio ? 1 - HOME_STUDIO_DISCOUNT : 1);
  const otherCost = budgetTotalCost(choice) - budgetPreset("enregistrement", choice).v;
  return Math.round(enrCost + otherCost + (beatmaker ? beatmaker.fee : 0));
}

// ---------- Staff ----------

export function staffByRole(staff: Person[], role: StaffRole): Person | null {
  return staff.find((p) => p.role === role) ?? null;
}

export function staffMonthlyCost(staff: Person[]): number {
  return staff.reduce((sum, p) => sum + p.askSalary, 0);
}

// ---------- Production : source unique de vérité ----------

// Utilisée pour l'aperçu en direct dans le Studio ET pour les valeurs figées sur
// le Project au lancement — une seule formule, pas de divergence. v6 : le staff
// en poste modifie le résultat. v10 : BPM/structure/featuring — de vrais choix
// créatifs, pas juste des curseurs de budget.
export function computeProductionStats(
  artist: Artist,
  choice: Record<BudgetKey, number>,
  type: Project["type"],
  staff: Person[],
  bpm: number,
  structure: SongStructure,
  featuringArtist: Artist | null,
  beatmaker: Beatmaker | null = null
): Pick<Project, "quality" | "reach" | "adsMult" | "mediaChance" | "hypeBoost" | "retention"> {
  const meta = TYPE_META[type];
  const instru = budgetPreset("instru", choice);
  const enr = budgetPreset("enregistrement", choice);
  const mix = budgetPreset("mix", choice);
  const master = budgetPreset("mastering", choice);
  const cover = budgetPreset("cover", choice);
  const clip = budgetPreset("clip", choice);
  const clipConcept = budgetPreset("clipConcept", choice);
  const dist = budgetPreset("distribution", choice);
  const ads = budgetPreset("publicite", choice);
  const presse = budgetPreset("presse", choice);

  const da = staffByRole(staff, "da");
  const inge = staffByRole(staff, "inge");
  const marketing = staffByRole(staff, "marketing");
  const pressePerso = staffByRole(staff, "presse");

  // DA : +0 à +20 % de qualité selon son vrai niveau, +5 % si affinité de style.
  const daMult = da ? 1 + da.skill / 100 + (da.styleAffinity === artist.style ? 0.05 : 0) : 1;
  // Ingé son maison : +0 à ~+14 % sur le rendu mix/master.
  const ingeMult = inge ? 1 + inge.skill / 140 + (inge.styleAffinity === artist.style ? 0.03 : 0) : 1;

  // v10 — BPM : coller au tempo du style rapporte, s'en éloigner coûte.
  const bpmRange = STYLE_BPM[artist.style] ?? [80, 140];
  const bpmGap = bpm < bpmRange[0] ? bpmRange[0] - bpm : bpm > bpmRange[1] ? bpm - bpmRange[1] : 0;
  const bpmMult = bpmGap === 0 ? 1.08 : bpmGap <= 15 ? 0.98 : 0.88;

  // v10 — structure du morceau : arbitrage portée/qualité/rétention/risque.
  let structQualityMult = 1;
  let structReachMult = 1;
  let structRetentionAdj = 0;
  let structHypeAdj = 0;
  if (structure === "minimaliste") { structQualityMult = 0.95; structReachMult = 0.9; structRetentionAdj = 0.06; }
  else if (structure === "experimental") { structReachMult = 1.16; structRetentionAdj = -0.06; structHypeAdj = 5; }

  // v10 — featuring : croise les fanbases des deux artistes, coûte une part
  // de la cote du featuré (voir featuringCost).
  const featMult = featuringArtist ? 1.14 : 1;
  const featHypeAdj = featuringArtist ? 6 : 0;

  // v14 — beatmaker du marketplace (§8) : bonus qualité, plus fort si son
  // style de prédilection correspond à celui de l'artiste.
  const beatmakerMult = beatmaker
    ? 1 + beatmaker.qualityBonus + (beatmaker.styleAffinity === artist.style ? 0.04 : 0)
    : 1;

  const skill = (artist.flow + artist.plume) / 2; // 0-20
  const quality = Math.round(
    (skill * 3.2 + (enr.add ?? 0)) *
    (instru.mult ?? 1) * (mix.mult ?? 1) * (master.mult ?? 1) * (cover.mult ?? 1) * (clipConcept.mult ?? 1) *
    daMult * ingeMult * bpmMult * structQualityMult * beatmakerMult *
    meta.studioBase
  );
  const reach = (dist.mult ?? 1) * (clip.mult ?? 1) * structReachMult * featMult;
  // Marketing : chaque euro de pub travaille plus dur (jusqu'à +20 %).
  const adsMult = (ads.mult ?? 1) * (marketing ? 1 + marketing.skill / 100 : 1);
  // Attaché(e) de presse : chance média du budget + son carnet d'adresses.
  const mediaChance = Math.min(0.9, (presse.mediaChance ?? 0) + (pressePerso ? pressePerso.skill / 100 : 0));
  const hypeBoost = 12 + (clip.hypeBoost ?? 0) + structHypeAdj + featHypeAdj;
  const retention = Math.max(0.5, Math.min(0.92,
    0.62 + ((master.mult ?? 1) * ingeMult - 1) * 0.5 + (reach - 1) * 0.15 + quality / 1000 + structRetentionAdj
  ));
  return { quality, reach, adsMult, mediaChance, hypeBoost, retention };
}

// Coût d'un featuring avec un autre artiste du roster — part de sa cote.
export function featuringCost(a: Artist): number {
  return Math.round((a.signingFee * FEATURING_FEE_RATE) / 50) * 50;
}

// ---------- v13 : Label Intelligence Center — data réaliste par sortie ----------

function normalizedSplit(base: Record<string, number>, editorialBoost = false): Record<string, number> {
  const out: Record<string, number> = {};
  let total = 0;
  for (const k of Object.keys(base)) {
    let v = base[k] * rnd(0.8, 1.25);
    if (editorialBoost && k === "Playlists éditoriales") v *= 1.6;
    out[k] = v;
    total += v;
  }
  for (const k of Object.keys(out)) out[k] = Math.round((out[k] / total) * 100) / 100;
  return out;
}

// Part premium d'une sortie : les artistes avec plus de hype/réputation
// attirent un public plus qualifié (fans engagés = premium), pas seulement plus large.
function computePremiumShare(artistHype: number, mediaHit: boolean): number {
  return Math.max(0.42, Math.min(0.8, 0.5 + artistHype / 400 + (mediaHit ? 0.06 : 0)));
}

// ---------- Négociations d'embauche ----------

// Probabilité qu'un candidat accepte une offre — dépend du ratio offre/demande,
// de la réputation du label, de sa motivation et de sa personnalité.
export function acceptanceHint(person: Person, offer: number, labelReputation: number): number {
  const ratio = offer / person.askSalary;
  const perso = PERSONALITIES.find((p) => p.name === person.personality);
  if (perso?.refusesLowball && ratio < 1) return 0.02;
  let p = 0.08 + (ratio - 0.8) * 2.2; // 0.8x → ~8 %, 1x → ~52 %, 1.15x → ~85 %
  p += (labelReputation - 30) / 250;   // un label réputé attire
  p += (person.motivation - 60) / 400;
  p += perso ? perso.negoMod : 0;
  if (person.personality === "Ambitieux") p += labelReputation >= 50 ? 0.12 : -0.1;
  return Math.max(0.02, Math.min(0.97, p));
}

function resolveNegotiations(s: GameState) {
  for (const nego of s.negotiations) {
    if (nego.status !== "pending") continue;
    const person = s.staffMarket.find((p) => p.id === nego.personId);
    if (!person) { nego.status = "refused"; continue; }
    // Le poste s'est rempli entre-temps (contre-offre acceptée ailleurs...) ?
    if (staffByRole(s.staff, person.role)) { nego.status = "refused"; continue; }

    const p = acceptanceHint(person, nego.offer, s.reputation);
    if (Math.random() < p) {
      nego.status = "accepted";
      person.askSalary = nego.offer; // le salaire signé devient le salaire réel
      if (nego.offer > 0) person.motivation = Math.min(100, person.motivation + 10);
      s.staff.push(person);
      s.staffMarket = s.staffMarket.filter((x) => x.id !== person.id);
      s.messages.unshift({
        id: nextId(), week: s.week,
        title: `${fullName(person)} rejoint l'équipe`,
        body: `Ton offre à ${fmt(nego.offer)} €/mois est acceptée. Son effet de poste s'applique dès maintenant — premier salaire à la prochaine fin de mois.`,
      });
    } else if (Math.random() < 0.55) {
      // Contre-proposition plutôt que refus sec — à toi de trancher.
      nego.status = "countered";
      nego.counter = Math.round((person.askSalary * rnd(1.02, 1.12)) / 50) * 50;
      s.messages.unshift({
        id: nextId(), week: s.week,
        title: `${fullName(person)} fait une contre-proposition`,
        body: `Ton offre à ${fmt(nego.offer)} €/mois ne suffit pas — il/elle demande ${fmt(nego.counter)} €/mois. Réponds depuis l'onglet Staff avant que l'offre expire.`,
      });
    } else {
      nego.status = "refused";
      person.motivation = Math.max(0, person.motivation - 5);
      s.messages.unshift({
        id: nextId(), week: s.week,
        title: `${fullName(person)} décline ton offre`,
        body: `${fmt(nego.offer)} €/mois, c'était trop bas (demande : ${fmt(person.askSalary)} €/mois). Le candidat reste sur le marché... pour l'instant.`,
      });
    }
  }
  // On ne garde que les négos encore actionnables (contre-offres) — l'historique
  // vit dans les messages.
  s.negotiations = s.negotiations.filter((n) => n.status === "countered" || n.status === "pending");
}

// ---------- Concerts (générés par le booker) ----------

function generateConcertOffers(s: GameState) {
  const booker = staffByRole(s.staff, "booker");
  if (s.roster.length === 0) return;
  // Avec booker : chance liée à son niveau. Sans : très rare, et seulement si un
  // artiste fait déjà du bruit (la demande vient à toi).
  const chance = booker ? 0.25 + booker.skill / 45 : 0.05;
  const eligible = booker ? s.roster : s.roster.filter((a) => a.hype > 40);
  if (eligible.length === 0 || Math.random() > chance) return;

  const artist = pick(eligible);
  const skill = booker ? booker.skill : 4;
  // Cachet réaliste pour un artiste en développement : ~300-1500 € sans hype,
  // 2000-6000 € avec une vraie hype et un bon booker.
  const feePerDate = Math.round((300 + artist.hype * rnd(25, 60) + skill * rnd(40, 90)) / 50) * 50;
  // v12 — un bon booker avec un artiste qui a de la hype peut décrocher une
  // vraie tournée (plusieurs dates) plutôt qu'une date isolée.
  const isTour = booker && booker.skill >= 10 && artist.hype >= 45 && Math.random() < 0.3;
  const dates = isTour ? ri(TOUR_MIN_DATES, TOUR_MAX_DATES) : 1;
  const fee = isTour ? Math.round((feePerDate * dates * 0.88) / 50) * 50 : feePerDate;
  const offer: ConcertOffer = {
    id: nextId(),
    artistId: artist.id,
    artistName: artist.name,
    venue: isTour ? "Tournée nationale" : pick(VENUES),
    cityName: isTour ? `${dates} villes` : pick(["Paris", "Marseille", "Lyon", "Lille", "Bordeaux", "Nantes", "Genève", "Bruxelles"]),
    fee,
    expiresWeek: s.week + 2,
    dates,
  };
  s.concertOffers.push(offer);
  s.messages.unshift({
    id: nextId(), week: s.week,
    title: isTour ? `Tournée proposée pour ${artist.name}` : `Offre de concert pour ${artist.name}`,
    body: isTour
      ? `Ton booker a monté une tournée de ${dates} dates (cachet total : ${fmt(fee)} €). Accepte ou refuse depuis le dashboard — l'offre expire dans 2 semaines.`
      : `${booker ? `Ton booker a décroché` : `Une salle propose`} une date (cachet : ${fmt(fee)} €). Accepte ou refuse depuis le dashboard — l'offre expire dans 2 semaines.`,
  });
}

// ---------- Sauvegarde ----------

// Objectifs de la saison — un fil rouge avec des vraies références du secteur
// (aides du CNM, synchro, bonus distributeur). Récompense si atteint AVANT la
// deadline ; sinon, l'occasion passe.
function makeObjectives(): Objective[] {
  return [
    {
      id: "obj-1", label: "Premier cap : 250 000 streams cumulés", metric: "streams", target: 250000,
      deadlineWeek: 13, reward: 6000, rewardLabel: "Aide à la création (CNM)",
      desc: "Le Centre national de la musique soutient les labels qui font leurs preuves. Montre que tu sais sortir un projet qui compte.",
      status: "active",
    },
    {
      id: "obj-2", label: "Faire un nom : réputation 40", metric: "reputation", target: 40,
      deadlineWeek: 26, reward: 5000, rewardLabel: "Subvention de structuration",
      desc: "Un label crédible attire les aides et les partenaires. Presse, classements, régularité : tout compte.",
      status: "active",
    },
    {
      id: "obj-3", label: "Changer d'échelle : 1 000 000 de streams cumulés", metric: "streams", target: 1000000,
      deadlineWeek: 39, reward: 8000, rewardLabel: "Synchro pub / série",
      desc: "Les superviseurs musicaux cherchent des catalogues qui tournent. Le million ouvre les portes des synchros.",
      status: "active",
    },
    {
      id: "obj-4", label: "Consécration : 2 certifications", metric: "certifs", target: 2,
      deadlineWeek: 52, reward: 10000, rewardLabel: "Bonus distributeur",
      desc: "Deux singles certifiés dans l'année : ton distributeur récompense les labels qui livrent des hits.",
      status: "active",
    },
  ];
}

function makeBeatmakerMarket(): Beatmaker[] {
  const used = new Set<string>();
  return [makeBeatmaker(used), makeBeatmaker(used), makeBeatmaker(used), makeBeatmaker(used)];
}

export function initialState(): GameState {
  const used = new Set<string>();
  return {
    version: SAVE_VERSION,
    week: 1,
    cash: START_CASH,
    reputation: 10,
    roster: [],
    market: [makeArtist(used), makeArtist(used), makeArtist(used)],
    staff: [],
    staffMarket: makeInitialStaffMarket(),
    negotiations: [],
    concertOffers: [],
    project: null,
    releases: [],
    messages: [],
    rivals: makeRivals(),
    worldReleases: [],
    trends: makeTrends(),
    loan: null,
    lastWeekIncome: { streaming: 0, droits: 0, radio: 0, concerts: 0 },
    confirmedIncome: { streaming: 0, droits: 0, radio: 0, concerts: 0 },
    pendingConcertIncome: 0,
    objectives: makeObjectives(),
    pendingChoices: [],
    advanceDeal: null,
    certifications: [],
    hasHomeStudio: false,
    beatmakerMarket: makeBeatmakerMarket(),
    vault: [],
    promises: [],
    artistIdeas: [],
    prevChartOrder: [],
    totalReleases: 0,
    totalStreamsAllTime: 0,
    totalConcerts: 0,
    profile: null,
    tutorialDone: false,
    gameOver: null,
    scoreSaved: false,
  };
}

export type LoadResult = { state: GameState | null; resetFromOldSave: boolean };

// v6 = refonte du moteur : les sauvegardes < v6 ne sont PAS migrables (structures
// staff/monde/tendances absentes). Reset propre : l'ancienne sauvegarde est
// archivée dans une clé de secours, et l'UI affiche un écran d'explication.
export function load(): LoadResult {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { state: null, resetFromOldSave: false };
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (parsed.version !== SAVE_VERSION) {
      try { localStorage.setItem(OLD_SAVE_BACKUP_KEY, raw); } catch { /* tant pis */ }
      localStorage.removeItem(SAVE_KEY);
      return { state: null, resetFromOldSave: true };
    }
    return { state: parsed as GameState, resetFromOldSave: false };
  } catch {
    return { state: null, resetFromOldSave: false };
  }
}

export function persist(s: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    // stockage indisponible — la partie vivra en mémoire seulement
  }
}

// ---------- Classements ----------

// 1) Classement ARTISTES : streams hebdo par artiste (tes artistes = somme de
// leurs sorties actives ; artistes rivaux = leurs streams propres).
export function computeArtistChart(s: GameState): ChartEntry[] {
  const mine: Record<string, number> = {};
  for (const r of s.releases) {
    mine[r.artistName] = (mine[r.artistName] ?? 0) + r.weeklyStreams;
  }
  const entries: ChartEntry[] = [];
  for (const name of Object.keys(mine)) {
    if (mine[name] > 0) entries.push({ key: `me:${name}`, name, title: null, streams: mine[name], mine: true });
  }
  for (const r of s.rivals) {
    for (const a of r.roster) {
      entries.push({ key: `rival:${r.name}:${a.name}`, name: a.name, title: r.name, streams: a.weeklyStreams, mine: false });
    }
  }
  return entries.sort((a, b) => b.streams - a.streams).slice(0, 10);
}

// 2) Classement LABELS : streams hebdo agrégés par écurie.
export function computeLabelChart(s: GameState): LabelChartEntry[] {
  const myStreams = s.releases.reduce((sum, r) => sum + r.weeklyStreams, 0);
  const entries: LabelChartEntry[] = [
    {
      key: "label:me",
      name: s.profile ? s.profile.labelName : "Ton label",
      streams: myStreams,
      reputation: Math.round(s.reputation),
      mine: true,
    },
    ...s.rivals.map((r) => ({
      key: `label:${r.name}`,
      name: r.name,
      streams: rivalLabelStreams(r),
      reputation: Math.round(r.reputation),
      mine: false,
    })),
  ];
  return entries.sort((a, b) => b.streams - a.streams);
}

// 3) Top PROJETS de la saison : streams cumulés des sorties, toutes écuries
// confondues — façon top albums de fin d'année.
export function computeProjectChart(s: GameState): ProjectChartEntry[] {
  const entries: ProjectChartEntry[] = [
    ...s.releases.map((r) => ({
      key: `proj:me:${r.id}`,
      labelName: s.profile ? s.profile.labelName : "Ton label",
      artistName: r.artistName,
      title: r.title,
      totalStreams: r.totalStreams + r.weeklyStreams,
      mine: true,
    })),
    ...s.worldReleases.map((w) => ({
      key: `proj:${w.id}`,
      labelName: w.labelName,
      artistName: w.artistName,
      title: w.title,
      totalStreams: w.totalStreams + w.weeklyStreams,
      mine: false,
    })),
  ];
  return entries.sort((a, b) => b.totalStreams - a.totalStreams).slice(0, 10);
}

// ---------- La semaine ----------

export function advanceWeek(prev: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(prev));
  s.prevChartOrder = computeArtistChart(prev).map((e) => e.key);
  s.week += 1;

  const pressePerso = staffByRole(s.staff, "presse");

  // 1) Résolution des négociations d'embauche lancées la semaine passée.
  resolveNegotiations(s);

  // 2) Progression de la prod en cours → sortie.
  if (s.project) {
    s.project.weeksLeft -= 1;
    if (s.project.weeksLeft <= 0) {
      const artist = s.roster.find((a) => a.id === s.project!.artistId);
      if (artist) {
        const proj = s.project;
        const trendMult = s.trends[artist.style] ?? 1;
        // v14 — momentum & surexposition (§15) : sortir trop vite après la
        // précédente sortie fatigue le public — un vrai risque, pas un simple curseur.
        const weeksSinceLast = artist.lastReleaseWeek > 0 ? s.week - artist.lastReleaseWeek : 999;
        const surexpose = weeksSinceLast < SUREXPOSITION_WEEKS;
        const momentumMult = surexpose ? SUREXPOSITION_PENALTY : 1;
        // Prévision "des pros" : ce que le projet devrait faire sur le papier.
        // La tendance, l'aléa et la presse feront la vraie histoire — suspense
        // révélé au premier bilan, la semaine suivante.
        const expected = Math.round((proj.quality * 2800 * proj.reach * proj.adsMult + artist.hype * 2200 * proj.reach) * momentumMult);
        let initialStreams = Math.round(
          (proj.quality * 2800 * proj.reach * proj.adsMult + artist.hype * 2200 * proj.reach + rnd(0, 25000)) * trendMult * momentumMult
        );
        const mediaHit = Math.random() < proj.mediaChance;
        if (mediaHit) {
          initialStreams = Math.round(initialStreams * 1.3);
          s.reputation = Math.min(100, s.reputation + ri(2, 5));
        }
        // Passages radio de départ : la presse et la qualité ouvrent les portes
        // des programmateurs — chaque passage rapporte (rémunération équitable)
        // et entretient les streams.
        const radioPlays =
          (mediaHit ? ri(5, 14) : 0) +
          (proj.quality >= 65 ? ri(1, 5) : 0) +
          (pressePerso ? Math.round(pressePerso.skill / 4) : 0);
        s.releases.unshift({
          id: nextId(),
          artistId: artist.id,
          artistName: artist.name,
          artistStyle: artist.style,
          title: proj.title,
          type: proj.type,
          quality: proj.quality,
          retention: proj.retention,
          weeklyStreams: initialStreams,
          totalStreams: 0,
          weeksOut: 0,
          radioPlays,
          expected,
          certified: null,
          pushed: false,
          premiumShare: computePremiumShare(artist.hype, mediaHit),
          platformSplit: normalizedSplit(PLATFORM_BASE_SPLIT),
          streamSource: normalizedSplit(STREAM_SOURCE_BASE_SPLIT, mediaHit),
          certAlerted: null,
        });
        artist.hype = Math.min(100, artist.hype + proj.hypeBoost);
        artist.lastReleaseWeek = s.week;
        s.totalReleases += 1;
        const featGuest = proj.featuringArtistId ? s.roster.find((a) => a.id === proj.featuringArtistId) : null;
        if (surexpose) {
          s.messages.unshift({
            id: nextId(), week: s.week, title: `Surexposition : « ${proj.title} »`,
            body: `${artist.name} enchaîne trop vite après sa dernière sortie (${weeksSinceLast} semaine${weeksSinceLast > 1 ? "s" : ""} seulement) — le public a besoin de souffler. Démarrage pénalisé.`,
          });
        }
        s.messages.unshift({
          id: nextId(), week: s.week, title: `Sortie : « ${proj.title} »`,
          body: `Le ${TYPE_META[proj.type].label.toLowerCase()} de ${artist.name}${featGuest ? ` feat. ${featGuest.name}` : ""} est dans les bacs${trendMult >= 1.2 ? ` — et le ${artist.style} est en pleine tendance, ça tombe bien` : trendMult <= 0.8 ? ` — mais le ${artist.style} n'a pas le vent en poupe en ce moment` : ""}. Les pros tablent sur ~${fmt(expected)} streams de démarrage. Verdict au premier bilan, la semaine prochaine.`,
        });
        // v15 §5 — signal faible : une impression qualitative AVANT le chiffre
        // exact (donné la semaine prochaine). Jamais de vérité assénée — au
        // joueur d'interpréter.
        const earlyRatio = expected > 0 ? initialStreams / expected : 1;
        const signalBody = earlyRatio >= 1.3
          ? "Les premiers retours de l'entourage sont électriques — mais rien n'est confirmé avant les vrais chiffres."
          : earlyRatio <= 0.75
            ? "L'accueil semble tiède pour l'instant, sans qu'on puisse encore en tirer une vraie conclusion."
            : "Signaux mitigés dans les premières heures — difficile à lire, comme souvent.";
        s.messages.unshift({
          id: nextId(), week: s.week, title: `Premiers signaux : « ${proj.title} »`,
          body: signalBody,
        });
        if (mediaHit) {
          s.messages.unshift({
            id: nextId(), week: s.week, title: "La presse en parle",
            body: `Un média rap a repéré « ${proj.title} » — coup de projecteur qui dope la sortie, ta réputation, et ouvre les playlists radio.`,
          });
        }
        if (radioPlays >= 8) {
          s.messages.unshift({
            id: nextId(), week: s.week, title: `« ${proj.title} » entre en rotation radio`,
            body: `${radioPlays} passages programmés cette semaine — chaque diffusion rapporte des droits et entretient les streams.`,
          });
        }
        // v14 — vault musicale (§9) : la session peut laisser une chute
        // exploitable plus tard, à moindre coût.
        if (Math.random() < VAULT_CHANCE) {
          const vaultTrack: VaultTrack = {
            id: nextId(), artistId: artist.id, artistName: artist.name, artistStyle: artist.style,
            title: PROJECT_TITLES[Math.floor(Math.random() * PROJECT_TITLES.length)],
            quality: Math.round(proj.quality * rnd(0.7, 0.92)), createdWeek: s.week,
          };
          s.vault.push(vaultTrack);
          s.messages.unshift({
            id: nextId(), week: s.week, title: `Chute de studio : « ${vaultTrack.title} »`,
            body: `La session a laissé un morceau inutilisé, « ${vaultTrack.title} » (${artist.name}). Il dort dans la vault — tu peux le sortir plus tard, à moindre coût, depuis le Studio.`,
          });
        }
        // v15 §18 — crise de production : un sample d'une prod du marketplace
        // peut ne pas être dédouané. Ça se découvre au pire moment — à la sortie.
        // Un vrai dilemme, pas un malus gratuit : payer pour régulariser, ou
        // retirer le morceau et perdre le travail.
        if (proj.beatmakerId && Math.random() < CLEARANCE_RISK_CHANCE) {
          const droppedRelease = s.releases[0];
          const clearanceCost = Math.max(300, Math.round((droppedRelease.quality * 12) / 50) * 50);
          const crisis: ChoiceEvent = {
            id: nextId(), kind: "clearance", refId: droppedRelease.id,
            createdWeek: s.week, expiresWeek: s.week + 1, clearanceCost,
            title: `Sample non dédouané — « ${droppedRelease.title} »`,
            body: `Mauvaise surprise : la prod de « ${droppedRelease.title} » utilise un sample dont les droits n'ont jamais été réglés. Risque juridique réel si ça sort tel quel.`,
            optionA: `Régulariser (-${fmt(clearanceCost)} €)`,
            optionB: "Retirer le morceau des plateformes",
          };
          s.pendingChoices.push(crisis);
          s.messages.unshift({
            id: nextId(), week: s.week, title: `⚠️ Problème sur « ${droppedRelease.title} »`,
            body: `Un souci de droits vient d'être détecté sur cette sortie — décision à prendre rapidement dans "À traiter".`,
          });
        }
      }
      s.project = null;
    }
  }

  // 3) Vie des sorties : streams, radio, revenus détaillés, déclin.
  //    v9 : verdict du premier bilan (vs prévision) + certifications.
  //    v12 : réseaux sociaux — canal média séparé de la presse et de la radio,
  //    piloté par le CM. Rare, mais un vrai coup de boost quand ça arrive.
  const cmSocial = staffByRole(s.staff, "cm");
  if (cmSocial && s.releases.length > 0) {
    for (const r of s.releases) {
      if (r.weeksOut > 6) continue; // les réseaux s'emballent surtout sur les sorties fraîches
      const viralChance = cmSocial.skill / 500;
      if (Math.random() < viralChance) {
        const bump = rnd(1.25, 1.6);
        r.weeklyStreams = Math.round(r.weeklyStreams * bump);
        s.messages.unshift({
          id: nextId(), week: s.week, title: `« ${r.title} » devient viral sur les réseaux 📱`,
          body: `Un extrait tourne fort sur les réseaux — le travail de ton CM paie. Streams de la semaine dopés de ${Math.round((bump - 1) * 100)} %.`,
        });
        break; // un seul moment viral par semaine, pour garder l'effet marquant
      }
    }
  }
  let streamingRev = 0;
  let radioRev = 0;
  for (const r of s.releases) {
    r.weeksOut += 1;
    r.totalStreams += r.weeklyStreams;
    s.totalStreamsAllTime += r.weeklyStreams;
    // v13 — pas de prix fixe au stream : le mix premium/freemium de CETTE
    // sortie détermine son propre rendement, comme dans la réalité.
    const premiumStreams = r.weeklyStreams * r.premiumShare;
    const freemiumStreams = r.weeklyStreams * (1 - r.premiumShare);
    const releaseStreamingRev = premiumStreams * PREMIUM_STREAM_RATE + freemiumStreams * FREEMIUM_STREAM_RATE;
    streamingRev += releaseStreamingRev;
    radioRev += r.radioPlays * RADIO_RATE;
    // Recoupment (§38) : la revenue de l'artiste vient éroder l'avance de
    // signature avant qu'elle soit "remboursée" au label.
    const artistForRecoup = s.roster.find((x) => x.id === r.artistId);
    if (artistForRecoup) {
      artistForRecoup.lifetimeRevenue += releaseStreamingRev + r.radioPlays * RADIO_RATE;
      if (!artistForRecoup.advanceRecouped && artistForRecoup.lifetimeRevenue >= artistForRecoup.signingFee) {
        artistForRecoup.advanceRecouped = true;
        s.messages.unshift({
          id: nextId(), week: s.week, title: `Avance recoupée : ${artistForRecoup.name}`,
          body: `Les revenus générés par ${artistForRecoup.name} viennent de dépasser sa prime de signature (${fmt(artistForRecoup.signingFee)} €). L'investissement initial est rentabilisé — tout ce qui vient après est du bénéfice net sur cet artiste.`,
        });
      }
    }

    // Premier bilan : la réalité face aux prévisions — le suspense de chaque sortie.
    if (r.weeksOut === 1 && r.expected > 0) {
      const ratio = r.weeklyStreams / r.expected;
      if (ratio >= 1.25) {
        s.messages.unshift({
          id: nextId(), week: s.week, title: `« ${r.title} » explose les prévisions 🚀`,
          body: `${fmt(r.weeklyStreams)} streams en première semaine, contre ~${fmt(r.expected)} attendus. ${r.artistName} fait taire tout le monde.`,
        });
        const a = s.roster.find((x) => x.id === r.artistId);
        if (a) a.hype = Math.min(100, a.hype + 5);
      } else if (ratio <= 0.7) {
        s.messages.unshift({
          id: nextId(), week: s.week, title: `Démarrage en demi-teinte pour « ${r.title} »`,
          body: `${fmt(r.weeklyStreams)} streams en première semaine, loin des ~${fmt(r.expected)} espérés. Tendance défavorable ? Manque de visibilité ? À toi d'analyser.`,
        });
      } else {
        s.messages.unshift({
          id: nextId(), week: s.week, title: `Premier bilan : « ${r.title} »`,
          body: `${fmt(r.weeklyStreams)} streams en première semaine — dans les clous des prévisions (~${fmt(r.expected)}).`,
        });
      }
      // v15 §4 — informations imparfaites : dans la zone ambiguë (résultat correct
      // à très bon, sans être un raz-de-marée), le staff n'est jamais d'accord sur
      // la marche à suivre. Aucune vérité affichée — au joueur de trancher.
      if (ratio > 0.9 && ratio < 1.6 && s.staff.length >= 2) {
        const bullish = pick(STAFF_TAKES_BULLISH);
        const cautious = pick(STAFF_TAKES_CAUTIOUS);
        const voiceA = pick(s.staff);
        const voiceB = pick(s.staff.filter((p) => p.id !== voiceA.id)) ?? voiceA;
        s.messages.unshift({
          id: nextId(), week: s.week, title: `Avis partagés sur « ${r.title} »`,
          body: `${STAFF_ROLES[voiceA.role].label} : « ${bullish} » — ${STAFF_ROLES[voiceB.role].label} : « ${cautious} » Personne ne sait vraiment. À toi de décider.`,
        });
      }
    }

    // v13 — alerte "proche du seuil" (§34) : signale le prochain palier de
    // certification avant qu'il soit atteint, pour créer l'attente.
    const nextTier = CERT_LEVELS.find((c) => CERT_LEVELS.findIndex((x) => x.level === c.level) > CERT_LEVELS.findIndex((x) => x.level === r.certified));
    if (nextTier && r.certAlerted !== nextTier.level && r.totalStreams >= nextTier.at * 0.85 && r.totalStreams < nextTier.at) {
      r.certAlerted = nextTier.level;
      s.messages.unshift({
        id: nextId(), week: s.week, title: `${nextTier.emoji} « ${r.title} » proche du seuil ${nextTier.level}`,
        body: `${fmt(r.totalStreams)} / ${fmt(nextTier.at)} streams cumulés — la certification ${nextTier.level} approche pour ${r.artistName}.`,
      });
    }

    // Certifications : chaque palier franchi entre au palmarès du label.
    for (const cert of CERT_LEVELS) {
      const already = CERT_LEVELS.findIndex((c) => c.level === r.certified);
      const target = CERT_LEVELS.findIndex((c) => c.level === cert.level);
      if (target > already && r.totalStreams >= cert.at) {
        r.certified = cert.level;
        s.certifications.push({ title: r.title, artistName: r.artistName, level: cert.level, week: s.week });
        s.reputation = Math.min(100, s.reputation + cert.rep);
        const a = s.roster.find((x) => x.id === r.artistId);
        if (a) a.hype = Math.min(100, a.hype + 8);
        s.messages.unshift({
          id: nextId(), week: s.week, title: `${cert.emoji} « ${r.title} » certifié single ${cert.level === "or" ? "d'or" : cert.level === "platine" ? "de platine" : "de diamant"} !`,
          body: `${fmt(cert.at)} streams cumulés — ${r.artistName} entre au palmarès du label. (Vrai seuil SNEP en France : ${SNEP_REAL_THRESHOLDS[cert.level]} — l'échelle du jeu est adaptée.) Réputation +${cert.rep}.`,
        });
        // v13 — effet catalogue (§57) : un hit fait remonter les anciens
        // titres du même artiste. Une carrière, pas une suite de coups isolés.
        const backCatalog = s.releases.filter((other) => other.artistId === r.artistId && other.id !== r.id);
        if (backCatalog.length > 0) {
          for (const old of backCatalog) old.weeklyStreams = Math.round(old.weeklyStreams * rnd(1.12, 1.28));
          s.messages.unshift({
            id: nextId(), week: s.week, title: `Effet catalogue sur ${r.artistName}`,
            body: `Le succès de « ${r.title} » fait remonter les anciens titres de ${r.artistName} dans les écoutes — une carrière se construit aussi sur le catalogue.`,
          });
        }
      }
    }

    // La radio entretient les streams (chaque passage expose la sortie),
    // puis la rotation s'érode naturellement.
    r.weeklyStreams = Math.round(r.weeklyStreams * r.retention) + r.radioPlays * 250;
    r.radioPlays = Math.floor(r.radioPlays * 0.78);
  }
  s.releases = s.releases.filter((r) => r.weeklyStreams > 200);
  // Avance distributeur : une part du streaming part au distributeur.
  let advanceNote = 0;
  if (s.advanceDeal) {
    advanceNote = Math.round(streamingRev * s.advanceDeal.share);
    streamingRev -= advanceNote;
    s.advanceDeal.weeksLeft -= 1;
    if (s.advanceDeal.weeksLeft <= 0) {
      s.advanceDeal = null;
      s.messages.unshift({
        id: nextId(), week: s.week, title: "Avance distributeur soldée",
        body: `La retenue sur tes revenus streaming prend fin — tu retouches 100 % de ton exploitation.`,
      });
    }
  }
  // Droits voisins + édition : quote-part sur l'exploitation (streaming + radio).
  const droitsRev = (streamingRev + radioRev) * DROITS_RATE;
  const concertRev = s.pendingConcertIncome;
  s.pendingConcertIncome = 0;
  s.lastWeekIncome = {
    streaming: Math.round(streamingRev),
    droits: Math.round(droitsRev),
    radio: Math.round(radioRev),
    concerts: Math.round(concertRev),
  };
  // v13 — §36 du GDD : décalage de reporting. Les chiffres de la semaine qui
  // vient de s'écouler sont une ESTIMATION ; les chiffres "confirmés" ne
  // tombent que la semaine suivante, consolidés avec un léger ajustement —
  // comme un vrai relevé distributeur qui arrive en retard.
  s.confirmedIncome = {
    streaming: Math.round(prev.lastWeekIncome.streaming * rnd(0.96, 1.04)),
    droits: Math.round(prev.lastWeekIncome.droits * rnd(0.96, 1.04)),
    radio: Math.round(prev.lastWeekIncome.radio * rnd(0.97, 1.03)),
    concerts: prev.lastWeekIncome.concerts,
  };
  // Les cachets sont déjà encaissés à l'acceptation — on ne crédite ici que
  // streaming, droits et radio.
  s.cash += streamingRev + droitsRev + radioRev;

  // 4) Fin de mois (toutes les 4 semaines) : salaires artistes + staff, et
  //    échéance de prêt le cas échéant. Comme dans la vraie vie : la paie tombe
  //    d'un coup — anticipe ta trésorerie.
  if (s.week % MONTH_WEEKS === 0) {
    const rosterPay = s.roster.reduce((sum, a) => sum + a.salary, 0);
    const staffPay = staffMonthlyCost(s.staff);
    s.cash -= rosterPay + staffPay;
    let loanNote = "";
    if (s.loan) {
      const payment = Math.min(s.loan.monthlyPayment, s.loan.remaining);
      s.cash -= payment;
      s.loan.remaining = Math.round(s.loan.remaining - payment);
      loanNote = ` Échéance de prêt prélevée : ${fmt(payment)} €.`;
      if (s.loan.remaining <= 0) {
        s.loan = null;
        loanNote += " Prêt intégralement remboursé — la banque te fait à nouveau confiance.";
      }
    }
    if (rosterPay + staffPay > 0 || loanNote !== "") {
      s.messages.unshift({
        id: nextId(), week: s.week, title: "Fin de mois : la paie est tombée",
        body: `Salaires versés : ${fmt(rosterPay + staffPay)} € (artistes : ${fmt(rosterPay)} €, staff : ${fmt(staffPay)} €).${loanNote}`,
      });
    }

    // Dynamique mensuelle du staff — v8 : ton équipe est faite d'humains.
    //  - La motivation évolue : un label qui rayonne motive, un salaire sous le
    //    marché démotive (les Instables décrochent plus vite).
    //  - Motivation au fond = risque de démission (sans indemnité, poste vacant).
    //  - Chacun peut progresser en compétence... et toi, tu apprends à les
    //    connaître : la fourchette de niveau affichée se resserre vers le vrai.
    // v12 — relations d'équipe (light) : certains duos de personnalités ne
    // s'entendent pas naturellement. Rien de dramatique, mais ça pèse sur le moral.
    for (const [a, b] of PERSONALITY_CLASHES) {
      const hasA = s.staff.some((p) => p.personality === a);
      const hasB = s.staff.some((p) => p.personality === b);
      if (hasA && hasB && Math.random() < 0.4) {
        for (const p of s.staff) {
          if (p.personality === a || p.personality === b) p.motivation = Math.max(0, p.motivation - 2);
        }
        s.messages.unshift({
          id: nextId(), week: s.week, title: "Tensions dans l'équipe",
          body: `Les profils ${a.toLowerCase()} et ${b.toLowerCase()} ne font pas toujours bon ménage — ambiance un peu tendue ce mois-ci, motivation en légère baisse.`,
        });
      }
    }

    const resigning: Person[] = [];
    for (const p of s.staff) {
      const [lo, hi] = STAFF_ROLES[p.role].baseSalary;
      const marketExpected = lo + (hi - lo) * (p.skill / 20);
      let delta = s.reputation >= 50 ? 2 : s.reputation <= 25 ? -2 : 0;
      if (p.askSalary < marketExpected * 0.9) delta -= 3;
      if (p.personality === "Instable") delta -= 1;
      if (p.personality === "Loyal") delta += 1;
      p.motivation = Math.max(0, Math.min(100, p.motivation + delta));

      const quitThreshold = p.personality === "Instable" ? 35 : 20;
      if (p.motivation <= quitThreshold && Math.random() < 0.3) {
        resigning.push(p);
        continue;
      }
      if (p.motivation <= 30) {
        s.messages.unshift({
          id: nextId(), week: s.week, title: `${fullName(p)} broie du noir`,
          body: `Ta/ton ${STAFF_ROLES[p.role].label.toLowerCase()} perd la motivation${p.askSalary < marketExpected * 0.9 ? " — son salaire est sous le marché" : ""}. Si ça continue, il/elle partira.`,
        });
      }
      if (p.skill < 20 && Math.random() < 0.1) p.skill += 1;
      // Resserrer la fourchette autour du vrai niveau (sans jamais l'exclure).
      if (p.shownSkill[1] - p.shownSkill[0] > 1) {
        if (p.shownSkill[1] > p.skill) p.shownSkill[1] -= 1;
        else if (p.shownSkill[0] < p.skill) p.shownSkill[0] += 1;
      }
    }
    for (const p of resigning) {
      s.staff = s.staff.filter((x) => x.id !== p.id);
      s.messages.unshift({
        id: nextId(), week: s.week, title: `${fullName(p)} démissionne`,
        body: `Démotivé(e), ta/ton ${STAFF_ROLES[p.role].label.toLowerCase()} claque la porte. Le poste est vacant — son effet disparaît immédiatement.`,
      });
    }
  }

  // 5) Vie du roster : hype (le CM ralentit la chute et relance les délaissés),
  //    progression vers le potentiel caché.
  //    v14 — perte de momentum (§15) : un silence trop long accélère la chute.
  const cm = staffByRole(s.staff, "cm");
  const baseHypeDecay = Math.max(0.5, 2 - (cm ? cm.skill / 8 : 0));
  for (const a of s.roster) {
    const weeksSinceLast = a.lastReleaseWeek > 0 ? s.week - a.lastReleaseWeek : 0;
    const momentumLost = weeksSinceLast >= MOMENTUM_LOSS_WEEKS;
    a.hype = Math.max(0, a.hype - baseHypeDecay * (momentumLost ? MOMENTUM_LOSS_EXTRA_DECAY : 1));
    if (momentumLost && weeksSinceLast === MOMENTUM_LOSS_WEEKS) {
      s.messages.unshift({
        id: nextId(), week: s.week, title: `${a.name} perd le momentum`,
        body: `Rien de neuf depuis ${weeksSinceLast} semaines — le public passe à autre chose. Une sortie relancerait la dynamique.`,
      });
    }
  }
  if (cm && s.roster.length > 0) {
    const lowest = [...s.roster].sort((a, b) => a.hype - b.hype)[0];
    lowest.hype = Math.min(100, lowest.hype + cm.skill / 6);
  }
  for (const a of s.roster) {
    const current = (a.flow + a.plume) / 2;
    if (current < a.potential && Math.random() < 0.12) {
      if (a.flow <= a.plume && a.flow < 20) a.flow += 1;
      else if (a.plume < 20) a.plume += 1;
      s.messages.unshift({
        id: nextId(), week: s.week, title: `${a.name} progresse`,
        body: `Le travail paie : ${a.name} franchit un cap technique. Son plafond réel, lui, reste à découvrir.`,
      });
    }
  }

  // 5bis) Contrats d'artistes (v12) — un artiste n'est pas signé pour toujours.
  //       Le renouvellement se négocie avant l'échéance (dilemme dans "À traiter").
  const departing: Artist[] = [];
  for (const a of s.roster) {
    a.contractWeeksLeft -= 1;
    if (a.contractWeeksLeft === CONTRACT_RENEWAL_WINDOW && !a.leaving) {
      const hasChoice = s.pendingChoices.some((c) => c.kind === "renewal" && c.refId === a.id);
      if (!hasChoice) {
        const choice = makeChoiceEvent(s, "renewal", a.id);
        if (choice) {
          s.pendingChoices.push(choice);
          s.messages.unshift({
            id: nextId(), week: s.week, title: `Fin de contrat approche : ${a.name}`,
            body: `Le contrat de ${a.name} se termine dans ${CONTRACT_RENEWAL_WINDOW} semaines. Décide de son avenir dans "À traiter".`,
          });
        }
      }
    }
    if (a.contractWeeksLeft <= 0) departing.push(a);
  }
  for (const a of departing) {
    s.roster = s.roster.filter((x) => x.id !== a.id);
    s.pendingChoices = s.pendingChoices.filter((c) => !(c.kind === "renewal" && c.refId === a.id));
    if (s.project && s.project.artistId === a.id) s.project = null;
    s.messages.unshift({
      id: nextId(), week: s.week, title: `${a.name} quitte le label`,
      body: `Fin de contrat — ${a.name} part libre. ${a.leaving ? "Le renouvellement avait été décliné." : ""} Ses sorties déjà publiées restent dans ton catalogue.`,
    });
  }

  // 6) Attaché(e) de presse : entretien de réputation hebdo.
  if (pressePerso) s.reputation = Math.min(100, s.reputation + pressePerso.skill / 40);

  // 7) Concerts : nouvelles offres + expiration des anciennes.
  generateConcertOffers(s);
  const expired = s.concertOffers.filter((o) => o.expiresWeek < s.week);
  for (const o of expired) {
    s.messages.unshift({
      id: nextId(), week: s.week, title: `Offre expirée — ${o.artistName}`,
      body: `La date à ${o.venue} (${o.cityName}) n'a pas eu de réponse à temps. Le cachet de ${fmt(o.fee)} € s'envole.`,
    });
  }
  s.concertOffers = s.concertOffers.filter((o) => o.expiresWeek >= s.week);

  // 7bis) Dilemmes de l'industrie : parfois, une opportunité à double tranchant
  //       se présente — placement de marque, pitch playlist, avance, feat.
  //       Un seul dossier à la fois, il expire si tu ne tranches pas.
  s.pendingChoices = s.pendingChoices.filter((c) => {
    if (c.expiresWeek >= s.week) return true;
    s.messages.unshift({
      id: nextId(), week: s.week, title: "Opportunité expirée",
      body: `« ${c.title} » n'a pas eu de réponse à temps — dans cette industrie, les portes ne restent pas ouvertes.`,
    });
    return false;
  });
  if (s.pendingChoices.length === 0 && Math.random() < 0.22) {
    const kinds: ChoiceEvent["kind"][] = [];
    if (s.releases.length > 0) {
      kinds.push("brand", "playlist", "fraud");
      if (!s.advanceDeal) kinds.push("advance"); // pas deux avances en même temps
    }
    if (s.roster.length > 0) kinds.push("feat");
    if (kinds.length > 0) {
      const kind = pick(kinds);
      const choice = makeChoiceEvent(s, kind);
      if (choice) {
        s.pendingChoices.push(choice);
        s.messages.unshift({
          id: nextId(), week: s.week, title: `📋 ${choice.title}`,
          body: `Une décision t'attend sur le dashboard — l'offre expire semaine ${choice.expiresWeek}.`,
        });
      }
    }
  }

  // v15 §11-12 — un artiste demande parfois un engagement clair : "tu me mets
  // sur ton prochain projet". Un artiste ne redemande pas s'il a déjà une
  // promesse en cours.
  if (s.pendingChoices.length === 0 && s.roster.length > 0 && Math.random() < PROMISE_CHANCE) {
    const withoutPromise = s.roster.filter((a) => !s.promises.some((p) => p.artistId === a.id && p.kept === null));
    const candidate = withoutPromise.length > 0 ? pick(withoutPromise) : null;
    if (candidate) {
      const choice = makeChoiceEvent(s, "promise", candidate.id);
      if (choice) {
        s.pendingChoices.push(choice);
        s.messages.unshift({
          id: nextId(), week: s.week, title: `📋 ${choice.title}`,
          body: `Une décision t'attend sur le dashboard — l'offre expire semaine ${choice.expiresWeek}.`,
        });
      }
    }
  }

  // 8) Le monde vit : rivaux (signatures, sorties, débauchages) + tendances.
  tickWorld(s);

  // 9) Réputation vs concurrence : bats les autres LABELS (streams agrégés).
  const myLabelStreams = s.releases.reduce((sum, r) => sum + r.weeklyStreams, 0);
  const beaten = s.rivals.filter((r) => myLabelStreams > rivalLabelStreams(r)).length;
  s.reputation = Math.max(0, Math.min(100, s.reputation + (beaten >= 5 ? 3 : beaten >= 2 ? 1 : myLabelStreams > 0 ? 0 : -1)));

  // 9bis) Objectifs de saison : atteint avant la deadline → récompense versée ;
  //       deadline dépassée → l'occasion est perdue (mais la saison continue).
  for (const obj of s.objectives) {
    if (obj.status !== "active") continue;
    const value = obj.metric === "streams" ? s.totalStreamsAllTime
      : obj.metric === "reputation" ? s.reputation
      : s.certifications.length;
    if (value >= obj.target) {
      obj.status = "done";
      s.cash += obj.reward;
      s.messages.unshift({
        id: nextId(), week: s.week, title: `🎯 Objectif atteint : ${obj.rewardLabel}`,
        body: `${obj.label} — validé avant la semaine ${obj.deadlineWeek}. ${obj.rewardLabel} : +${fmt(obj.reward)} € versés au label. C'est comme ça qu'on structure une maison.`,
      });
    } else if (s.week > obj.deadlineWeek) {
      obj.status = "failed";
      s.messages.unshift({
        id: nextId(), week: s.week, title: `Occasion manquée : ${obj.rewardLabel}`,
        body: `${obj.label} n'a pas été atteint à temps — les ${fmt(obj.reward)} € te passent sous le nez. Le prochain objectif t'attend sur le dashboard.`,
      });
    }
  }

  // 9ter) v15 §11-12 — registre des promesses : vérifie si "tu seras sur mon
  // prochain projet" a été tenue (l'artiste titulaire ou en featuring d'un
  // projet lancé cette semaine) ou si le délai est dépassé (promesse rompue).
  for (const pr of s.promises) {
    if (pr.kept !== null) continue;
    const stillSigned = s.roster.some((a) => a.id === pr.artistId);
    if (!stillSigned) { pr.kept = false; continue; }
    if (s.project && (s.project.artistId === pr.artistId || s.project.featuringArtistId === pr.artistId)) {
      pr.kept = true;
      const a = s.roster.find((x) => x.id === pr.artistId);
      if (a) {
        a.hype = Math.min(100, a.hype + PROMISE_KEPT_HYPE_BONUS);
      }
      s.messages.unshift({
        id: nextId(), week: s.week, title: `Promesse tenue : ${pr.artistName}`,
        body: `${pr.artistName} est bien sur le nouveau projet, comme promis. La confiance se construit là-dessus.`,
      });
    } else if (s.week > pr.dueWeek) {
      pr.kept = false;
      const a = s.roster.find((x) => x.id === pr.artistId);
      if (a) {
        a.hype = Math.max(0, a.hype - PROMISE_BROKEN_HYPE_PENALTY);
      }
      s.reputation = Math.max(0, s.reputation - PROMISE_BROKEN_REP_PENALTY);
      s.messages.unshift({
        id: nextId(), week: s.week, title: `Promesse rompue : ${pr.artistName}`,
        body: `${pr.artistName} n'a jamais vu venir le projet promis. La confiance en prend un coup — et ça se sait dans le milieu (réputation -${PROMISE_BROKEN_REP_PENALTY}).`,
      });
    }
  }
  s.promises = s.promises.filter((pr) => pr.kept === null || pr.dueWeek >= s.week - 4); // garde un petit historique récent, puis nettoie


  // 10) Marchés qui tournent : candidats staff (disponibilité limitée) et talents.
  //     v8 : la cellule A&R travaille le marché — estimations affinées, vivier
  //     élargi, pépites repérées.
  const ar = staffByRole(s.staff, "ar");
  const scoutBonus = ar ? ar.skill / 20 : 0;
  if (ar) {
    for (const a of s.market) {
      // Chaque semaine, l'A&R resserre la fourchette de potentiel vers le vrai.
      if (a.shownPotential[1] - a.shownPotential[0] > 1) {
        if (a.shownPotential[1] > a.potential) a.shownPotential[1] -= 1;
        else if (a.shownPotential[0] < a.potential) a.shownPotential[0] += 1;
      }
    }
  }
  for (const p of s.staffMarket) p.availabilityWeeks -= 1;
  const leaving = s.staffMarket.filter((p) => p.availabilityWeeks <= 0);
  for (const p of leaving) {
    const hadNego = s.negotiations.some((n) => n.personId === p.id);
    if (hadNego) {
      s.messages.unshift({
        id: nextId(), week: s.week, title: `${fullName(p)} quitte le marché`,
        body: `Le candidat n'était plus disponible — ta négociation en cours tombe à l'eau.`,
      });
    }
    s.negotiations = s.negotiations.filter((n) => n.personId !== p.id);
  }
  s.staffMarket = s.staffMarket.filter((p) => p.availabilityWeeks > 0);
  while (s.staffMarket.length < 6) {
    const usedNames = new Set(
      [...s.staffMarket, ...s.staff].map((p) => `${p.firstName} ${p.lastName}`)
    );
    s.staffMarket.push(makeStaffCandidate(pick(STAFF_ROLE_KEYS), usedNames));
  }
  if (Math.random() < 0.3) {
    const used = new Set([...s.roster, ...s.market].map((a) => a.name));
    s.market = [...s.market.slice(1), makeArtist(used, scoutBonus)];
  }
  const marketTarget = ar ? 4 : 3; // un A&R élargit le vivier visible
  while (s.market.length < marketTarget) {
    const used = new Set([...s.roster, ...s.market].map((a) => a.name));
    const rookie = makeArtist(used, scoutBonus);
    s.market.push(rookie);
    if (ar && rookie.potential >= 17) {
      s.messages.unshift({
        id: nextId(), week: s.week, title: `Ton A&R a flairé une pépite`,
        body: `${fullName(ar)} te signale ${rookie.name} (${rookie.style}) sur le marché — « crois-moi, celui-là, il ne faut pas le laisser passer ». Les rivaux scoutent aussi.`,
      });
    }
  }

  // v14 — marketplace de beatmakers (§8) : tourne comme les autres marchés —
  // une prod refusée peut devenir le hit d'un concurrent (elle disparaît).
  if (Math.random() < 0.35 && s.beatmakerMarket.length > 0) {
    s.beatmakerMarket = s.beatmakerMarket.slice(1);
  }
  while (s.beatmakerMarket.length < 4) {
    const used = new Set(s.beatmakerMarket.map((b) => b.name));
    s.beatmakerMarket.push(makeBeatmaker(used));
  }

  // v14 — autonomie des artistes (§6) : une idée de projet spontanée, à
  // traiter ou à laisser filer. Un seul dossier à la fois, comme les dilemmes.
  s.artistIdeas = s.artistIdeas.filter((idea) => {
    if (idea.expiresWeek >= s.week) return true;
    const a = s.roster.find((x) => x.id === idea.artistId);
    s.messages.unshift({
      id: nextId(), week: s.week, title: "Idée laissée de côté",
      body: `${a ? a.name : "L'artiste"} n'a plus reparlé de « ${idea.title} » — l'envie est passée.`,
    });
    return false;
  });
  if (s.artistIdeas.length === 0 && s.roster.length > 0 && !s.project && Math.random() < 0.15) {
    const candidate = pick(s.roster.filter((a) => a.hype >= 35));
    if (candidate) {
      const type: Project["type"] = pick(["single", "single", "ep"]);
      const idea: ArtistIdeaOffer = {
        id: nextId(), artistId: candidate.id, artistName: candidate.name, type,
        title: PROJECT_TITLES[Math.floor(Math.random() * PROJECT_TITLES.length)],
        pitch: pick([
          "« J'ai un truc, là, il faut qu'on le fasse maintenant. »",
          "« Cette prod tourne dans ma tête depuis des jours, on la sort. »",
          "« Fais-moi confiance sur celle-là, je le sens. »",
        ]),
        qualityBonus: rnd(0.08, 0.16),
        costDiscount: rnd(0.2, 0.4),
        expiresWeek: s.week + 2,
      };
      s.artistIdeas.push(idea);
      s.messages.unshift({
        id: nextId(), week: s.week, title: `${candidate.name} a une idée de projet`,
        body: `${idea.pitch} Réponds depuis le Studio avant que l'inspiration ne retombe.`,
      });
    }
  }

  s.messages = s.messages.slice(0, 16);

  // 11) Banque : le découvert est autorisé (agios hebdo), la liquidation ne
  //     tombe qu'au-delà du plancher. D'ici là, des options de survie existent :
  //     prêt bancaire, vente de contrat d'artiste, cession de catalogue.
  if (s.cash < 0) {
    const agios = Math.round(-s.cash * OVERDRAFT_RATE);
    if (agios > 0) {
      s.cash -= agios;
      s.messages.unshift({
        id: nextId(), week: s.week, title: "Compte à découvert",
        body: `La banque prélève ${fmt(agios)} € d'agios. Liquidation judiciaire si le découvert dépasse ${fmt(-LIQUIDATION_FLOOR)} €. Options de survie dans Finances : prêt bancaire, vente d'un contrat d'artiste, cession de catalogue.`,
      });
    }
  }

  if (s.cash < LIQUIDATION_FLOOR) s.gameOver = "bankrupt";
  else if (s.week > SEASON_WEEKS) s.gameOver = "season_end";

  return s;
}

// ---------- Actions directes (hors avancée de semaine) ----------

export function acceptConcert(s: GameState, offerId: string): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  const offer = next.concertOffers.find((o) => o.id === offerId);
  if (!offer) return next;
  next.concertOffers = next.concertOffers.filter((o) => o.id !== offerId);
  next.cash += offer.fee;
  next.pendingConcertIncome += offer.fee;
  next.totalConcerts += offer.dates;
  const artist = next.roster.find((a) => a.id === offer.artistId);
  if (artist) artist.hype = Math.min(100, artist.hype + (offer.dates > 1 ? ri(10, 18) : ri(3, 8)));
  next.messages.unshift({
    id: nextId(), week: next.week,
    title: offer.dates > 1 ? `${offer.artistName} part en tournée` : `${offer.artistName} sur scène à ${offer.cityName}`,
    body: offer.dates > 1
      ? `Tournée de ${offer.dates} dates confirmée. Cachet total encaissé : ${fmt(offer.fee)} €. Une vraie tournée marque les esprits — la hype grimpe fort.`
      : `Date confirmée à ${offer.venue}. Cachet encaissé : ${fmt(offer.fee)} €. La scène entretient la hype.`,
  });
  return next;
}

export function declineConcert(s: GameState, offerId: string): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  next.concertOffers = next.concertOffers.filter((o) => o.id !== offerId);
  return next;
}

export function makeOffer(s: GameState, personId: string, offer: number): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  const person = next.staffMarket.find((p) => p.id === personId);
  if (!person) return next;
  // Une seule négo active par candidat.
  next.negotiations = next.negotiations.filter((n) => n.personId !== personId);
  const nego: Negotiation = {
    id: nextId(), personId, offer, createdWeek: next.week, status: "pending", counter: null,
  };
  next.negotiations.push(nego);
  next.messages.unshift({
    id: nextId(), week: next.week, title: `Offre envoyée à ${fullName(person)}`,
    body: `Proposition : ${fmt(offer)} €/mois (demande : ${fmt(person.askSalary)} €/mois). Réponse à la prochaine avancée de semaine.`,
  });
  return next;
}

export function acceptCounter(s: GameState, negoId: string): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  const nego = next.negotiations.find((n) => n.id === negoId);
  if (!nego || nego.status !== "countered" || nego.counter === null) return next;
  const person = next.staffMarket.find((p) => p.id === nego.personId);
  if (!person || staffByRole(next.staff, person.role)) {
    next.negotiations = next.negotiations.filter((n) => n.id !== negoId);
    return next;
  }
  person.askSalary = nego.counter;
  next.staff.push(person);
  next.staffMarket = next.staffMarket.filter((p) => p.id !== person.id);
  next.negotiations = next.negotiations.filter((n) => n.id !== negoId);
  next.messages.unshift({
    id: nextId(), week: next.week, title: `${fullName(person)} rejoint l'équipe`,
    body: `Contre-proposition acceptée : ${fmt(person.askSalary)} €/mois. Son effet de poste s'applique dès maintenant — premier salaire à la prochaine fin de mois.`,
  });
  return next;
}

export function declineCounter(s: GameState, negoId: string): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  next.negotiations = next.negotiations.filter((n) => n.id !== negoId);
  return next;
}

export function fireStaff(s: GameState, personId: string): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  const person = next.staff.find((p) => p.id === personId);
  if (!person) return next;
  const severance = person.askSalary * STAFF_SEVERANCE_MONTHS;
  next.staff = next.staff.filter((p) => p.id !== personId);
  next.cash -= severance;
  next.reputation = Math.max(0, next.reputation - 1);
  next.messages.unshift({
    id: nextId(), week: next.week, title: `${fullName(person)} quitte le label`,
    body: `Licenciement acté — indemnité de ${STAFF_SEVERANCE_MONTHS} mois de salaire (${fmt(severance)} €). Le poste est vacant, son effet disparaît immédiatement.`,
  });
  return next;
}

// ---------- v14 : monde physique & vault ----------

export function buyHomeStudio(s: GameState): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  if (next.hasHomeStudio || next.cash < HOME_STUDIO_COST) return next;
  next.cash -= HOME_STUDIO_COST;
  next.hasHomeStudio = true;
  next.messages.unshift({
    id: nextId(), week: next.week, title: "Home studio aménagé",
    body: `${fmt(HOME_STUDIO_COST)} € investis dans un local équipé — le coût d'enregistrement de chaque prod baisse de ${Math.round(HOME_STUDIO_DISCOUNT * 100)} % de façon permanente.`,
  });
  return next;
}

// Sortir une chute de vault : pas de vrai studio, juste une mise en ligne
// rapide et peu coûteuse. Streams de départ plus modestes qu'une vraie sortie
// travaillée, mais un vrai revenu quasi gratuit.
export function releaseVaultTrack(s: GameState, vaultId: string): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  const track = next.vault.find((v) => v.id === vaultId);
  if (!track || next.cash < VAULT_RELEASE_COST) return next;
  const artist = next.roster.find((a) => a.id === track.artistId);
  if (!artist) return next; // l'artiste a quitté le label entretemps
  next.cash -= VAULT_RELEASE_COST;
  next.vault = next.vault.filter((v) => v.id !== vaultId);
  const initialStreams = Math.round(track.quality * 1400 + artist.hype * 900 + rnd(0, 8000));
  const release: Release = {
    id: nextId(), artistId: artist.id, artistName: artist.name, artistStyle: track.artistStyle,
    title: track.title, type: "single", quality: track.quality, retention: 0.62,
    weeklyStreams: initialStreams, totalStreams: 0, weeksOut: 0, radioPlays: 0,
    expected: initialStreams, certified: null, pushed: false,
    premiumShare: computePremiumShare(artist.hype, false),
    platformSplit: normalizedSplit(PLATFORM_BASE_SPLIT),
    streamSource: normalizedSplit(STREAM_SOURCE_BASE_SPLIT, false),
    certAlerted: null,
  };
  next.releases.unshift(release);
  artist.lastReleaseWeek = next.week;
  next.totalReleases += 1;
  next.messages.unshift({
    id: nextId(), week: next.week, title: `Vault ouverte : « ${track.title} »`,
    body: `La chute de studio de ${artist.name} sort enfin — ${fmt(VAULT_RELEASE_COST)} € et c'est en ligne. Sans promo ni tapage, elle démarre plus modestement qu'une vraie sortie travaillée.`,
  });
  return next;
}

// Suivre l'idée d'un artiste : projet lancé avec un budget par défaut, moins
// cher (l'artiste pousse, il n'attend pas un studio de prestige) et un bonus
// de qualité "inspiration" — respecter l'envie de l'artiste paie.
export function startProjectFromIdea(s: GameState, ideaId: string): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  if (next.project) return next;
  const idea = next.artistIdeas.find((i) => i.id === ideaId);
  const artist = idea ? next.roster.find((a) => a.id === idea.artistId) : null;
  if (!idea || !artist) return next;
  const bpmRange = STYLE_BPM[artist.style] ?? [80, 140];
  const bpm = Math.round((bpmRange[0] + bpmRange[1]) / 2);
  const stats = computeProductionStats(artist, DEFAULT_BUDGET_CHOICE, idea.type, next.staff, bpm, "classique", null, null);
  const baseCost = effectiveBudgetCost(DEFAULT_BUDGET_CHOICE, next.hasHomeStudio, null);
  const cost = Math.round(baseCost * (1 - idea.costDiscount));
  if (next.cash < cost) return next;
  next.cash -= cost;
  next.project = {
    artistId: artist.id, type: idea.type, title: idea.title,
    weeksLeft: TYPE_META[idea.type].weeks,
    bpm, structure: "classique", featuringArtistId: null, beatmakerId: null,
    ...stats, quality: Math.round(stats.quality * (1 + idea.qualityBonus)), hypeBoost: stats.hypeBoost + 3,
  };
  next.artistIdeas = next.artistIdeas.filter((i) => i.id !== ideaId);
  next.messages.unshift({
    id: nextId(), week: next.week, title: `Studio : « ${idea.title} » (idée de ${artist.name})`,
    body: `Tu suis l'inspiration de ${artist.name} — budget réduit (${fmt(cost)} €), mais l'énergie du moment est réelle.`,
  });
  return next;
}

export function declineArtistIdea(s: GameState, ideaId: string): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  next.artistIdeas = next.artistIdeas.filter((i) => i.id !== ideaId);
  return next;
}

// ---------- Banque & options de survie ----------

export function takeLoan(s: GameState, amount: number): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  if (next.loan) return next; // un seul prêt à la fois
  const offer = LOAN_OFFERS.find((o) => o.amount === amount);
  if (!offer || next.reputation < offer.minRep) return next;
  const total = Math.round(amount * (1 + LOAN_INTEREST));
  const monthlyPayment = Math.ceil(total / LOAN_MONTHS / 10) * 10;
  next.loan = { amount, remaining: total, monthlyPayment, takenWeek: next.week };
  next.cash += amount;
  next.messages.unshift({
    id: nextId(), week: next.week, title: `Prêt accordé : ${fmt(amount)} €`,
    body: `La banque débloque les fonds. À rembourser : ${fmt(total)} € (intérêts ${Math.round(LOAN_INTEREST * 100)} %) sur ${LOAN_MONTHS} mois, soit ${fmt(monthlyPayment)} € prélevés à chaque fin de mois.`,
  });
  return next;
}

// Valeur de rachat d'un contrat d'artiste — basée sur ce que le marché VOIT
// (fourchette de potentiel, hype), pas sur le potentiel caché. Un artiste
// fraîchement signé sans hype se vend à perte : développer d'abord, vendre ensuite.
export function artistContractValue(a: Artist): number {
  const mid = (a.shownPotential[0] + a.shownPotential[1]) / 2;
  const base = a.signingFee * 0.5 + mid * 450;
  return Math.max(500, Math.round((base * (0.4 + a.hype / 100)) / 100) * 100);
}

export function sellArtistContract(s: GameState, artistId: string): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  const artist = next.roster.find((a) => a.id === artistId);
  if (!artist) return next;
  const value = artistContractValue(artist);
  next.roster = next.roster.filter((a) => a.id !== artistId);
  next.cash += value;
  const buyer = pick(next.rivals);
  buyer.roster.push({ name: artist.name, weeklyStreams: ri(8000, 25000) + artist.hype * 900 });
  if (next.project && next.project.artistId === artistId) {
    next.project = null;
    next.messages.unshift({
      id: nextId(), week: next.week, title: "Prod annulée",
      body: `Le projet en cours de ${artist.name} est abandonné — le budget engagé est perdu.`,
    });
  }
  next.messages.unshift({
    id: nextId(), week: next.week, title: `${buyer.name} rachète le contrat de ${artist.name}`,
    body: `Cession du contrat : ${fmt(value)} € encaissés. ${artist.name} poursuivra sa carrière chez ${buyer.name} — ses sorties déjà publiées restent dans ton catalogue.`,
  });
  return next;
}

// Cession des droits d'une sortie : un acheteur valorise le catalogue sur un
// multiple des revenus hebdo actuels (meilleure qualité = meilleur multiple).
// Tu encaisses tout de suite, mais la sortie et ses revenus futurs sortent du label.
export function catalogValue(r: Release): number {
  return Math.max(300, Math.round((r.weeklyStreams * STREAM_RATE * (8 + r.quality / 20)) / 100) * 100);
}

// v13 — cycle de vie d'un titre (§56 du GDD) : purement présentationnel, dérivé
// des données existantes, sans état supplémentaire à maintenir.
export function releaseLifecycleStage(r: Release): string {
  if (r.certified) return "Hit certifié";
  if (r.weeksOut <= 1) return "Découverte";
  const avg = r.totalStreams / Math.max(1, r.weeksOut);
  if (r.weeklyStreams > avg * 1.15) return "Croissance";
  if (r.weeksOut > 20) return "Catalogue";
  if (r.weeklyStreams < avg * 0.4) return "Déclin";
  return "Stabilisation";
}

// Revenu hebdo réaliste d'une sortie (mix premium/freemium propre à la sortie).
export function releaseWeeklyRevenue(r: Release): number {
  const premium = r.weeklyStreams * r.premiumShare * PREMIUM_STREAM_RATE;
  const freemium = r.weeklyStreams * (1 - r.premiumShare) * FREEMIUM_STREAM_RATE;
  const radio = r.radioPlays * RADIO_RATE;
  return (premium + freemium + radio) * (1 + DROITS_RATE);
}

// v15 §22 — profil de carrière : le succès n'a pas une seule forme. Purement
// présentationnel, dérivé des données existantes de l'artiste et de son
// catalogue actif — aucun nouvel état à maintenir.
export function artistCareerProfile(a: Artist, releases: Release[], certifications: { artistName: string }[]): string {
  const myReleases = releases.filter((r) => r.artistId === a.id);
  const certCount = certifications.filter((c) => c.artistName === a.name).length;
  const totalRadio = myReleases.reduce((sum, r) => sum + r.radioPlays, 0);
  if (certCount >= 2) return "Star confirmée";
  if (a.hype >= 75) return "Phénomène viral";
  if (totalRadio >= 15) return "Valeur sûre radio";
  if (myReleases.length > 0 && a.hype <= 25) return "Reconstruction en cours";
  if (myReleases.length === 0) return "Encore à découvrir";
  return "Artiste en développement";
}

// v15 §24 — patrimoine du label : un vrai bilan de carrière qui capitalise sur
// tout ce que le label a construit. "Catalogue actif" = ce qui tourne encore ;
// le cumul carrière (totalStreamsAllTime, totalReleases) couvre tout l'historique.
export function labelLegacy(s: GameState): { activeCatalogValue: number; certifCounts: Record<string, number> } {
  const activeCatalogValue = s.releases.reduce((sum, r) => sum + catalogValue(r), 0);
  const certifCounts: Record<string, number> = { or: 0, platine: 0, diamant: 0 };
  for (const c of s.certifications) certifCounts[c.level] = (certifCounts[c.level] ?? 0) + 1;
  return { activeCatalogValue, certifCounts };
}

export function sellCatalog(s: GameState, releaseId: string): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  const release = next.releases.find((r) => r.id === releaseId);
  if (!release) return next;
  const value = catalogValue(release);
  next.releases = next.releases.filter((r) => r.id !== releaseId);
  next.cash += value;
  next.messages.unshift({
    id: nextId(), week: next.week, title: `Catalogue cédé : « ${release.title} »`,
    body: `Les droits de « ${release.title} » (${release.artistName}) sont vendus ${fmt(value)} €. Les revenus futurs de cette sortie ne te reviennent plus.`,
  });
  return next;
}

// ---------- Campagne de sortie (v11) ----------

// Boost de campagne post-sortie — relance presse/réseaux, utilisable une fois
// par sortie dans les 4 semaines qui suivent le drop. Coup de pouce ponctuel,
// pas une baguette magique : effet notable mais pas garanti à chaque fois.
export function pushRelease(s: GameState, releaseId: string): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  const release = next.releases.find((r) => r.id === releaseId);
  if (!release || release.pushed || release.weeksOut > PUSH_WINDOW_WEEKS) return next;
  if (next.cash < PUSH_COST) return next;
  next.cash -= PUSH_COST;
  release.pushed = true;
  const hit = Math.random() < 0.65;
  if (hit) {
    release.weeklyStreams = Math.round(release.weeklyStreams * rnd(1.2, 1.5));
    next.messages.unshift({
      id: nextId(), week: next.week, title: `Relance de campagne payante pour « ${release.title} »`,
      body: `${fmt(PUSH_COST)} € investis en relance presse/réseaux — la sortie reprend un coup de vie, les streams de la semaine grimpent.`,
    });
  } else {
    next.messages.unshift({
      id: nextId(), week: next.week, title: `Relance sans grand effet pour « ${release.title} »`,
      body: `${fmt(PUSH_COST)} € investis, mais la relance n'a pas vraiment pris cette fois. Une campagne, ça ne marche pas à tous les coups.`,
    });
  }
  return next;
}

// ---------- Dilemmes de l'industrie ----------

// Chaque dilemme apprend un vrai mécanisme du secteur : placement de marque,
// pitch playlist payant, avance distributeur, featuring inter-labels.
function makeChoiceEvent(s: GameState, kind: ChoiceEvent["kind"], refIdArg?: string): ChoiceEvent | null {
  const base = { id: nextId(), kind, createdWeek: s.week, expiresWeek: s.week + 2 };
  if (kind === "promise") {
    const artist = s.roster.find((a) => a.id === refIdArg);
    if (!artist) return null;
    return {
      ...base, refId: artist.id, expiresWeek: s.week + 2,
      title: `${artist.name} veut un engagement`,
      body: `${artist.name} : « Je veux être sur ton prochain projet. Tu me le promets ? » Une promesse tenue construit la confiance — une promesse rompue laisse une vraie trace.`,
      optionA: "Promettre",
      optionB: "Rester vague",
    };
  }
  if (kind === "renewal") {
    const artist = s.roster.find((a) => a.id === refIdArg);
    if (!artist) return null;
    const newSalary = Math.round((artist.salary * (1 + CONTRACT_RENEWAL_RAISE)) / 50) * 50;
    return {
      ...base, refId: artist.id, expiresWeek: s.week + artist.contractWeeksLeft,
      title: `Renouvellement de contrat — ${artist.name}`,
      body: `Le contrat de ${artist.name} arrive à échéance dans ${artist.contractWeeksLeft} semaines. Il/elle demande une revalorisation à ${fmt(newSalary)} €/mois (contre ${fmt(artist.salary)} € aujourd'hui) pour rester.`,
      optionA: `Renouveler à ${fmt(newSalary)} €/mois`,
      optionB: "Le laisser partir en fin de contrat",
    };
  }
  if (kind === "fraud") {
    const release = s.releases[0];
    if (!release) return null;
    const streamsOffered = ri(20000, 60000);
    const cost = Math.round((300 + streamsOffered * 0.015) / 50) * 50;
    return {
      ...base, refId: release.id, fraudCost: cost, fraudStreams: streamsOffered,
      title: `Prestataire "streams garantis" pour « ${release.title} »`,
      body: `Un prestataire douteux propose ${fmt(streamsOffered)} streams "garantis" pour ${fmt(cost)} €. Trafic frauduleux, bots, playlists suspectes — les plateformes détectent parfois ce genre d'anomalie, avec de vraies conséquences.`,
      optionA: `Accepter (-${fmt(cost)} €, risqué)`,
      optionB: "Refuser (rester propre)",
    };
  }
  if (kind === "brand" || kind === "playlist" || kind === "advance") {
    const release = s.releases[0];
    if (!release) return null;
    if (kind === "brand") {
      return {
        ...base, refId: release.artistId,
        title: `Placement de produit pour ${release.artistName}`,
        body: `Une marque de streetwear propose 4 000 € pour apparaître dans les prochains contenus de ${release.artistName}. Le cachet est réel — l'effet sur l'image aussi.`,
        optionA: "Accepter (+4 000 €, image écornée)",
        optionB: "Refuser (crédibilité préservée)",
      };
    }
    if (kind === "playlist") {
      return {
        ...base, refId: release.id,
        title: `Pitch playlist pour « ${release.title} »`,
        body: `Un pitcheur indépendant propose de présenter « ${release.title} » aux gros curateurs de playlists pour 500 €. Aucun résultat garanti — c'est la règle du jeu du pitch.`,
        optionA: "Payer le pitch (-500 €, résultat incertain)",
        optionB: "Décliner",
      };
    }
    return {
      ...base, refId: null,
      title: "Avance distributeur",
      body: `Ton distributeur propose 3 000 € d'avance immédiate contre 20 % de tes revenus streaming pendant 8 semaines. Du cash tout de suite, moins de marge demain — le grand classique du secteur.`,
      optionA: "Prendre l'avance (+3 000 €)",
      optionB: "Garder ses marges",
    };
  }
  // feat
  const artist = pick(s.roster);
  if (!artist) return null;
  const rival = pick(s.rivals);
  return {
    ...base, refId: artist.id,
    title: `Featuring proposé à ${artist.name}`,
    body: `L'équipe d'un artiste de ${rival.name} propose un feat à ${artist.name} : 1 200 € de frais de session, exposition croisée des deux fanbases à la clé.`,
    optionA: "Financer le feat (-1 200 €, hype)",
    optionB: "Passer son tour",
  };
}

export function resolveChoice(s: GameState, choiceId: string, option: "a" | "b"): GameState {
  const next: GameState = JSON.parse(JSON.stringify(s));
  const choice = next.pendingChoices.find((c) => c.id === choiceId);
  if (!choice) return next;
  next.pendingChoices = next.pendingChoices.filter((c) => c.id !== choiceId);

  if (choice.kind === "brand") {
    const artist = next.roster.find((a) => a.id === choice.refId);
    if (option === "a") {
      next.cash += 4000;
      if (artist) artist.hype = Math.max(0, artist.hype - 6);
      next.reputation = Math.max(0, next.reputation - 2);
      next.messages.unshift({
        id: nextId(), week: next.week, title: "Le placement fait jaser",
        body: `+4 000 € encaissés... mais une partie du public trouve ça « vendu ». Hype et réputation en prennent un peu. L'argent des marques n'est jamais gratuit.`,
      });
    } else {
      if (artist) artist.hype = Math.min(100, artist.hype + 3);
      next.messages.unshift({
        id: nextId(), week: next.week, title: "La crédibilité avant tout",
        body: `Tu refuses le placement — la street respecte. ${artist ? `${artist.name} gagne en crédibilité.` : ""} Pas de cash, mais une image intacte.`,
      });
    }
  } else if (choice.kind === "playlist") {
    if (option === "a") {
      next.cash -= 500;
      const release = next.releases.find((r) => r.id === choice.refId);
      if (release && Math.random() < 0.6) {
        release.weeklyStreams = Math.round(release.weeklyStreams * 1.35);
        next.messages.unshift({
          id: nextId(), week: next.week, title: `« ${release.title} » entre en playlist ✅`,
          body: `Le pitch a fonctionné — plusieurs curateurs ajoutent le titre, les streams décollent. Les 500 € les mieux investis du mois.`,
        });
      } else {
        next.messages.unshift({
          id: nextId(), week: next.week, title: "Pitch resté lettre morte",
          body: `500 € et pas une réponse des curateurs. C'est le jeu du pitch : parfois ça prend, parfois non. Les pros diversifient leurs canaux.`,
        });
      }
    }
  } else if (choice.kind === "advance") {
    if (option === "a") {
      next.cash += 3000;
      next.advanceDeal = { weeksLeft: 8, share: 0.2 };
      next.messages.unshift({
        id: nextId(), week: next.week, title: "Avance distributeur signée",
        body: `+3 000 € tout de suite — en échange, 20 % de tes revenus streaming partiront au distributeur pendant 8 semaines. Surveille tes marges dans Finances.`,
      });
    }
  } else if (choice.kind === "feat") {
    if (option === "a") {
      next.cash -= 1200;
      const artist = next.roster.find((a) => a.id === choice.refId);
      if (artist) {
        artist.hype = Math.min(100, artist.hype + 12);
        next.messages.unshift({
          id: nextId(), week: next.week, title: `Le feat de ${artist.name} fait du bruit`,
          body: `Session payée, morceau enregistré — l'exposition croisée dope la hype de ${artist.name}. Les feats, c'est le nerf du rap game.`,
        });
      }
    }
  } else if (choice.kind === "renewal") {
    const artist = next.roster.find((a) => a.id === choice.refId);
    if (artist) {
      if (option === "a") {
        const newSalary = Math.round((artist.salary * (1 + CONTRACT_RENEWAL_RAISE)) / 50) * 50;
        artist.salary = newSalary;
        artist.contractWeeksLeft = ri(CONTRACT_MIN_WEEKS, CONTRACT_MAX_WEEKS);
        artist.contractWeeksTotal = artist.contractWeeksLeft;
        artist.leaving = false;
        next.messages.unshift({
          id: nextId(), week: next.week, title: `${artist.name} prolonge l'aventure`,
          body: `Nouveau contrat signé à ${fmt(newSalary)} €/mois. ${artist.name} reste au label.`,
        });
      } else {
        artist.leaving = true;
        next.messages.unshift({
          id: nextId(), week: next.week, title: `${artist.name} partira en fin de contrat`,
          body: `Pas de renouvellement — ${artist.name} quittera le label dans ${artist.contractWeeksLeft} semaines. Ses sorties actuelles continuent de tourner d'ici là.`,
        });
      }
    }
  } else if (choice.kind === "fraud") {
    if (option === "a") {
      const cost = choice.fraudCost ?? 500;
      const streamsOffered = choice.fraudStreams ?? 30000;
      next.cash -= cost;
      const release = next.releases.find((r) => r.id === choice.refId);
      if (Math.random() < FRAUD_DETECTION_CHANCE) {
        // Détecté : la plateforme retire des streams, la réputation trinque.
        if (release) release.weeklyStreams = Math.max(0, Math.round(release.weeklyStreams - streamsOffered * 0.6));
        next.reputation = Math.max(0, next.reputation - FRAUD_REPUTATION_PENALTY);
        next.messages.unshift({
          id: nextId(), week: next.week, title: "⚠️ Trafic frauduleux détecté",
          body: `La plateforme a repéré l'anomalie sur ${release ? `« ${release.title} »` : "la sortie"} — streams retirés, réputation entamée (${FRAUD_REPUTATION_PENALTY} points). ${fmt(cost)} € dépensés pour rien. La leçon coûte cher : ce genre de prestataire est presque toujours une mauvaise idée.`,
        });
      } else if (release) {
        release.weeklyStreams = Math.round(release.weeklyStreams + streamsOffered);
        next.messages.unshift({
          id: nextId(), week: next.week, title: "Streams livrés, sans anicroche cette fois",
          body: `${fmt(streamsOffered)} streams ajoutés à « ${release.title} » pour ${fmt(cost)} €. Passé inaperçu cette fois — mais le risque reste entier à chaque nouvelle commande.`,
        });
      }
    } else {
      next.messages.unshift({
        id: nextId(), week: next.week, title: "Offre douteuse écartée",
        body: `Tu refuses le prestataire "streams garantis" — la bonne décision : ce genre de trafic finit presque toujours par se voir.`,
      });
    }
  } else if (choice.kind === "promise") {
    const artist = next.roster.find((a) => a.id === choice.refId);
    if (artist) {
      if (option === "a") {
        const promise: Promise_ = {
          id: nextId(), artistId: artist.id, artistName: artist.name,
          text: "Tu me mets sur ton prochain projet.",
          createdWeek: next.week, dueWeek: next.week + PROMISE_WINDOW_WEEKS, kept: null,
        };
        next.promises.push(promise);
        next.messages.unshift({
          id: nextId(), week: next.week, title: `Promesse faite à ${artist.name}`,
          body: `Tu t'engages : ${artist.name} sera sur le prochain projet lancé, dans les ${PROMISE_WINDOW_WEEKS} semaines. Le jeu s'en souviendra — tenue ou rompue, ça comptera.`,
        });
      } else {
        artist.hype = Math.max(0, artist.hype - 3);
        next.messages.unshift({
          id: nextId(), week: next.week, title: `${artist.name} reste sur sa faim`,
          body: `Tu restes vague — pas d'engagement pris, mais pas de promesse à tenir non plus. ${artist.name} le remarque.`,
        });
      }
    }
  } else if (choice.kind === "clearance") {
    const release = next.releases.find((r) => r.id === choice.refId);
    if (release) {
      if (option === "a") {
        const cost = choice.clearanceCost ?? 500;
        next.cash -= cost;
        next.messages.unshift({
          id: nextId(), week: next.week, title: `Sample dédouané — « ${release.title} »`,
          body: `${fmt(cost)} € réglés pour régulariser les droits. La sortie continue tranquillement, en règle.`,
        });
      } else {
        next.releases = next.releases.filter((r) => r.id !== release.id);
        next.reputation = Math.max(0, next.reputation - 2);
        next.messages.unshift({
          id: nextId(), week: next.week, title: `« ${release.title} » retiré des plateformes`,
          body: `Le morceau est retiré pour éviter le risque juridique — tout le travail sur cette sortie est perdu, et la petite polémique entame un peu la réputation du label.`,
        });
      }
    }
  }
  return next;
}
