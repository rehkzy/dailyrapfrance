import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/adminAuth";
import { sendPushToUsers, pushConfigured } from "@/lib/push";
import { getDailyTheme } from "@/lib/themes";
import { weeklyNumber } from "@/lib/dailyStreak";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * GET /api/cron/push-weekly — le lundi matin (heure de Paris), à tous les abonnés push :
 * « Nouveau défi : <thème> ». Un seul message par semaine, c'est le rendez-vous.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ ok: true, skipped: "push non configuré" });

  const db = adminClient();
  const { data: subs } = await db.from("push_subscriptions").select("user_id");
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  const theme = getDailyTheme();
  const label = theme.label.replace(/^Blind Test /i, "");
  const sent = await sendPushToUsers(userIds, {
    title: `Défi #${weeklyNumber()} : ${label}`,
    body: "Nouveau thème pour tout le monde jusqu'à dimanche. Tes potes ont déjà commencé ?",
    url: `/jouer?mode=solo&theme=${encodeURIComponent(theme.id)}&daily=1&autostart=1`,
    tag: `weekly-${weeklyNumber()}`,
  });
  return NextResponse.json({ ok: true, users: userIds.length, sent });
}
