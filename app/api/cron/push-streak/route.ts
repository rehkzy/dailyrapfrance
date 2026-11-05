import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/adminAuth";
import { sendPushToUsers, pushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * GET /api/cron/push-streak — chaque soir (heure de Paris) : les joueurs qui ont joué hier
 * mais pas encore aujourd'hui, et qui ont une notification active, reçoivent « ta série
 * s'arrête ce soir ». Jours calculés en heure de Paris. Jamais à ceux qui ont déjà joué.
 */
function parisDay(d: Date): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ ok: true, skipped: "push non configuré" });

  const db = adminClient();
  const { data: subs } = await db.from("push_subscriptions").select("user_id");
  const subscribed = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  if (subscribed.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const now = new Date();
  const today = parisDay(now);
  const yesterday = parisDay(new Date(now.getTime() - 86_400_000));
  const { data: scores } = await db
    .from("blindtest_scores")
    .select("user_id, created_at")
    .in("user_id", subscribed)
    .gte("created_at", new Date(now.getTime() - 2 * 86_400_000).toISOString());

  const playedToday = new Set<string>();
  const playedYesterday = new Set<string>();
  for (const s of scores ?? []) {
    const day = parisDay(new Date(s.created_at));
    if (day === today) playedToday.add(s.user_id);
    else if (day === yesterday) playedYesterday.add(s.user_id);
  }
  const targets = [...playedYesterday].filter((u) => !playedToday.has(u));
  const sent = await sendPushToUsers(targets, {
    title: "Ta série s'arrête ce soir",
    body: "Une partie, même courte, et elle continue. Deux minutes.",
    url: "/jouer?mode=solo&theme=random&autostart=1",
    tag: `streak-${today}`,
  });
  return NextResponse.json({ ok: true, targets: targets.length, sent });
}
