import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/blindtest/score — { theme: string, rounds: number, points: number }
// N'enregistre rien si personne n'est connecté (les scores anonymes ne sont pas persistés).
//
// Correctif audit : calcule maintenant un "top X %" sur le thème joué, pour afficher
// "Tu fais partie du top X% sur ce thème" côté client (demande UX : voir où on se situe,
// pas juste "score enregistré"). Calculé PAR THÈME plutôt que toutes parties confondues —
// mélanger un thème "Top 50" (facile, pool large) avec un thème mono-artiste (pool plus
// restreint, souvent plus dur) donnerait un percentile qui ne veut rien dire.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ saved: false, reason: "not_authenticated" }, { status: 200 });
  }

  const body = await req.json().catch(() => null);
  const theme = typeof body?.theme === "string" ? body.theme : "mix";
  const rounds = Number.isFinite(body?.rounds) ? Math.max(0, Math.round(body.rounds)) : 0;
  const points = Number.isFinite(body?.points) ? Math.max(0, Math.round(body.points)) : 0;

  const { error } = await supabase.from("blindtest_scores").insert({
    user_id: user.id,
    theme,
    rounds,
    points,
  });

  if (error) {
    console.error("[blindtest/score] erreur —", error.message);
    return NextResponse.json({ saved: false, reason: "db_error" }, { status: 200 });
  }

  // Percentile — "top X%" = (nombre de scores strictement meilleurs / nombre total de
  // scores sur ce thème) arrondi à l'entier supérieur, jamais 0 (même le meilleur score
  // affiche "top 1%", pas "top 0%" qui semblerait bugué).
  let topPercent: number | null = null;
  try {
    const { count: totalCount } = await supabase
      .from("blindtest_scores")
      .select("*", { count: "exact", head: true })
      .eq("theme", theme);

    if (totalCount && totalCount > 0) {
      const { count: betterCount } = await supabase
        .from("blindtest_scores")
        .select("*", { count: "exact", head: true })
        .eq("theme", theme)
        .gt("points", points);

      topPercent = Math.max(1, Math.ceil(((betterCount ?? 0) / totalCount) * 100));
    }
  } catch (e) {
    console.error("[blindtest/score] erreur calcul percentile —", e);
    // topPercent reste null — le client se contente d'afficher "score enregistré"
  }

  return NextResponse.json({ saved: true, topPercent });
}
