import type { MetadataRoute } from "next";

// Écrans sans valeur pour l'index : API, admin, écran TV d'un salon, pages de compte,
// et l'ancienne arcade (jeux retirés de la navigation pour l'instant).
const DISALLOW = ["/api/", "/admin", "/ecran", "/parametres", "/amis", "/auth/", "/jeux", "/jouer?"];

// Les robots des assistants IA sont explicitement les bienvenus (GEO) : ils lisent le site,
// llms.txt et les données structurées pour répondre « c'est quoi DailyRapFrance ».
const AI_BOTS = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot", "Bytespider", "Amazonbot", "meta-externalagent", "DuckAssistBot", "YouBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: "https://dailyrapfrance.best/sitemap.xml",
    host: "https://dailyrapfrance.best",
  };
}
