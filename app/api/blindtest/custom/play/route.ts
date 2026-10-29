import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/adminAuth";

// POST /api/blindtest/custom/play { slug } — +1 partie sur un blind test enregistré.
// Une même adresse ne compte qu'une fois par minute et par blind test (compteur non critique).
const recent = new Map<string, number>();
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === "string" && /^[a-z0-9-]{3,40}$/i.test(body.slug) ? body.slug : null;
  if (!slug) return NextResponse.json({ ok: false });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  const key = `${ip}|${slug}`;
  const now = Date.now();
  if ((recent.get(key) ?? 0) > now - 60_000) return NextResponse.json({ ok: true, skipped: true });
  recent.set(key, now);
  if (recent.size > 5000) for (const [k, t] of recent) if (t < now - 60_000) recent.delete(k);
  try {
    const db = adminClient();
    const { data } = await db.from("custom_blindtests").select("id, plays").eq("slug", slug).maybeSingle();
    if (data) await db.from("custom_blindtests").update({ plays: (data.plays ?? 0) + 1 }).eq("id", data.id);
  } catch {
    /* compteur non critique */
  }
  return NextResponse.json({ ok: true });
}
