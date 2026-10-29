import { THEME_OPTIONS } from "@/lib/themes";

/*
 * Succès et badges — calculés à la volée depuis les scores (aucune table à peupler).
 *
 *  - Succès « jeu » : parties jouées, records, sans-faute, défi de la semaine, création,
 *    parrainage, amis.
 *  - Badges « fan » : par artiste (thèmes artist-*), trois niveaux selon le nombre de
 *    parties ; et la couronne « Meilleur fan » pour le meilleur score du site sur ce thème.
 *
 * Chaque succès a une progression (pour afficher « encore 3 parties ») et un emoji : un
 * profil doit donner envie de jouer une partie de plus, pas lister des chiffres.
 */
export type ScoreRow = { theme: string; rounds: number; points: number; created_at: string };

export type Badge = {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  unlocked: boolean;
  progress: number; // 0..1
  hint?: string; // ce qu'il reste à faire
  kind: "game" | "fan";
  level?: 1 | 2 | 3;
};

export type BadgeInputs = {
  scores: ScoreRow[];
  customsCount: number;
  customsPublic: number;
  referrals: number;
  friends: number;
  /** meilleur score du site par thème artiste (pour « Meilleur fan ») */
  siteBestByTheme?: Record<string, number>;
};

const FAN_LEVELS: { games: number; label: string }[] = [
  { games: 3, label: "Fan" },
  { games: 10, label: "Grand fan" },
  { games: 25, label: "Ultra" },
];

function artistName(themeId: string): string {
  const t = THEME_OPTIONS.find((x) => x.id === themeId);
  return (t?.label ?? themeId).replace(/^Blind Test /i, "");
}

