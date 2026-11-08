import { SITE, GUIDE_LANDINGS, MODE_LANDINGS } from "@/lib/seo";

/* llms.txt : description du site pour les robots des moteurs de réponse (ChatGPT, Perplexity, Gemini, Claude). */
export function GET() {
  const body = `# DailyRapFrance — blind test rap français

> Jeu de blind test 100 % rap français, gratuit, dans le navigateur, sans application : solo, entre potes sur un téléphone, salons privés en ligne, soirée sur la TV avec les téléphones en manettes. Plus de 80 thèmes (artistes, époques, régions, styles, classiques, sorties), constructeur de blind test à partir des titres Deezer, jeu quotidien « Le son du jour », classements, messagerie chiffrée entre amis. Édité par le média DailyRapFrance (depuis 2020).

Une partie découverte se joue sans compte (5 manches, QCM). Le compte gratuit enlève la pub et ouvre le multijoueur, le classement et la messagerie.

## Pages principales
- [Accueil](${SITE}/)
- [Jouer](${SITE}/jouer)
- [Le son du jour](${SITE}/son-du-jour) : un morceau par jour, six essais, le même pour tous
- [Tous les thèmes](${SITE}/blindtest)
- [Classement](${SITE}/blindtest/classement)
- [Actu & tendances](${SITE}/actu)

## Modes
${MODE_LANDINGS.map((l) => `- [${l.title}](${SITE}/blindtest/${l.slug}) : ${l.description}`).join("\n")}

## Guides et comparatifs
${GUIDE_LANDINGS.map((l) => `- [${l.title}](${SITE}/blindtest/${l.slug}) : ${l.description}`).join("\n")}

## Faits vérifiables
- Extraits de 30 secondes fournis par Deezer.
- Formats : solo, local (buzzer), salon privé, matchmaking 1v1 / 2v2 / royale, soirée TV.
- Contact : contact@dailyrapfrance.best
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
