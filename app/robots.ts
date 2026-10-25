import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Écrans sans valeur pour l'index : API, admin, écran TV d'un salon, pages de compte,
        // et l'ancienne arcade (jeux retirés de la navigation pour l'instant).
        disallow: ["/api/", "/admin", "/ecran", "/parametres", "/amis", "/auth/", "/jeux", "/jouer?"],
      },
    ],
    sitemap: "https://dailyrapfrance.best/sitemap.xml",
    host: "https://dailyrapfrance.best",
  };
}
