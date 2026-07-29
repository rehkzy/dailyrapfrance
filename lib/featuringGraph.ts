/*
 * Graphe de featurings — curation manuelle de collaborations réelles et connues du rap FR,
 * PAS une vérification live contre Deezer (leur API n'offre aucun moyen fiable de demander
 * "est-ce que X a déjà featuré Y ?" — il faudrait scanner tout le catalogue de chaque
 * artiste, trop lent et trop fragile pour une validation en temps réel).
 *
 * Chaque lien ci-dessous correspond à un featuring réel et notoire. Liste volontairement
 * resserrée sur des collaborations connues du grand public — à étendre au fil du temps,
 * jamais à l'aveugle : n'ajouter un lien que si le morceau existe vraiment.
 */

export const FEATURING_GRAPH: Record<string, string[]> = {
  ninho: ["niska", "gazo", "hamza", "damso", "gims", "dadju", "werenoi", "koba lad"],
  niska: ["ninho", "gradur", "maes", "gazo"],
  gazo: ["ninho", "niska", "tiakola", "freeze corleone", "werenoi"],
  hamza: ["ninho", "damso", "gazo", "tiakola"],
  damso: ["ninho", "hamza", "booba", "gims"],
  booba: ["damso", "benash", "gims", "kaaris"],
  kaaris: ["booba", "sofiane", "alonzo"],
  gims: ["ninho", "damso", "booba", "dadju", "vegedream", "dadju"],
  dadju: ["ninho", "gims", "franglish", "maitre gims"],
  franglish: ["dadju", "aya nakamura"],
  "aya nakamura": ["franglish", "niska", "maluma"],
  werenoi: ["ninho", "gazo", "tiakola"],
  tiakola: ["gazo", "hamza", "werenoi", "franglish"],
  "koba lad": ["ninho", "jul"],
  jul: ["koba lad", "naps", "soso maness", "sch"],
  sch: ["jul", "gambi", "freeze corleone"],
  "freeze corleone": ["gazo", "sch", "alpha wann"],
  "alpha wann": ["freeze corleone", "nekfeu"],
  nekfeu: ["alpha wann", "orelsan", "vald"],
  orelsan: ["nekfeu", "gringe"],
  vald: ["nekfeu", "alpha wann"],
  naps: ["jul", "soolking"],
  soolking: ["naps", "ninho", "aya nakamura"],
  gradur: ["niska", "maes"],
  maes: ["gradur", "niska"],
  sofiane: ["kaaris", "alonzo"],
  alonzo: ["kaaris", "sofiane", "soso maness"],
  "soso maness": ["jul", "alonzo"],
  gambi: ["sch", "franglish"],
};

export function artistLabel(id: string): string {
  return id
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function normalizeArtistId(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Deux artistes sont-ils reliés par un featuring direct connu ? */
export function areLinked(a: string, b: string): boolean {
  const na = normalizeArtistId(a);
  const nb = normalizeArtistId(b);
  return (FEATURING_GRAPH[na] ?? []).includes(nb);
}

/** Plus court chemin entre deux artistes (BFS) — sert à calculer le "par" d'une manche. */
export function shortestPath(start: string, end: string): string[] | null {
  const s = normalizeArtistId(start);
  const e = normalizeArtistId(end);
  if (!(s in FEATURING_GRAPH)) return null;
  const queue: string[][] = [[s]];
  const seen = new Set([s]);
  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    if (last === e) return path;
    for (const next of FEATURING_GRAPH[last] ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

/** Paires d'artistes distants d'au moins `minHops` sauts — pour générer un défi qui a du sel. */
export function pickDailyPair(seed: number): { start: string; end: string; parHops: number } {
  const ids = Object.keys(FEATURING_GRAPH);
  const candidates: { start: string; end: string; parHops: number }[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = 0; j < ids.length; j++) {
      if (i === j) continue;
      const path = shortestPath(ids[i], ids[j]);
      if (path && path.length >= 4 && path.length <= 6) {
        candidates.push({ start: ids[i], end: ids[j], parHops: path.length - 1 });
      }
    }
  }
  if (candidates.length === 0) return { start: "ninho", end: "sch", parHops: 3 };
  return candidates[seed % candidates.length];
}
