/*
 * ARTISTS MANAGER 2026 — v6 : génération de personnes simulées.
 * Artistes et candidats staff avec attributs visibles ET cachés — le vrai
 * niveau/potentiel n'est jamais parfaitement connu, seulement une fourchette.
 */

import type { Artist, Person, StaffRole } from "./types";
import { ARTIST_NAMES, CITIES, CONTRACT_MAX_WEEKS, CONTRACT_MIN_WEEKS, FIRSTNAMES, LASTNAMES, PERSONALITIES, STAFF_ROLES, STAFF_ROLE_KEYS, STYLES } from "./data";

export const rnd = (min: number, max: number) => min + Math.random() * (max - min);
export const ri = (min: number, max: number) => Math.round(rnd(min, max));
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

let uid = 0;
export const nextId = () => `${Date.now().toString(36)}-${uid++}`;

// Fourchette d'estimation autour d'une valeur cachée — le scouting est imparfait :
// la vraie valeur est dedans, mais la fourchette peut être large.
function fuzzyRange(real: number, max: number): [number, number] {
  const spread = ri(2, 4);
  const lo = Math.max(0, Math.min(real - ri(0, spread), max - 1));
  const hi = Math.min(max, Math.max(real + ri(0, spread), lo + 1));
  return [Math.round(lo), Math.round(hi)];
}

// ---------- Artistes ----------

// scoutBonus (0-1, issu du niveau de l'A&R) : relève le plancher de talent du
// vivier — un bon A&R ne fait pas signer des stars, il évite les tocards.
export function makeArtist(usedNames: Set<string>, scoutBonus = 0): Artist {
  const available = ARTIST_NAMES.filter((n) => !usedNames.has(n));
  const name = available.length > 0 ? pick(available) : `MC ${ri(10, 99)}`;
  usedNames.add(name);
  const talent = rnd(0.35 + Math.min(0.3, scoutBonus * 0.3), 0.95);
  const flow = ri(6 + talent * 8, 10 + talent * 10);
  const plume = ri(6 + talent * 8, 10 + talent * 10);
  // Potentiel caché : peut être bien au-dessus (pépite) ou à peine au-dessus
  // (plafond atteint) du niveau actuel — c'est là que vit la prise de risque.
  const currentAvg = (flow + plume) / 2;
  const potential = Math.min(20, Math.round(currentAvg + rnd(0, 6)));
  const contractWeeks = ri(CONTRACT_MIN_WEEKS, CONTRACT_MAX_WEEKS);
  return {
    id: nextId(),
    name,
    style: pick(STYLES),
    flow,
    plume,
    charisme: ri(5 + talent * 8, 10 + talent * 10),
    hype: ri(5, 30),
    // Avance mensuelle (€/mois) et prime de signature — échelle "artiste en
    // développement" d'un label indé : signer doit rester accessible, c'est
    // développer qui coûte.
    salary: Math.round(ri(400 + talent * 500, 600 + talent * 900) / 50) * 50,
    signingFee: Math.round(ri(800 + talent * 2200, 1500 + talent * 3500) / 100) * 100,
    potential,
    shownPotential: fuzzyRange(potential, 20),
    contractWeeksLeft: contractWeeks,
    contractWeeksTotal: contractWeeks,
    leaving: false,
    lifetimeRevenue: 0,
    advanceRecouped: false,
  };
}

// ---------- Candidats staff ----------

export function makeStaffCandidate(role: StaffRole, usedNames: Set<string>): Person {
  let firstName = pick(FIRSTNAMES);
  let lastName = pick(LASTNAMES);
  let guard = 0;
  while (usedNames.has(`${firstName} ${lastName}`) && guard < 20) {
    firstName = pick(FIRSTNAMES);
    lastName = pick(LASTNAMES);
    guard += 1;
  }
  usedNames.add(`${firstName} ${lastName}`);

  const expYears = ri(1, 15);
  // Le niveau réel est corrélé à l'expérience... mais pas garanti : un jeune
  // peut être brillant, un vétéran peut être moyen.
  const skill = Math.max(3, Math.min(20, Math.round(4 + expYears * 0.7 + rnd(-3, 5))));
  const meta = STAFF_ROLES[role];
  const perso = pick(PERSONALITIES);
  // Salaire demandé : dépend du rôle, du niveau perçu et de la réputation.
  const [lo, hi] = meta.baseSalary;
  const reputation = Math.max(5, Math.min(95, Math.round(skill * 4 + expYears * 1.5 + rnd(-10, 10))));
  // Salaire mensuel demandé (€/mois), arrondi à 50 €.
  const askSalary = Math.round(((lo + (hi - lo) * (skill / 20)) * rnd(0.9, 1.15)) / 50) * 50;

  return {
    id: nextId(),
    firstName,
    lastName,
    age: Math.min(58, 21 + expYears + ri(0, 8)),
    city: pick(CITIES),
    role,
    expYears,
    reputation,
    skill,
    shownSkill: fuzzyRange(skill, 20),
    personality: perso.name,
    askSalary,
    availabilityWeeks: ri(3, 8),
    styleAffinity: role === "da" || role === "inge" ? pick(STYLES) : null,
    motivation: ri(50, 90),
  };
}

// Pool initial de candidats : au moins un par rôle + quelques extras.
export function makeInitialStaffMarket(): Person[] {
  const used = new Set<string>();
  const pool: Person[] = STAFF_ROLE_KEYS.map((role) => makeStaffCandidate(role, used));
  for (let i = 0; i < 3; i += 1) pool.push(makeStaffCandidate(pick(STAFF_ROLE_KEYS), used));
  return pool;
}

export function fullName(p: Person): string {
  return `${p.firstName} ${p.lastName}`;
}

export function personalityDesc(name: string): string {
  const p = PERSONALITIES.find((x) => x.name === name);
  return p ? p.desc : "";
}
