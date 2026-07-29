import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/adminAuth";
import { sendEmail, emailConfigured, FEEDBACK_TEMPLATE } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * GET /api/cron/feedback-email — mail automatique de retour d'expérience.
 *
 * Lancé chaque jour par le cron Vercel (voir vercel.json). Cible : les joueurs inscrits
 * il y a 3 à 10 jours qui n'ont pas encore reçu ce mail (dédup email_log, kind
 * "auto:feedback-j3"). Limité à 40 envois par exécution pour laisser de la marge aux
 * campagnes manuelles sous la limite gratuite Resend (100/jour).
 *
 * Sécurité : le cron Vercel envoie "Authorization: Bearer ${CRON_SECRET}" — toute
 * requête sans ce secret est refusée.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!emailConfigured()) return NextResponse.json({ ok: true, skipped: "mailing non configuré" });

  const db = adminClient();
  const KIND = "auto:feedback-j3";
  const now = Date.now();
  const DAY = 86_400_000;

  const candidates: { id: string; email: string }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const u of data.users) {
      if (!u.email || !(u.email_confirmed_at || u.app_metadata?.provider === "google")) continue;
      const age = now - new Date(u.created_at).getTime();
      if (age >= 3 * DAY && age <= 10 * DAY) candidates.push({ id: u.id, email: u.email });
    }
    if (data.users.length < 1000) break;
  }

  const { data: logged } = await db.from("email_log").select("user_id").eq("kind", KIND);
  const already = new Set((logged ?? []).map((l) => l.user_id));
  const pending = candidates.filter((c) => !already.has(c.id)).slice(0, 40);

  let sent = 0;
  for (const c of pending) {
    const r = await sendEmail(c.email, FEEDBACK_TEMPLATE.subject, FEEDBACK_TEMPLATE.body);
    if (r.ok) {
      sent++;
      await db.from("email_log").insert({ user_id: c.id, kind: KIND });
    } else if (/429|rate/i.test(r.error ?? "")) {
      break;
    }
  }

  return NextResponse.json({ ok: true, sent, candidates: candidates.length });
}
