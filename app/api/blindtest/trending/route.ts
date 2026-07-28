import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600; // recalculé au plus une fois par heure

// GET /api/blindtest/trending → { themes: string[] }
// Les 3 thèmes les plus joués sur les 7 derniers jours, d'après les scores réellement
// enregistrés. Sert à afficher un badge "tendance" honnête sur les cartes de thème :
// le badge suit le comportement réel des joueurs, pas une liste décidée à la main.
export async function GET() {
  try {
    const supabase = await createClient();
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("blindtest_scores")
      .select("theme")
      .gte("created_at", since)
      .limit(2000);

    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      counts.set(row.theme, (counts.get(row.theme) ?? 0) + 1);
    }
    const themes = [...counts.entries()]
      .filter(([, n]) => n >= 3) // pas de "tendance" fabriquée sur 1-2 parties
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);

    return NextResponse.json({ themes });
  } catch {
    return NextResponse.json({ themes: [] });
  }
}
