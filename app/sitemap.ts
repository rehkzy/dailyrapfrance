import type { MetadataRoute } from "next";
import { MODE_LANDINGS, THEME_LANDINGS, SITE } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

/*
 * Sitemap — toutes les URL canoniques : accueil, hub blind test, les 4 façons de jouer, une
 * page par thème (80+), le média (/actu et ses rubriques), le constructeur, la communauté,
 * et chaque blind test public créé par un joueur (/b/<slug>), plus les profils publics.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/blindtest`, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...MODE_LANDINGS.map((l) => ({ url: `${SITE}/blindtest/${l.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...THEME_LANDINGS.map((l) => ({ url: `${SITE}/blindtest/${l.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${SITE}/blindtest/creer`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/creer`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/actu`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE}/actu?onglet=sorties`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/actu?onglet=actu`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE}/actu?onglet=dailyrap`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/blindtests`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/blindtest/classement`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE}/blindtest/defi`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/parrainage`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/a-propos`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
  try {
    const supabase = await createClient();
    const [{ data: customs }, { data: profiles }] = await Promise.all([
      supabase.from("custom_blindtests").select("slug, updated_at, created_at").eq("is_public", true).order("plays", { ascending: false }).limit(2000),
      supabase.from("profiles").select("username, created_at").not("username", "is", null).limit(2000),
    ]);
    for (const c of customs ?? []) base.push({ url: `${SITE}/b/${c.slug}`, lastModified: new Date(c.updated_at ?? c.created_at), changeFrequency: "weekly", priority: 0.6 });
    for (const p of profiles ?? []) if (p.username) base.push({ url: `${SITE}/profil/${p.username}`, lastModified: now, changeFrequency: "weekly", priority: 0.3 });
  } catch {}
  return base;
}
