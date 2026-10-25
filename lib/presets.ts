/*
 * Configurations de partie réutilisables ("Mes soirées").
 *
 * Deux usages, une seule représentation :
 *  1. Un preset sauvegardé sur l'appareil (localStorage) — on relance la même soirée en un
 *     tap, sans refaire le réglage des pseudos, du thème, du nombre de manches.
 *  2. Un lien profond /jouer?… qui transporte la configuration complète — pour l'envoyer
 *     dans le groupe WhatsApp de la soirée, le mettre en favori, ou "défier" quelqu'un sur
 *     exactement la même partie.
 *
 * Pas de compte requis : la friction tuerait l'usage "je prépare ma soirée de samedi".
 */

export type GameMode = "solo" | "local" | "online" | "party";
export type AnswerMode = "qcm" | "text";
// Variantes de règles — mêmes extraits, boucle différente :
//   classic  : N manches, chrono par manche, jokers.
//   survival : un extrait entièrement raté met fin à la partie ; le score, c'est la distance.
//   sprint   : 20 extraits de 8 s, pas de joker, révélation éclair — que de l'instinct.
export type Variant = "classic" | "survival" | "sprint";
export const VARIANTS: { id: Variant; label: string; desc: string }[] = [
  { id: "classic", label: "Classique", desc: "10 à 30 manches, chrono réglable, jokers." },
  { id: "survival", label: "Survie", desc: "Un son raté et c'est fini. Jusqu'où tu vas ?" },
  { id: "sprint", label: "Sprint", desc: "20 extraits, 8 secondes chacun, sans joker." },
];
// Source des manches : extrait audio Deezer (30 s) ou clip YouTube (image + son, intro évitée).
export type Media = "audio" | "clip";
export const SPRINT_SECONDS = 8;
export const SPRINT_ROUNDS = 20;
export const SURVIVAL_POOL = 30;

export type GameConfig = {
  mode: GameMode;
  theme: string;
  rounds: number;
  seconds: number;
  answerMode: AnswerMode;
  jokers: number;
  players: string[];
  variant: Variant;
  media?: Media;
};

export type Preset = GameConfig & {
  id: string;
  name: string;
  createdAt: number;
  lastPlayedAt: number | null;
  plays: number;
};

const KEY = "drf-presets-v1";
const MAX_PRESETS = 12;

export const ROUND_OPTIONS = [10, 15, 20, 30] as const;
export const SECONDS_OPTIONS = [15, 20, 25, 35, 45] as const;

export const DEFAULT_CONFIG: GameConfig = {
  mode: "solo",
  theme: "mix",
  rounds: 10,
  seconds: 25,
  answerMode: "qcm",
  jokers: 1,
  players: [],
  variant: "classic",
};

function read(): Preset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: Preset[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_PRESETS)));
    window.dispatchEvent(new Event("drf-presets-change"));
  } catch {
    /* stockage indisponible — le preset ne survivra pas à la session, tant pis */
  }
}

export function listPresets(): Preset[] {
  return read().sort((a, b) => (b.lastPlayedAt ?? b.createdAt) - (a.lastPlayedAt ?? a.createdAt));
}

export function savePreset(name: string, config: GameConfig): Preset {
  const list = read();
  const preset: Preset = {
    ...config,
    id: Math.random().toString(36).slice(2, 10),
    name: name.trim() || "Ma soirée",
    createdAt: Date.now(),
    lastPlayedAt: null,
    plays: 0,
  };
  write([preset, ...list]);
  return preset;
}

export function touchPreset(id: string) {
  const list = read().map((p) => (p.id === id ? { ...p, lastPlayedAt: Date.now(), plays: p.plays + 1 } : p));
  write(list);
}

export function renamePreset(id: string, name: string) {
  write(read().map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)));
}

export function deletePreset(id: string) {
  write(read().filter((p) => p.id !== id));
}

/** Nom lisible par défaut, dérivé de la config ("Entre potes · Rap 93 · 15 manches"). */
export function describeConfig(c: GameConfig, themeLabel: string) {
  const modeLabel = { solo: "Solo", local: "Entre potes", online: "Salon en ligne", party: "Soirée TV" }[c.mode];
  const parts = [modeLabel, themeLabel];
  if (c.media === "clip") parts.push("Clips");
  if (c.variant && c.variant !== "classic") parts.push(VARIANTS.find((v) => v.id === c.variant)?.label ?? c.variant);
  else parts.push(`${c.rounds} manches`);
  if (c.mode === "local" && c.players.length) parts.push(`${c.players.length} joueurs`);
  return parts.join(" · ");
}

/** Encode la config en paramètres d'URL /jouer — compacts, lisibles, stables. */
export function configToSearch(c: GameConfig, extra?: Record<string, string>): string {
  const p = new URLSearchParams();
  p.set("mode", c.mode);
  p.set("theme", c.theme);
  if (c.rounds !== DEFAULT_CONFIG.rounds) p.set("rounds", String(c.rounds));
  if (c.seconds !== DEFAULT_CONFIG.seconds) p.set("secs", String(c.seconds));
  if (c.answerMode !== DEFAULT_CONFIG.answerMode) p.set("answer", c.answerMode);
  if (c.jokers !== DEFAULT_CONFIG.jokers) p.set("jokers", String(c.jokers));
  if (c.mode === "local" && c.players.length) p.set("players", c.players.join("|"));
  if (c.variant && c.variant !== "classic") p.set("v", c.variant);
  if (c.media === "clip") p.set("media", "clip");
  if (extra) for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return p.toString();
}

export function configToUrl(c: GameConfig, extra?: Record<string, string>, origin = "https://dailyrapfrance.best") {
  return `${origin}/jouer?${configToSearch(c, extra)}`;
}

/** Lit une config depuis les paramètres d'URL ; les champs absents gardent la valeur par défaut. */
export function parseConfig(params: URLSearchParams, validTheme: (id: string) => boolean): Partial<GameConfig> & { hasAny: boolean } {
  const out: Partial<GameConfig> = {};
  const mode = params.get("mode");
  if (mode === "solo" || mode === "local" || mode === "online" || mode === "party") out.mode = mode;
  const theme = params.get("theme");
  if (theme && (theme === "random" || validTheme(theme))) out.theme = theme;
  const v = params.get("v");
  if (v === "classic" || v === "survival" || v === "sprint") out.variant = v;
  const media = params.get("media");
  if (media === "clip" || media === "audio") out.media = media;
  const rounds = Number(params.get("rounds"));
  if ((ROUND_OPTIONS as readonly number[]).includes(rounds)) out.rounds = rounds;
  const secs = Number(params.get("secs"));
  if ((SECONDS_OPTIONS as readonly number[]).includes(secs)) out.seconds = secs;
  const answer = params.get("answer");
  if (answer === "qcm" || answer === "text") out.answerMode = answer;
  const jokersRaw = params.get("jokers");
  const jokers = jokersRaw === null ? NaN : Number(jokersRaw);
  if ([0, 1, 2].includes(jokers)) out.jokers = jokers;
  const players = params.get("players");
  if (players) {
    out.players = players
      .split("|")
      .map((s) => s.trim().slice(0, 24))
      .filter(Boolean)
      .slice(0, 8);
  }
  return { ...out, hasAny: Object.keys(out).length > 0 };
}
