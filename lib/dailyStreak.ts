/*
 * Série de jours joués ("streak") — suivi CÔTÉ APPAREIL (localStorage), volontairement
 * sans compte requis : la friction d'un Heardle doit être minimale, exiger une connexion
 * juste pour jouer 30 secondes tuerait l'adoption. Contrepartie honnête : la série ne se
 * synchronise pas entre appareils — assumé, et dit clairement dans l'UI plutôt que de
 * laisser croire à un vrai compteur de compte.
 */

const KEY = "drf-daily-streak";

type StreakState = { count: number; lastDate: string | null };

function parisDateString(d = new Date()): string {
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

/** À appeler une fois qu'une partie du jour est terminée (gagnée ou perdue — jouer compte,
 * pas seulement gagner, sinon la série punit l'échec au lieu de récompenser la régularité). */
export function markPlayedToday(): number {
  const today = parisDateString();
  const state = read();
  if (state.lastDate === today) return state.count; // déjà compté aujourd'hui
  const gap = state.lastDate ? daysBetween(state.lastDate, today) : null;
  const nextCount = gap === 1 ? state.count + 1 : 1; // hier → +1, sinon la série repart à 1
  const next: StreakState = { count: nextCount, lastDate: today };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* stockage indisponible (navigation privée…) — la série ne persistera pas, tant pis */
  }
  return nextCount;
}

export function getStreak(): number {
  if (typeof window === "undefined") return 0;
  const state = read();
  const today = parisDateString();
  if (!state.lastDate) return 0;
  const gap = daysBetween(state.lastDate, today);
  // Si plus d'un jour s'est écoulé depuis la dernière partie, la série est déjà rompue —
  // on l'affiche à 0 sans attendre que l'utilisateur rejoue pour le découvrir.
  return gap <= 1 ? state.count : 0;
}
