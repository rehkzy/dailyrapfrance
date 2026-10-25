import type { MetadataRoute } from "next";
import { MODE_LANDINGS, THEME_LANDINGS, SITE } from "@/lib/seo";

/*
 * Sitemap — uniquement des URL canoniques : l'accueil, la page du jeu, le classement,
 * les 4 pages "façon de jouer" et une page par thème (générées statiquement).
 * /jouer est volontairement absent : son canonical pointe vers /blindtest.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/blindtest`, lastModified: now, changeFrequency: "daily", priority: 1 },
        ...MODE_LANDINGS.map((l) => ({ url: `${SITE}/blindtest/${l.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...THEME_LANDINGS.map((l) => ({ url: `${SITE}/blindtest/${l.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE}/blindtest/classement`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE}/a-propos`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
