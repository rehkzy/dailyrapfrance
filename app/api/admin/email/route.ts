import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { requireAdmin, adminClient } from "@/lib/adminAuth";
import { sendEmail, emailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * POST /api/admin/email — envoi de campagne à la base de joueurs.
 *
 * body: { subject, body, audience: "all" | "active30d", test?: boolean }
 *
 * - test: true → envoie uniquement à l'admin connecté, pour vérifier le rendu.
 * - Sinon : envoie par lot de 90 max (plan gratuit Resend = 100/jour) aux joueurs qui
 *   n'ont PAS encore reçu cette campagne (dédup via email_log, la campagne étant
 *   identifiée par le hash de son sujet+texte). Renvoie {sent, remaining} : s'il reste
 *   des destinataires, il suffit de recliquer "Envoyer" le lendemain — personne ne
 *   recevra le mail deux fois.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Mailing non configuré : ajoute RESEND_API_KEY et EMAIL_FROM aux variables d'environnement." },
      { status: 500 }
    );
  }

  const payload = (await req.json().catch(() => null)) as
    | { subject?: string; body?: string; audience?: "all" | "active30d"; test?: boolean }
    | null;
  const subject = payload?.subject?.trim();
  const body = payload?.body?.trim();
  if (!subject || !body) return NextResponse.json({ error: "Sujet et message requis." }, { status: 400 });

  // Test : uniquement vers l'admin
  if (payload?.test) {
    const r = await sendEmail(gate.email, subject, body);
    return r.ok ? NextResponse.json({ ok: true, test: true }) : NextResponse.json({ error: r.error }, { status: 500 });
  }

  const db = adminClient();
  const kind = "campaign:" + createHash("sha256").update(subject + "\n" + body).digest("hex").slice(0, 16);

  // Tous les comptes avec e-mail confirmé
  const recipients: { id: string; email: string }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const u of data.users) {
      if (u.email && (u.email_confirmed_at || u.app_metadata?.provider === "google")) {
        recipients.push({ id: u.id, email: u.email });
      }
    }
    if (data.users.length < 1000) break;
  }

  // Audience "actifs 30 j" : au moins une partie enregistrée sur la période
  let targets = recipients;
  if (payload?.audience === "active30d") {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data: recent } = await db.from("blindtest_scores").select("user_id").gte("created_at", since);
    const activeIds = new Set((recent ?? []).map((r) => r.user_id));
    targets = recipients.filter((r) => activeIds.has(r.id));
  }

  // Dédup : déjà reçus pour cette campagne
  const { data: logged } = await db.from("email_log").select("user_id").eq("kind", kind);
  const already = new Set((logged ?? []).map((l) => l.user_id));
  const pending = targets.filter((t) => !already.has(t.id));

  const BATCH = 90; // marge sous la limite quotidienne du plan gratuit (100/j)
  const toSend = pending.slice(0, BATCH);
  let sent = 0;
  const errors: string[] = [];
  for (const r of toSend) {
    const result = await sendEmail(r.email, subject, body);
    if (result.ok) {
      sent++;
      await db.from("email_log").insert({ user_id: r.id, kind });
    } else {
      errors.push(result.error ?? "erreur inconnue");
      if (/429|rate/i.test(result.error ?? "")) break; // quota atteint : on s'arrête proprement
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    remaining: pending.length - sent,
    total: targets.length,
    error: errors[0] ?? null,
  });
}
