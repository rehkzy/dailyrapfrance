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
  Artist, BudgetKey, BudgetOption, ChartEntry, ConcertOffer, GameState,
  Negotiation, Person, Project, StaffRole,
} from "./types";
import {
  BUDGET_PRESETS, OLD_SAVE_BACKUP_KEY, PERSONALITIES, SAVE_KEY, SAVE_VERSION,
  SEASON_WEEKS, STAFF_ROLE_KEYS, STAFF_SEVERANCE_WEEKS, START_CASH, STREAM_RATE,
  TYPE_META, VENUES,
} from "./data";
import { fullName, makeArtist, makeInitialStaffMarket, makeStaffCandidate, nextId, pick, ri, rnd } from "./people";
import { makeRivals, makeTrends, tickWorld } from "./world";

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

export function staffWeeklyCost(staff: Person[]): number {
  return staff.reduce((sum, p) => sum + p.askSalary, 0);
}

// ---------- Production : source unique de vérité ----------

// Utilisée pour l'aperçu en direct dans le Studio ET pour les valeurs figées sur
// le Project au lancement — une seule formule, pas de divergence. v6 : le staff
// en poste modifie le résultat (effets documentés dans STAFF_ROLES).
export function computeProductionStats(
  artist: Artist,
  choice: Record<BudgetKey, number>,
  type: Project["type"],
  staff: Person[]
): Pick<Project, "quality" | "reach" | "adsMult" | "mediaChance" | "hypeBoost" | "retention"> {
  const meta = TYPE_META[type];
  const instru = budgetPreset("instru", choice);
  const enr = budgetPreset("enregistrement", choice);
  const mix = budgetPreset("mix", choice);
  const master = budgetPreset("mastering", choice);
  const cover = budgetPreset("cover", choice);
  const clip = budgetPreset("clip", choice);
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

  const skill = (artist.flow + artist.plume) / 2; // 0-20
  const quality = Math.round(
    (skill * 3.2 + (enr.add ?? 0)) *
    (instru.mult ?? 1) * (mix.mult ?? 1) * (master.mult ?? 1) * (cover.mult ?? 1) *
    daMult * ingeMult *
    meta.studioBase
  );
  const reach = (dist.mult ?? 1) * (clip.mult ?? 1);
  // Marketing : chaque euro de pub travaille plus dur (jusqu'à +20 %).
  const adsMult = (ads.mult ?? 1) * (marketing ? 1 + marketing.skill / 100 : 1);
  // Attaché(e) de presse : chance média du budget + son carnet d'adresses.
  const mediaChance = Math.min(0.9, (presse.mediaChance ?? 0) + (pressePerso ? pressePerso.skill / 100 : 0));
  const hypeBoost = 12 + (clip.hypeBoost ?? 0);
  const retention = Math.max(0.55, Math.min(0.9,
    0.62 + ((master.mult ?? 1) * ingeMult - 1) * 0.5 + (reach - 1) * 0.15 + quality / 1000
  ));
  return { quality, reach, adsMult, mediaChance, hypeBoost, retention };
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
        body: `Ton offre à ${fmt(nego.offer)} €/sem est acceptée. Son effet de poste s'applique dès maintenant.`,
      });
    } else if (Math.random() < 0.55) {
      // Contre-proposition plutôt que refus sec — à toi de trancher.
      nego.status = "countered";
      nego.counter = Math.round((person.askSalary * rnd(1.02, 1.12)) / 10) * 10;
      s.messages.unshift({
        id: nextId(), week: s.week,
        title: `${fullName(person)} fait une contre-proposition`,
        body: `Ton offre à ${fmt(nego.offer)} €/sem ne suffit pas — il/elle demande ${fmt(nego.counter)} €/sem. Réponds depuis l'onglet Staff avant que l'offre expire.`,
      });
    } else {
      nego.status = "refused";
      person.motivation = Math.max(0, person.motivation - 5);
      s.messages.unshift({
        id: nextId(), week: s.week,
        title: `${fullName(person)} décline ton offre`,
        body: `${fmt(nego.offer)} €/sem, c'était trop bas (demande : ${fmt(person.askSalary)} €/sem). Le candidat reste sur le marché... pour l'instant.`,
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
  const fee = Math.round((600 + artist.hype * rnd(45, 90) + skill * rnd(80, 160)) / 50) * 50;
  const offer: ConcertOffer = {
    id: nextId(),
    artistId: artist.id,
    artistName: artist.name,
    venue: pick(VENUES),
    cityName: pick(["Paris", "Marseille", "Lyon", "Lille", "Bordeaux", "Nantes", "Genève", "Bruxelles"]),
    fee,
    expiresWeek: s.week + 2,
  };
  s.concertOffers.push(offer);
  s.messages.unshift({
    id: nextId(), week: s.week,
    title: `Offre de concert pour ${artist.name}`,
    body: `${booker ? `Ton booker a décroché` : `Une salle propose`} une date (cachet : ${fmt(fee)} €). Accepte ou refuse depuis le dashboard — l'offre expire dans 2 semaines.`,
  });
}

// ---------- Sauvegarde ----------

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
    trends: makeTrends(),
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

// ---------- Classement ----------

export function computeChart(s: GameState): ChartEntry[] {
  const entries: ChartEntry[] = [
    ...s.rivals.map((r) => ({
      key: `rival:${r.name}`,
      name: r.name,
      title: r.lastRelease,
      streams: r.streams,
      mine: false,
    })),
    ...s.releases.map((r) => ({
      key: `rel:${r.id}`,
      name: r.artistName,
      title: `« ${r.title} »`,
      streams: r.weeklyStreams,
      mine: true,
    })),
  ];
  return entries.sort((a, b) => b.streams - a.streams).slice(0, 10);
}

// ---------- La semaine ----------

export function advanceWeek(prev: GameState): GameState {
  const s: GameState = JSON.parse(JSON.stringify(prev));
  s.prevChartOrder = computeChart(prev).map((e) => e.key);
  s.week += 1;

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
        let initialStreams = Math.round(
          (proj.quality * 900 * proj.reach * proj.adsMult + artist.hype * 700 * proj.reach + rnd(0, 10000)) * trendMult
        );
        const mediaHit = Math.random() < proj.mediaChance;
        if (mediaHit) {
          initialStreams = Math.round(initialStreams * 1.3);
          s.reputation = Math.min(100, s.reputation + ri(2, 5));
        }
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
        });
        artist.hype = Math.min(100, artist.hype + proj.hypeBoost);
        s.totalReleases += 1;
        s.messages.unshift({
          id: nextId(), week: s.week, title: `Sortie : « ${proj.title} »`,
          body: `Le ${TYPE_META[proj.type].label.toLowerCase()} de ${artist.name} est dans les bacs${trendMult >= 1.2 ? ` — et le ${artist.style} est en pleine tendance, ça tombe bien` : trendMult <= 0.8 ? ` — mais le ${artist.style} n'a pas le vent en poupe en ce moment` : ""}. Premier bilan la semaine prochaine.`,
        });
        if (mediaHit) {
          s.messages.unshift({
            id: nextId(), week: s.week, title: "La presse en parle",
            body: `Un média rap a repéré « ${proj.title} » — coup de projecteur qui dope la sortie et ta réputation.`,
          });
        }
      }
      s.project = null;
    }
  }

  // 3) Vie des sorties : streams, revenus, déclin.
  let weekRevenue = 0;
  for (const r of s.releases) {
    r.weeksOut += 1;
    r.totalStreams += r.weeklyStreams;
    s.totalStreamsAllTime += r.weeklyStreams;
    weekRevenue += r.weeklyStreams * STREAM_RATE;
    r.weeklyStreams = Math.round(r.weeklyStreams * r.retention);
  }
  s.releases = s.releases.filter((r) => r.weeklyStreams > 200);
  s.cash += weekRevenue;

  // 4) Salaires : artistes + staff.
  s.cash -= s.roster.reduce((sum, a) => sum + a.salary, 0);
  s.cash -= staffWeeklyCost(s.staff);

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

  // 6) Attaché(e) de presse : entretien de réputation hebdo.
  const pressePerso = staffByRole(s.staff, "presse");
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

  // 8) Le monde vit : rivaux (signatures, sorties, débauchages) + tendances.
  tickWorld(s);

  // 9) Réputation vs concurrence (comme avant : battre les rivaux paie).
  const best = s.releases[0]?.weeklyStreams ?? 0;
  const beaten = s.rivals.filter((r) => best > r.streams).length;
  s.reputation = Math.max(0, Math.min(100, s.reputation + (beaten >= 5 ? 3 : beaten >= 2 ? 1 : best > 0 ? 0 : -1)));

  // 10) Marchés qui tournent : candidats staff (disponibilité limitée) et talents.
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
    s.market = [...s.market.slice(1), makeArtist(used)];
  }
  while (s.market.length < 3) {
    const used = new Set([...s.roster, ...s.market].map((a) => a.name));
    s.market.push(makeArtist(used));
  }

  s.messages = s.messages.slice(0, 16);

  if (s.cash < 0) s.gameOver = "bankrupt";
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
  next.totalConcerts += 1;
  const artist = next.roster.find((a) => a.id === offer.artistId);
  if (artist) artist.hype = Math.min(100, artist.hype + ri(3, 8));
  next.messages.unshift({
    id: nextId(), week: next.week, title: `${offer.artistName} sur scène à ${offer.cityName}`,
    body: `Date confirmée à ${offer.venue}. Cachet encaissé : ${fmt(offer.fee)} €. La scène entretient la hype.`,
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
    body: `Proposition : ${fmt(offer)} €/sem (demande : ${fmt(person.askSalary)} €/sem). Réponse à la prochaine avancée de semaine.`,
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
    body: `Contre-proposition acceptée : ${fmt(person.askSalary)} €/sem. Son effet de poste s'applique dès maintenant.`,
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
  const severance = person.askSalary * STAFF_SEVERANCE_WEEKS;
  next.staff = next.staff.filter((p) => p.id !== personId);
  next.cash -= severance;
  next.reputation = Math.max(0, next.reputation - 1);
  next.messages.unshift({
    id: nextId(), week: next.week, title: `${fullName(person)} quitte le label`,
    body: `Licenciement acté — indemnité de ${STAFF_SEVERANCE_WEEKS} semaines de salaire (${fmt(severance)} €). Le poste est vacant, son effet disparaît immédiatement.`,
  });
  return next;
}
