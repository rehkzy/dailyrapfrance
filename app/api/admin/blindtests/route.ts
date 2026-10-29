import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Blind tests créés par les joueurs : tout voir, rendre public/privé, mettre en avant, supprimer.
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const db = adminClient();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  let query = db.from("custom_blindtests").select("id, slug, title, description, track_ids, is_public, featured, plays, created_at, user_id, profiles(username, display_name, verified)").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = (await req.json().catch(() => null)) as { id?: string; is_public?: boolean; featured?: boolean } | null;
  if (!body?.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (typeof body.is_public === "boolean") patch.is_public = body.is_public;
  if (typeof body.featured === "boolean") patch.featured = body.featured;
  const { error } = await adminClient().from("custom_blindtests").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  const { error } = await adminClient().from("custom_blindtests").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
