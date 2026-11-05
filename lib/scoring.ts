// Bonus de rapidité — récompense les réflexes, partout avec le même barème lisible :
// réponse dans les 5 premières secondes de l'extrait → +2 pts, dans les 10 premières → +1,
// au-delà → 0. Appliqué PAR CHAMP trouvé (titre, artiste, feat) au moment où il est trouvé,
// en solo, local et salon en ligne.
export const SPEED_FAST_SECONDS = 5;
export const SPEED_OK_SECONDS = 10;

export function speedBonus(elapsedSeconds: number): number {
  if (elapsedSeconds <= SPEED_FAST_SECONDS) return 2;
  if (elapsedSeconds <= SPEED_OK_SECONDS) return 1;
  return 0;
}

// Combo (solo) : sons parfaits d'affilée. 3 → +2, 5 → +3, puis +3 tous les deux (7, 9, 11…).
// Reste sous le plafond anti-triche de la route score (8 pts/manche en moyenne).
export function comboBonus(streak: number): number {
  if (streak === 3) return 2;
  if (streak >= 5 && (streak - 5) % 2 === 0) return 3;
  return 0;
}
