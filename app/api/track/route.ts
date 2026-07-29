import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/*
 * POST /api/track — reçoit un événement du joueur connecté (page vue, clic sur un
 * réseau social, partage, heartbeat...) et met à jour sa présence "en ligne".
 *
 * Sécurité : le user_id n'est jamais fourni par le client — on le lit depuis la
 * session Supabase côté serveur, donc impossible de tracker un événement au nom
 * de quelqu'un d'autre. Si personne n'est connecté, la requête est ignorée
 * silencieusement (200 quand même, pour ne jamais faire échouer l'appel côté client).
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: true, skipped: "not_authenticated" });

  const body = (await req.json().catch(() => null)) as
    | { eventType?: string; path?: string; meta?: Record<string, unknown> }
    | null;
  const eventType = body?.eventType?.trim();
  if (!eventType) return NextResponse.json({ error: "eventType manquant" }, { status: 400 });

  const db = adminClient();
  await Promise.all([
    db.from("user_events").insert({
      user_id: user.id,
      event_type: eventType,
      path: body?.path ?? null,
      meta: body?.meta ?? null,
    }),
    db.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id),
  ]);

  return NextResponse.json({ ok: true });
}
