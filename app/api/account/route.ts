import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";

// DELETE /api/account { confirm: "SUPPRIMER" } — l'utilisateur supprime son propre compte.
// La suppression de auth.users entraîne en cascade profil, scores, amis, messages, blind
// tests, parrainages et abonnements push (clés étrangères on delete cascade). Les avatars
// stockés sont retirés du bucket. Droit à l'effacement (RGPD) et exigence Google OAuth.
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.confirm !== "SUPPRIMER") return NextResponse.json({ error: "confirmation" }, { status: 400 });

  const db = adminClient();
  try {
    const { data: files } = await db.storage.from("avatars").list(user.id, { limit: 100 });
    if (files?.length) await db.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
  } catch {}
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
