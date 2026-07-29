/*
 * Mode "gages" — désactivé par défaut, opt-in explicite à la création du salon.
 * Deux intensités, jamais d'alcool en "soft" :
 *  - soft  : mini-défis rap, gestuels, sociaux — adaptés à tous les publics.
 *  - hard  : ajoute des défis plus embarrassants, TOUJOURS sans alcool — DailyRapFrance
 *    ne suggère jamais de consommation d'alcool, ça reste au libre choix des joueurs entre
 *    eux, jamais scripté par le jeu.
 */

export const GAGES_SOFT: string[] = [
  "Improvise 4 bars sur le prochain morceau qui passe.",
  "Chante le refrain du morceau précédent a cappella.",
  "Fais l'intro d'un clip rap au choix, avec la voix.",
  "Donne ton meilleur flow sur \"j'ai perdu mes clés\".",
  "Imite la posture d'un rappeur sur sa pochette d'album pendant 10 secondes.",
  "Cite 3 featurings de l'artiste du thème en cours, sans hésiter.",
  "Fais deviner un titre de rap FR en le mimant, sans un mot.",
  "Raconte ton pire souvenir de soirée en style \"punchline\".",
];

export const GAGES_HARD: string[] = [
  "Envoie un message vocal chantant à quelqu'un du groupe, là maintenant.",
  "Laisse le groupe choisir ta photo de profil pour les 10 prochaines minutes.",
  "Réponds à la prochaine question dans un accent au choix du groupe.",
  "Fais un compliment sincère à chaque joueur, un par un, sans rire.",
  "Le groupe choisit ta prochaine réplique de film à réciter.",
];

export function randomGage(intensity: "soft" | "hard"): string {
  const pool = intensity === "hard" ? [...GAGES_SOFT, ...GAGES_HARD] : GAGES_SOFT;
  return pool[Math.floor(Math.random() * pool.length)];
}
