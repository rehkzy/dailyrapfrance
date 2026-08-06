import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
 * GET /api/jeux/ghostwriter — renvoie jusqu'à 10 manches actives, mélangées.
 * Chaque manche : des lignes de pastiche générées par IA (jamais de vraies paroles)
 * + l'artiste imité + 3 leurres. Contenu ajouté à la main dans `ghostwriter_rounds`
 * (tu peux générer les pastiches avec Claude et les coller en SQL).
 */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ghostwriter_rounds")
    .select("id,lines,artist,decoys")
    .eq("active", true)
    .limit(50);

  if (error) {
    console.error("[jeux/ghostwriter]", error.message);
    return NextResponse.json({ error: "Erreur de chargement." }, { status: 500 });
  }

  const shuffled = (data ?? []).sort(() => Math.random() - 0.5).slice(0, 10);
  return NextResponse.json({ rounds: shuffled });
}
