// QCM par étapes — le mode "Facile" ne montre plus « Titre — Artiste » d'un bloc (trop
// facile : une seule reconnaissance donnait tous les points). On fait deviner dans l'ordre :
// d'abord l'ARTISTE / le groupe, puis le TITRE, puis le FEAT s'il y en a un — chaque étape
// avec sa bonne réponse et deux intrus pris dans le pool de la partie.

export type QcmField = "title" | "artist" | "feat";

const STAGE_ORDER: QcmField[] = ["artist", "title", "feat"];

export function qcmStageOrder(applicable: QcmField[]): QcmField[] {
  return STAGE_ORDER.filter((f) => applicable.includes(f));
}

export const QCM_STAGE_PROMPTS: Record<QcmField, string> = {
  artist: "Qui chante ?",
  title: "Quel est le titre ?",
  feat: "Qui est en feat ?",
};

type StageTrack = { id: string; title: string; artistName: string; feats: string[] };

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** La bonne réponse (texte affiché) pour une étape donnée. */
export function qcmCorrectLabel(field: QcmField, track: StageTrack): string {
  if (field === "title") return track.title;
  if (field === "artist") return track.artistName;
  return track.feats[0] ?? "";
}

/** Un label choisi correspond-il à la bonne réponse de l'étape ? (feat : n'importe lequel des feats) */
export function qcmIsCorrect(field: QcmField, track: StageTrack, label: string): boolean {
  if (field === "feat") return track.feats.some((f) => f.toLowerCase() === label.toLowerCase());
  return qcmCorrectLabel(field, track).toLowerCase() === label.toLowerCase();
}

/**
 * Les 3 options d'une étape : la bonne réponse + 2 intrus tirés du pool de la partie,
 * dédupliqués (insensible à la casse) et jamais égaux à une bonne réponse possible.
 */
export function qcmStageOptions(field: QcmField, track: StageTrack, pool: StageTrack[]): string[] {
  const correct = qcmCorrectLabel(field, track);
  const forbidden = new Set<string>(
    field === "feat"
      ? [...track.feats, track.artistName].map((s) => s.toLowerCase())
      : [correct.toLowerCase()]
  );

  let candidates: string[];
  if (field === "title") {
    candidates = pool.map((t) => t.title);
  } else if (field === "artist") {
    candidates = pool.map((t) => t.artistName);
  } else {
    // Feat : d'abord les feats des autres morceaux, complétés par des noms d'artistes du
    // pool si le thème en compte trop peu — il faut toujours 3 options crédibles.
    candidates = [...pool.flatMap((t) => t.feats), ...pool.map((t) => t.artistName)];
  }

  const distractors: string[] = [];
  const seen = new Set<string>();
  for (const c of shuffle(candidates)) {
    if (distractors.length >= 2) break;
    const key = c.trim().toLowerCase();
    if (!key || seen.has(key) || forbidden.has(key)) continue;
    seen.add(key);
    distractors.push(c.trim());
  }

  return shuffle([correct, ...distractors]);
}
