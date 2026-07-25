// Comparaison souple des réponses — tolère fautes de frappe, accents, casse, et le bruit
// habituel des titres Deezer ("feat.", parenthèses, "- Single"...).

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(feat[^)]*\)/g, " ")
    .replace(/feat\.?.*$/g, " ")
    .replace(/-\s*(single|ep)\s*$/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Vrai si `guess` colle raisonnablement à `answer` — sous-chaîne ou distance d'édition tolérante.
export function isCloseMatch(guess: string, answer: string): boolean {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g || !a) return false;
  if (a === g) return true;
  if (a.includes(g) && g.length >= 3) return true;
  if (g.includes(a) && a.length >= 3) return true;
  const tolerance = Math.max(1, Math.floor(a.length * 0.25));
  return levenshtein(g, a) <= tolerance;
}

// Une réponse compte si elle colle à l'artiste OU au titre — convention classique du blind test.
export function checkGuess(guess: string, artistName: string, title: string): boolean {
  return isCloseMatch(guess, artistName) || isCloseMatch(guess, title);
}
