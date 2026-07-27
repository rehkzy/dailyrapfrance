import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://dailyrapfrance.best";
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/jouer`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/blindtest`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/blindtest/classement`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/a-propos`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
