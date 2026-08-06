import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
 * GET /api/jeux/punchline — renvoie jusqu'à 10 punchlines actives, mélangées.
 * Le contenu vit dans la table `punchlines` (remplie à la main — voir
 * sql/nouveaux-jeux.sql) : le jeu affiche un état "bientôt" tant qu'elle est vide.
 */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("punchlines")
    .select("id,text,artist,decoys")
    .eq("active", true)
    .limit(50);

  if (error) {
    console.error("[jeux/punchline]", error.message);
    return NextResponse.json({ error: "Erreur de chargement." }, { status: 500 });
  }

  // Mélange côté serveur puis coupe à 10 — assez pour une partie, pas tout le stock.
  const shuffled = (data ?? []).sort(() => Math.random() - 0.5).slice(0, 10);
  return NextResponse.json({ rounds: shuffled });
}
