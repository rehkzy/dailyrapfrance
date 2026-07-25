// Badge de certification — Or / Platine / Diamant, avec multiplicateur (Double, Triple...).
// Le niveau colore le badge ; le diamant reprend le rouge de marque (le palier le plus
// haut mérite la couleur signature du site plutôt qu'un bleu générique).

type Level = "OR" | "PLATINE" | "DIAMANT";

const LEVEL_STYLES: Record<Level, { label: string; className: string }> = {
  OR: {
    label: "Or",
    className: "border-amber-400/40 text-amber-300 bg-amber-400/10",
  },
  PLATINE: {
    label: "Platine",
    className: "border-slate-300/40 text-slate-200 bg-slate-300/10",
  },
  DIAMANT: {
    label: "Diamant",
    className: "border-gold/50 text-gold bg-gold/10",
  },
};

const MULTIPLIER_PREFIX: Record<number, string> = {
  1: "",
  2: "Double ",
  3: "Triple ",
  4: "Quadruple ",
};

export default function CertBadge({
  level,
  multiplier = 1,
  className = "",
}: {
  level: Level | string;
  multiplier?: number;
  className?: string;
}) {
  const style = LEVEL_STYLES[level as Level] ?? LEVEL_STYLES.OR;
  const prefix = MULTIPLIER_PREFIX[multiplier] ?? `${multiplier}× `;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium font-mono uppercase tracking-wide ${style.className} ${className}`}
    >
      {prefix}
      {style.label}
    </span>
  );
}
