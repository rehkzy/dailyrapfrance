import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/blindtest/score — { theme: string, rounds: number, points: number }
// N'enregistre rien si personne n'est connecté (les scores anonymes ne sont pas persistés).
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

  return NextResponse.json({ saved: true });
}
