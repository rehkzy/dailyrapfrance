import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/adminAuth";

// POST /api/blindtest/custom/play { slug } — +1 partie sur un blind test enregistré.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug : null;
  if (!slug) return NextResponse.json({ ok: false });
  try {
    const db = adminClient();
    const { data } = await db.from("custom_blindtests").select("id, plays").eq("slug", slug).maybeSingle();
    if (data) await db.from("custom_blindtests").update({ plays: (data.plays ?? 0) + 1 }).eq("id", data.id);
  } catch {
    /* compteur non critique */
  }
  return NextResponse.json({ ok: true });
}
