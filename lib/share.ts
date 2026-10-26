/*
 * Partage de résultat "sans spoiler" — le pattern Wordle/Heardle : une grille d'emojis qui
 * raconte la partie (manche par manche) sans jamais citer un titre ou un artiste, pour
 * pouvoir la coller dans le groupe sans gâcher le défi de ceux qui n'ont pas encore joué.
 *
 * Légende : 🟥 tout trouvé (titre + artiste, feat compris)  🟧 trouvé en partie
 *           ⬛ rien trouvé  ⚡ manche parfaite en moins de 5 s
 */

export type RoundOutcome = {
  found: number; // champs trouvés
  total: number; // champs à trouver sur cette manche
  fast?: boolean; // réponse éclair (bonus vitesse)
};

export function roundEmoji(r: RoundOutcome): string {
  if (r.total === 0) return "⬛";
  if (r.found >= r.total) return r.fast ? "⚡" : "🟥";
  if (r.found > 0) return "🟧";
  return "⬛";
}

export function buildGrid(rounds: RoundOutcome[], perLine = 10): string {
  const cells = rounds.map(roundEmoji);
  const lines: string[] = [];
  for (let i = 0; i < cells.length; i += perLine) lines.push(cells.slice(i, i + perLine).join(""));
  return lines.join("\n");
}

export function buildShareText(opts: {
  points: number;
  rounds: RoundOutcome[];
  themeLabel: string;
  url: string;
  daily?: { number: number; streak: number } | null;
  bestStreak?: number;
}): string {
  const perfect = opts.rounds.filter((r) => r.total > 0 && r.found >= r.total).length;
  const head = opts.daily
    ? `Défi DailyRap semaine #${opts.daily.number} 🎤 ${perfect}/${opts.rounds.length}`
    : `Blind Test Rap FR 🎤 ${opts.themeLabel} — ${perfect}/${opts.rounds.length}`;
  const lines = [head, buildGrid(opts.rounds), `${opts.points} pts`];
  if (opts.daily && opts.daily.streak >= 2) lines.push(`🔥 Série : ${opts.daily.streak} jours`);
  if (!opts.daily && opts.bestStreak && opts.bestStreak >= 3) lines.push(`🔥 Combo max : ${opts.bestStreak}`);
  lines.push(opts.url);
  return lines.join("\n");
}

/** Partage natif si possible, sinon copie dans le presse-papiers. Renvoie ce qui a été fait. */
export async function shareOrCopy(data: { title: string; text: string; url?: string }): Promise<"shared" | "copied" | "none"> {
  if (typeof navigator === "undefined") return "none";
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare({ text: data.text }))) {
      await navigator.share(data);
      return "shared";
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "none";
  }
  try {
    await navigator.clipboard.writeText(data.url ? `${data.text}` : data.text);
    return "copied";
  } catch {
    return "none";
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
