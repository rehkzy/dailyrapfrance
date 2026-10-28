import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";

// POST /api/referral/claim { code } — rattache le compte courant (créé il y a moins de
// 48 h) au parrain qui possède ce code. Idempotent : un filleul ne compte qu'une fois.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return NextResponse.json({ ok: false, reason: "invalid" });

  const db = adminClient();
  const { data: me } = await db.from("profiles").select("id, created_at, referral_code").eq("id", user.id).maybeSingle();
  if (!me) return NextResponse.json({ ok: false, reason: "no_profile" });
  if (me.referral_code === code) return NextResponse.json({ ok: false, reason: "self" });
  const ageMs = Date.now() - new Date(me.created_at).getTime();
  if (ageMs > 48 * 3600 * 1000) return NextResponse.json({ ok: false, reason: "too_old" });

  const { data: referrer } = await db.from("profiles").select("id").eq("referral_code", code).maybeSingle();
  if (!referrer) return NextResponse.json({ ok: false, reason: "unknown_code" });

  const { error } = await db.from("referrals").insert({ referrer_id: referrer.id, referred_id: user.id });
  if (error && !/duplicate|unique/i.test(error.message)) return NextResponse.json({ ok: false, reason: "db_error" });
  return NextResponse.json({ ok: true });
}
