/*
 * Série de jours joués ("streak") — suivi CÔTÉ APPAREIL (localStorage), volontairement
 * sans compte requis : la friction d'un Heardle doit être minimale, exiger une connexion
 * juste pour jouer 30 secondes tuerait l'adoption. Contrepartie honnête : la série ne se
 * synchronise pas entre appareils — assumé, et dit clairement dans l'UI plutôt que de
 * laisser croire à un vrai compteur de compte.
 *
 * Ajouts v2 :
 *  - historique des jours joués (calendrier des 14 derniers jours sur l'accueil / résultats)
 *  - "joker de série" : un jour manqué par tranche de 7 jours de série est pardonné en
 *    silence (pattern Duolingo), pour que la série récompense la régularité, pas la perfection
 *  - numéro du défi du jour (#1 = date de lancement) et compte à rebours jusqu'à minuit Paris
 *  - compteur de parties terminées, toutes modes confondus (sert à n'inviter à installer
 *    l'app qu'après la 2e partie, jamais à froid)
 */

const KEY = "drf-daily-streak";
const DAYS_KEY = "drf-played-days";
const GAMES_KEY = "drf-games-played";
const BEST_KEY = "drf-daily-best";

// Jour 1 du défi quotidien — sert à numéroter les défis (#312…) dans les résultats partagés.
const DAILY_EPOCH = "2025-08-01";

type StreakState = { count: number; lastDate: string | null; freezesUsed?: number };

export function parisDateString(d = new Date()): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(d);
}

function read(): StreakState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { count: 0, lastDate: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lastDate: null };
  }
}

function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((db - da) / 86_400_000);
}

