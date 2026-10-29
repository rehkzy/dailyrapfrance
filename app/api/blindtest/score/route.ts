import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { THEME_OPTIONS } from "@/lib/themes";
import { adminClient } from "@/lib/adminAuth";

const MAX_ROUNDS = 50;
const MAX_POINTS_PER_ROUND = 8; // titre 1 + artiste 1 + feat 2 + bonus de rapidité, large
const MIN_SECONDS_BETWEEN_SCORES = 15;
const KNOWN = new Set(THEME_OPTIONS.map((t) => t.id));
function themeOk(theme: string): boolean {
  if (theme.length > 60 || !/^[a-z0-9:_-]+$/i.test(theme)) return false;
  if (theme === "custom" || theme === "random" || theme.startsWith("jeu-")) return true;
  if (/^defi:\d{4}-\d{2}-\d{2}$/.test(theme)) return true;
  const base = theme.includes(":") ? theme.split(":")[1] : theme;
  const prefix = theme.includes(":") ? theme.split(":")[0] : null;
  if (prefix && !["survival", "sprint"].includes(prefix)) return false;
  return KNOWN.has(base);
}

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
  // Anti-triche : le score vient du client, on borne donc tout à ce qui est atteignable
  // (manches, points par manche), on refuse les thèmes inconnus et on espace les envois.
  if (!themeOk(theme)) return NextResponse.json({ saved: false, reason: "bad_theme" }, { status: 400 });
  const rounds = Number.isFinite(body?.rounds) ? Math.min(MAX_ROUNDS, Math.max(0, Math.round(body.rounds))) : 0;
  const points = Number.isFinite(body?.points) ? Math.min(rounds * MAX_POINTS_PER_ROUND, Math.max(0, Math.round(body.points))) : 0;
  if (rounds === 0) return NextResponse.json({ saved: false, reason: "no_rounds" }, { status: 400 });
  const { data: last } = await supabase.from("blindtest_scores").select("created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < MIN_SECONDS_BETWEEN_SCORES * 1000) {
    return NextResponse.json({ saved: false, reason: "too_fast" }, { status: 429 });
  }

  // Insertion avec la clé service : la policy d'insertion côté client est retirée
  // (migration-securite.sql), un score ne peut donc entrer que par cette route, bornée.
  const { error } = await adminClient().from("blindtest_scores").insert({
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
