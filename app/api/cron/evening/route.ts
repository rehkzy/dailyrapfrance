import { NextRequest, NextResponse } from "next/server";
import { GET as feedbackEmail } from "@/app/api/cron/feedback-email/route";
import { GET as pushStreak } from "@/app/api/cron/push-streak/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* GET /api/cron/evening — le cron du soir : rappel de série, puis mail de retour J+3. */
export async function GET(req: NextRequest) {
  const out: Record<string, unknown> = {};
  out.streak = await pushStreak(req).then((r) => r.json()).catch((e) => String(e));
  out.feedback = await feedbackEmail(req).then((r) => r.json()).catch((e) => String(e));
  return NextResponse.json({ ok: true, ...out });
}