function readDays(): string[] {
  try {
    const raw = localStorage.getItem(DAYS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** À appeler une fois qu'une partie du jour est terminée (gagnée ou perdue — jouer compte,
 * pas seulement gagner, sinon la série punit l'échec au lieu de récompenser la régularité).
 * Renvoie la série courante et si un joker de série vient d'être consommé. */
export function markPlayedToday(): { count: number; frozen: boolean; isNew: boolean } {
  const today = parisDateString();
  const state = read();
  const days = readDays();
  if (!days.includes(today)) {
    try {
      localStorage.setItem(DAYS_KEY, JSON.stringify([...days, today].slice(-120)));
    } catch {
      /* ignore */
    }
  }
  if (state.lastDate === today) return { count: state.count, frozen: false, isNew: false };
  const gap = state.lastDate ? daysBetween(state.lastDate, today) : null;
  let frozen = false;
  let nextCount: number;
  if (gap === 1) nextCount = state.count + 1;
  else if (gap === 2 && state.count >= 7) {
    // Un jour manqué, mais une série d'au moins 7 jours : le joker de série encaisse.
    nextCount = state.count + 1;
    frozen = true;
  } else nextCount = 1;
  const next: StreakState = { count: nextCount, lastDate: today, freezesUsed: (state.freezesUsed ?? 0) + (frozen ? 1 : 0) };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* stockage indisponible (navigation privée…) — la série ne persistera pas, tant pis */
  }
  return { count: nextCount, frozen, isNew: true };
}

export function getStreak(): number {
  if (typeof window === "undefined") return 0;
  const state = read();
  const today = parisDateString();
  if (!state.lastDate) return 0;
  const gap = daysBetween(state.lastDate, today);
  // Un jour de retard reste rattrapable aujourd'hui (et deux si la série est longue, grâce
  // au joker) — sinon la série est déjà rompue, on l'affiche à 0 sans attendre.
  if (gap <= 1) return state.count;
  if (gap === 2 && state.count >= 7) return state.count;
  return 0;
}

/** La série est-elle "en danger" : pas encore jouée aujourd'hui alors qu'elle est active ? */
export function streakAtRisk(): boolean {
  if (typeof window === "undefined") return false;
  const state = read();
  return getStreak() > 0 && state.lastDate !== parisDateString();
}

export function playedToday(): boolean {
  if (typeof window === "undefined") return false;
  return read().lastDate === parisDateString();
}

/** Les N derniers jours (du plus ancien au plus récent) avec, pour chacun, joué ou non. */
export function recentDays(n = 14): { date: string; played: boolean; today: boolean }[] {
  const days = new Set<string>(typeof window === "undefined" ? [] : readDays());
  const today = parisDateString();
  const out: { date: string; played: boolean; today: boolean }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const date = parisDateString(d);
    out.push({ date, played: days.has(date), today: date === today });
  }
  return out;
}

export function dailyNumber(d = new Date()): number {
  return daysBetween(DAILY_EPOCH, parisDateString(d)) + 1;
}

/* ---------------------------------------------------------------------------------------
   Défi de la SEMAINE — un thème imposé du lundi 00:00 au dimanche 23:59 (heure de Paris).
   Un jour c'était trop court pour que les potes aient le temps de s'affronter dessus ; la
   semaine laisse la place à plusieurs tentatives et à un vrai classement par défi.
   --------------------------------------------------------------------------------------- */

// Lundi de lancement du défi hebdomadaire — numérote les défis (#1, #2…).
const WEEK_EPOCH = "2026-10-26";

/** Date (AAAA-MM-JJ, Paris) du lundi de la semaine courante — c'est la clé du défi. */
export function weekKey(d = new Date()): string {
  const today = parisDateString(d);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = dimanche
  const back = (dow + 6) % 7; // jours écoulés depuis lundi
  const monday = new Date(new Date(`${today}T00:00:00Z`).getTime() - back * 86_400_000);
  return monday.toISOString().slice(0, 10);
}

export function weeklyNumber(d = new Date()): number {
  return Math.floor(daysBetween(WEEK_EPOCH, weekKey(d)) / 7) + 1;
}

/** Numéro du défi pour une clé donnée (page de classement d'une semaine passée). */
export function weeklyNumberFor(key: string): number {
  return Math.floor(daysBetween(WEEK_EPOCH, key) / 7) + 1;
}

/** Millisecondes avant le prochain défi (lundi 00:00, heure de Paris). */
export function msUntilNextWeekly(now = new Date()): number {
  const today = parisDateString(now);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const daysLeft = (7 - ((dow + 6) % 7) - 1); // jours entiers restant après aujourd'hui
  return msUntilNextDaily(now) + daysLeft * 86_400_000;
}

/** "3 j 04 h" au-delà d'un jour, sinon HH:MM:SS. */
export function formatCountdownLong(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(s / 86_400);
  if (days >= 1) {
    const h = Math.floor((s % 86_400) / 3600);
    return `${days} j ${String(h).padStart(2, "0")} h`;
  }
  return formatCountdown(ms);
}

/** A-t-on déjà joué (sur cet appareil) depuis le lundi de cette semaine ? */
export function playedThisWeek(): boolean {
  if (typeof window === "undefined") return false;
  const monday = weekKey();
  return readDays().some((d) => d >= monday);
}

/** Millisecondes avant le prochain défi (minuit, heure de Paris). */
export function msUntilNextDaily(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const elapsed = (get("hour") % 24) * 3600 + get("minute") * 60 + get("second");
  return (86_400 - elapsed) * 1000;
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function bumpGamesPlayed(): number {
  try {
    const n = Number(localStorage.getItem(GAMES_KEY) ?? 0) + 1;
    localStorage.setItem(GAMES_KEY, String(n));
    return n;
  } catch {
    return 0;
  }
}

export function getGamesPlayed(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(GAMES_KEY) ?? 0);
  } catch {
    return 0;
  }
}

/** Meilleur score du défi de la semaine sur cet appareil (pour "record perso"). */
export function recordDailyScore(points: number): { best: number; isRecord: boolean } {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const prev = raw ? (JSON.parse(raw) as { date: string; points: number }) : null;
    const week = weekKey();
    if (prev && prev.date === week && prev.points >= points) return { best: prev.points, isRecord: false };
    localStorage.setItem(BEST_KEY, JSON.stringify({ date: week, points }));
    return { best: points, isRecord: !!prev && prev.date === week };
  } catch {
    return { best: points, isRecord: false };
  }
}
