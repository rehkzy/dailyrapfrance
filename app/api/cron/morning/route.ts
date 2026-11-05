import { NextRequest, NextResponse } from "next/server";
import { GET as cleanupRooms } from "@/app/api/cron/cleanup-rooms/route";
import { GET as pushWeekly } from "@/app/api/cron/push-weekly/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * GET /api/cron/morning — un seul cron Vercel le matin (offre Hobby : deux crons max,
 * une fois par jour) qui enchaîne les tâches du matin : nettoyage des salons, et le lundi
 * la notification du nouveau défi. Chaque tâche vérifie elle-même le secret.
 */
export async function GET(req: NextRequest) {
  const parisWeekday = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short" }).format(new Date());
  const out: Record<string, unknown> = {};
  out.cleanup = await cleanupRooms(req).then((r) => r.json()).catch((e) => String(e));
  if (parisWeekday === "Mon") out.weekly = await pushWeekly(req).then((r) => r.json()).catch((e) => String(e));
  return NextResponse.json({ ok: true, ...out });
}
