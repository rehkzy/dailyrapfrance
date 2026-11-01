import { NextRequest, NextResponse } from "next/server";
import { ipAddress } from "@vercel/functions/headers";
import { createClient } from "@/lib/supabase/server";
import { claimReferral, hashIp } from "@/lib/referralServer";

// POST /api/referral/claim { code, source? } — rattache le compte courant au parrain qui
// possède ce code. Filet du rattachement serveur (/auth/callback) : localStorage, ou code
// saisi à la main par le filleul. Idempotent : un filleul ne compte qu'une fois.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";
  const source = body?.source === "manual" ? "manual" : "local";
  const r = await claimReferral(user.id, code, source, await hashIp(ipAddress(req)));
  return NextResponse.json(r);
}
