import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
 * Coach A&R — pronostics hebdomadaires.
 *
 * GET  : renvoie le top 20 rap actuel + le prono du joueur pour la semaine courante
 *        (s'il existe) + le scoring automatique du prono de la semaine PRÉCÉDENTE si
 *        pas encore fait : chaque morceau pronostiqué encore présent dans le top
 *        actuel = 1 pt (x3 max), enregistré dans blindtest_scores (thème "jeu-pronos")
 *        pour apparaître dans les stats du profil.
 * POST : { picks: [{id,title,artist}] } (exactement 3) — dépose le prono de la semaine.
 */

function isoWeek(date = new Date()): string {
  // Semaine ISO — le prono est hebdomadaire, la période va de lundi à dimanche.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function prevIsoWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return isoWeek(d);
}

type DeezerTrack = { id: number; title: string; artist: { name: string }; album: { cover_medium: string } };

async function fetchChart(): Promise<{ id: string; title: string; artist: string; cover: string }[]> {
  const res = await fetch("https://api.deezer.com/chart/116/tracks?limit=20", { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("deezer chart failed");
  const data = (await res.json()) as { data?: DeezerTrack[] };
  return (data.data ?? []).map((t) => ({
    id: String(t.id),
    title: t.title,
    artist: t.artist.name,
    cover: t.album.cover_medium,
  }));
}

export async function GET() {
  const supabase = await createClient();
  try {
    const chart = await fetchChart();
    const { data: { user } } = await supabase.auth.getUser();

    let myPicks = null;
    let lastResult: { points: number; week: string } | null = null;

    if (user) {
      const week = isoWeek();
      const { data: current } = await supabase
        .from("pronos").select("picks").eq("user_id", user.id).eq("week", week).maybeSingle();
      myPicks = current?.picks ?? null;

      // Scoring de la semaine passée, à la volée — pas de cron nécessaire : le calcul
      // se fait au premier passage du joueur après le changement de semaine.
      const lastWeek = prevIsoWeek();
      const { data: previous } = await supabase
        .from("pronos").select("id,picks,scored,points").eq("user_id", user.id).eq("week", lastWeek).maybeSingle();
      if (previous) {
        if (previous.scored) {
          lastResult = { points: previous.points ?? 0, week: lastWeek };
        } else {
          const chartIds = new Set(chart.map((t) => t.id));
          const picks = (previous.picks as { id: string }[]) ?? [];
          const points = picks.filter((p) => chartIds.has(p.id)).length;
          await supabase.from("pronos").update({ scored: true, points }).eq("id", previous.id);
          if (points > 0) {
            await supabase.from("blindtest_scores").insert({
              user_id: user.id, theme: "jeu-pronos", rounds: 3, points,
            });
          }
          lastResult = { points, week: lastWeek };
        }
      }
    }

    return NextResponse.json({ chart, week: isoWeek(), myPicks, lastResult, signedIn: !!user });
  } catch (e) {
    console.error("[jeux/pronos]", e);
    return NextResponse.json({ error: "Impossible de charger le chart." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi pour pronostiquer." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const picks = Array.isArray(body?.picks) ? body.picks : null;
  if (!picks || picks.length !== 3) {
    return NextResponse.json({ error: "Il faut exactement 3 pronostics." }, { status: 400 });
  }

  const { error } = await supabase.from("pronos").insert({
    user_id: user.id,
    week: isoWeek(),
    picks,
  });
  if (error) {
    return NextResponse.json({ ok: false, reason: "already_submitted" });
  }
  return NextResponse.json({ ok: true });
}
