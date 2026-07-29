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