export function computeBadges(inp: BadgeInputs): { game: Badge[]; fans: Badge[]; bestFanOf: string[] } {
  const scores = inp.scores.filter((s) => !s.theme.startsWith("jeu-"));
  const n = scores.length;
  const best = scores.reduce((m, s) => Math.max(m, s.points), 0);
  const perfect = scores.filter((s) => s.rounds > 0 && s.points >= s.rounds * 2).length; // ≈ titre + artiste à chaque manche
  const defis = new Set(scores.filter((s) => s.theme.startsWith("defi:")).map((s) => s.theme)).size;
  const themesPlayed = new Set(scores.map((s) => (s.theme.includes(":") ? s.theme.split(":")[1] : s.theme))).size;
  const survival = scores.filter((s) => s.theme.startsWith("survival:")).length;
  const sprint = scores.filter((s) => s.theme.startsWith("sprint:")).length;

  const step = (value: number, target: number, id: string, label: string, emoji: string, desc: string, unit = "partie"): Badge => ({
    id,
    label,
    emoji,
    desc,
    kind: "game",
    unlocked: value >= target,
    progress: Math.min(1, value / target),
    hint: value >= target ? undefined : `Encore ${target - value} ${unit}${target - value > 1 ? "s" : ""}`,
  });

  const game: Badge[] = [
    step(n, 1, "first", "Premier son", "🎧", "Une première partie connectée."),
    step(n, 10, "ten", "Habitué", "🔟", "10 parties au compteur."),
    step(n, 50, "fifty", "Accro", "🔥", "50 parties. Le métro n'a plus de secret."),
    step(n, 200, "two-hundred", "Légende", "👑", "200 parties. Respect."),
    step(best, 20, "best20", "Gros score", "💯", "Au moins 20 points sur une partie.", "point"),
    step(best, 35, "best35", "Machine", "🤖", "35 points ou plus sur une partie.", "point"),
    step(perfect, 1, "perfect", "Sans faute", "✨", "Titre et artiste trouvés à toutes les manches."),
    step(defis, 1, "defi1", "Au rendez-vous", "📅", "A joué un défi de la semaine.", "défi"),
    step(defis, 4, "defi4", "Fidèle", "🗓️", "4 défis de la semaine différents.", "défi"),
    step(themesPlayed, 10, "explorer", "Explorateur", "🧭", "10 thèmes différents joués.", "thème"),
    step(survival, 1, "survivor", "Survivant", "💀", "A tenté le mode Survie."),
    step(sprint, 1, "sprinter", "Sprinteur", "⚡", "A tenté le mode Sprint."),
    step(inp.customsCount, 1, "creator", "Créateur", "🎛️", "A créé son propre blind test.", "blind test"),
    step(inp.customsPublic, 1, "publisher", "Programmateur", "📣", "A rendu un blind test public.", "blind test public"),
    step(inp.referrals, 1, "referrer", "Parrain", "🎟️", "Un ami inscrit avec ton lien.", "filleul"),
    step(inp.referrals, 5, "referrer5", "Rabatteur", "🚀", "5 amis inscrits avec ton lien.", "filleul"),
    step(inp.friends, 1, "friend", "Pas seul", "🤝", "Un premier ami ajouté.", "ami"),
  ];

  // Badges fan par artiste
  const byArtist = new Map<string, { games: number; best: number }>();
  for (const s of scores) {
    const base = s.theme.includes(":") ? s.theme.split(":")[1] : s.theme;
    if (!base.startsWith("artist-")) continue;
    const cur = byArtist.get(base) ?? { games: 0, best: 0 };
    cur.games += 1;
    cur.best = Math.max(cur.best, s.points);
    byArtist.set(base, cur);
  }
  const fans: Badge[] = [];
  const bestFanOf: string[] = [];
  for (const [theme, v] of byArtist) {
    const name = artistName(theme);
    const lvlIndex = FAN_LEVELS.filter((l) => v.games >= l.games).length; // 0..3
    const next = FAN_LEVELS[Math.min(lvlIndex, FAN_LEVELS.length - 1)];
    const level = (Math.max(1, lvlIndex) as 1 | 2 | 3);
    const siteBest = inp.siteBestByTheme?.[theme];
    const isBest = v.games >= 3 && siteBest !== undefined && v.best >= siteBest && v.best > 0;
    if (isBest) bestFanOf.push(name);
    fans.push({
      id: `fan:${theme}`,
      label: isBest ? `Meilleur fan de ${name}` : lvlIndex > 0 ? `${FAN_LEVELS[lvlIndex - 1].label} de ${name}` : `Fan de ${name} ?`,
      emoji: isBest ? "👑" : lvlIndex >= 3 ? "💎" : lvlIndex === 2 ? "🔥" : "🎤",
      desc: isBest ? `Meilleur score du site sur le thème ${name} (${v.best} pts).` : `${v.games} partie${v.games > 1 ? "s" : ""} sur ${name} · record ${v.best} pts.`,
      kind: "fan",
      level,
      unlocked: lvlIndex > 0,
      progress: lvlIndex >= 3 ? 1 : Math.min(1, v.games / next.games),
      hint: lvlIndex >= 3 ? undefined : `Encore ${next.games - v.games} partie${next.games - v.games > 1 ? "s" : ""} pour « ${next.label} »`,
    });
  }
  fans.sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0) || (b.level ?? 0) - (a.level ?? 0) || b.progress - a.progress);
  return { game, fans, bestFanOf };
}

/* Bannières prêtes à l'emploi (choix dans Mon compte) */
export const BANNER_PRESETS: { id: string; label: string; css: string }[] = [
  { id: "rouge", label: "Rouge Daily", css: "linear-gradient(135deg, #3a0a0f 0%, #8a0010 55%, #f0001c 120%)" },
  { id: "nuit", label: "Nuit", css: "linear-gradient(135deg, #0b0507 0%, #2a0608 60%, #5c000b 130%)" },
  { id: "feu", label: "Feu", css: "linear-gradient(135deg, #780101 0%, #f0001c 50%, #ff8a3b 130%)" },
  { id: "sable", label: "Sable", css: "linear-gradient(135deg, #2b1f20 0%, #6b4a4a 60%, #f5e8e8 160%)" },
  { id: "neon", label: "Néon", css: "linear-gradient(135deg, #120305 0%, #ff3b4e 70%, #ffd166 160%)" },
];
export function bannerStyle(banner: string | null | undefined): { background: string } {
  if (!banner) return { background: BANNER_PRESETS[0].css };
  const preset = BANNER_PRESETS.find((b) => b.id === banner);
  if (preset) return { background: preset.css };
  if (/^https?:\/\//.test(banner)) return { background: `url(${banner}) center/cover` };
  return { background: BANNER_PRESETS[0].css };
}
