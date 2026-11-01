import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/referral/share { channel } — journalise un partage (bouton Partager / Copier),
// pour distinguer les parrains qui diffusent vraiment leur lien.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => null);
  const channel = ["share", "copy", "code"].includes(body?.channel) ? body.channel : "share";
  await supabase.from("referral_shares").insert({ user_id: user.id, channel });
  return NextResponse.json({ ok: true });
}
