import type { MetadataRoute } from "next";

/*
 * Sitemap généré automatiquement par Next.js, servi à l'URL /sitemap.xml.
 * Liste les pages statiques principales du site — à compléter si de nouvelles
 * pages publiques sont ajoutées (ex. pages d'articles individuelles, si elles
 * ont des URLs prévisibles, générées ici via une boucle sur la base de données).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://dailyrapfrance.best";
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/a-propos`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/jouer`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/blindtest`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/blindtest/classement`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
  ];
}
