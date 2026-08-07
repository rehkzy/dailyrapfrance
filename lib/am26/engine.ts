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
  Artist, BudgetKey, BudgetOption, ChartEntry, ChoiceEvent, ConcertOffer, GameState,
  LabelChartEntry, Negotiation, Objective, Person, Project, ProjectChartEntry, Release, SongStructure, StaffRole,
} from "./types";
import {
  BUDGET_PRESETS, CERT_LEVELS, CONTRACT_MAX_WEEKS, CONTRACT_RENEWAL_RAISE, CONTRACT_RENEWAL_WINDOW,
  DROITS_RATE, FEATURING_FEE_RATE, LIQUIDATION_FLOOR, LOAN_INTEREST, LOAN_MONTHS, LOAN_OFFERS,
  MONTH_WEEKS, OLD_SAVE_BACKUP_KEY, OVERDRAFT_RATE, PERSONALITIES, PERSONALITY_CLASHES, PUSH_COST,
  PUSH_WINDOW_WEEKS, RADIO_RATE, SAVE_KEY, SAVE_VERSION, SEASON_WEEKS, STAFF_ROLES, STAFF_ROLE_KEYS,
  STAFF_SEVERANCE_MONTHS, START_CASH, STREAM_RATE, STYLE_BPM, TOUR_MAX_DATES, TOUR_MIN_DATES, TYPE_META, VENUES,
} from "./data";
import { fullName, makeArtist, makeInitialStaffMarket, makeStaffCandidate, nextId, pick, ri, rnd } from "./people";
import { makeRivals, makeTrends, rivalLabelStreams, tickWorld } from "./world";

export const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

// ---------- Budget ----------

export function budgetPreset(key: BudgetKey, choice: Record<BudgetKey, number>): BudgetOption {
  return BUDGET_PRESETS[key][choice[key]];
}

export function budgetTotalCost(choice: Record<BudgetKey, number>): number {
  return (Object.keys(BUDGET_PRESETS) as BudgetKey[]).reduce((sum, k) => sum + budgetPreset(k, choice).v, 0);
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
  featuringArtist: Artist | null
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

  const skill = (artist.flow + artist.plume) / 2; // 0-20
  const quality = Math.round(
    (skill * 3.2 + (enr.add ?? 0)) *
    (instru.mult ?? 1) * (mix.mult ?? 1) * (master.mult ?? 1) * (cover.mult ?? 1) * (clipConcept.mult ?? 1) *
    daMult * ingeMult * bpmMult * structQualityMult *
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
    pendingConcertIncome: 0,
    objectives: makeObjectives(),
    pendingChoices: [],
    advanceDeal: null,
    certifications: [],
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
        // Prévision "des pros" : ce que le projet devrait faire sur le papier.
        // La tendance, l'aléa et la presse feront la vraie histoire — suspense
        // révélé au premier bilan, la semaine suivante.
        const expected = Math.round(proj.quality * 2800 * proj.reach * proj.adsMult + artist.hype * 2200 * proj.reach);
        let initialStreams = Math.round(
          (proj.quality * 2800 * proj.reach * proj.adsMult + artist.hype * 2200 * proj.reach + rnd(0, 25000)) * trendMult
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
        });
        artist.hype = Math.min(100, artist.hype + proj.hypeBoost);
        s.totalReleases += 1;
        const featGuest = proj.featuringArtistId ? s.roster.find((a) => a.id === proj.featuringArtistId) : null;
        s.messages.unshift({
          id: nextId(), week: s.week, title: `Sortie : « ${proj.title} »`,
          body: `Le ${TYPE_META[proj.type].label.toLowerCase()} de ${artist.name}${featGuest ? ` feat. ${featGuest.name}` : ""} est dans les bacs${trendMult >= 1.2 ? ` — et le ${artist.style} est en pleine tendance, ça tombe bien` : trendMult <= 0.8 ? ` — mais le ${artist.style} n'a pas le vent en poupe en ce moment` : ""}. Les pros tablent sur ~${fmt(expected)} streams de démarrage. Verdict au premier bilan, la semaine prochaine.`,
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
    streamingRev += r.weeklyStreams * STREAM_RATE;
    radioRev += r.radioPlays * RADIO_RATE;

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
          body: `${fmt(cert.at)} streams cumulés — ${r.artistName} entre au palmarès du label. (En vrai, en France : or = 15 M d'équivalents streams — l'échelle du jeu est adaptée.) Réputation +${cert.rep}.`,
        });
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
  const cm = staffByRole(s.staff, "cm");
  const hypeDecay = Math.max(0.5, 2 - (cm ? cm.skill / 8 : 0));
  for (const a of s.roster) a.hype = Math.max(0, a.hype - hypeDecay);
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
      kinds.push("brand", "playlist");
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
  }
  return next;
}
