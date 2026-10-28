import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";

// GET /api/referral/me → { code, count, referred: [{ name, at }] } — crée le code s'il manque.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const db = adminClient();
  const { data: profile } = await db.from("profiles").select("referral_code").eq("id", user.id).maybeSingle();
  let code = profile?.referral_code as string | null | undefined;
  if (!code) {
    for (let i = 0; i < 5 && !code; i++) {
      const candidate = makeCode();
      const { error } = await db.from("profiles").update({ referral_code: candidate }).eq("id", user.id);
      if (!error) code = candidate;
    }
  }
  const { data: refs } = await db
    .from("referrals")
    .select("created_at, referred:profiles!referrals_referred_id_fkey(display_name, username)")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });
  const referred = (refs ?? []).map((r) => {
    const p = Array.isArray(r.referred) ? r.referred[0] : r.referred;
    return { name: (p as { display_name?: string; username?: string } | null)?.display_name ?? (p as { username?: string } | null)?.username ?? "Un ami", at: r.created_at };
  });
  return NextResponse.json({ code, count: referred.length, referred });
}
