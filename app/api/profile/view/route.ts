import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";

/*
 * POST /api/profile/view { profileId }
 * Enregistre « X a vu le profil de Y » — seulement si les deux ont les vues de profil
 * activées (réglage par défaut : oui). Jamais pour soi-même, jamais pour un invité.
 */
export async function POST(req: NextRequest) {
  const { profileId } = (await req.json().catch(() => ({}))) as { profileId?: string };
  if (!profileId) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous || user.id === profileId) return NextResponse.json({ ok: false });
  const db = adminClient();
  const { data: both, error } = await db.from("profiles").select("id,profile_views_on").in("id", [user.id, profileId]);
  if (error) return NextResponse.json({ ok: false }); // migration pas encore passée : on ne casse rien
  if (both?.length !== 2 || both.some((p) => p.profile_views_on === false)) return NextResponse.json({ ok: false, off: true });
  await db.from("profile_views").upsert({ viewer_id: user.id, profile_id: profileId, viewed_at: new Date().toISOString() }, { onConflict: "viewer_id,profile_id" });
  return NextResponse.json({ ok: true });
}
