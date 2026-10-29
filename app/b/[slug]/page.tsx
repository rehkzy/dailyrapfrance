import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { encodeCustomSet, customPlayHref } from "@/lib/customBlindtest";

/*
 * Lien court d'un blind test enregistré : /b/<slug> → /jouer?custom=<code>&b=<slug>.
 * Le jeu reste 100 % porté par l'URL (aucune lecture en base pendant la partie) ; `b` sert
 * seulement au compteur de parties et au classement du blind test.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("custom_blindtests").select("title, description, cover, track_ids").eq("slug", slug).maybeSingle();
  if (!data) return { title: "Blind test introuvable — DailyRapFrance" };
  return {
    title: `${data.title} — Blind test | DailyRapFrance`,
    description: data.description || `Un blind test de ${data.track_ids.length} titres, fait maison. Tu joues ?`,
    openGraph: { title: `${data.title} — Blind test`, description: data.description || `${data.track_ids.length} titres, fait maison sur DailyRapFrance.`, images: [data.cover ? { url: data.cover } : { url: "/og.png", width: 1200, height: 630 }] },
  };
}

export default async function ShortLinkPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("custom_blindtests").select("title, description, track_ids, settings").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const settings = (data.settings ?? {}) as { s?: number; a?: "qcm" | "text" };
  const code = encodeCustomSet({ v: 1, t: data.title, i: data.track_ids.map(Number), d: data.description ?? undefined, s: settings.s, a: settings.a });
  redirect(customPlayHref(code, { b: slug, ...(sp.mode ? { mode: sp.mode } : {}) }));
}
