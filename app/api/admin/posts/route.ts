import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/*
 * Posts DailyRap — ta propre actu dans /actu (onglet DailyRap) : un titre, un lien
 * (Instagram, TikTok, YouTube, article…), une image optionnelle, publié ou brouillon.
 * Table media_posts (migration-posts.sql).
 */
export type MediaPost = { id: string; title: string; url: string; image: string | null; kind: string; body: string | null; published: boolean; pinned: boolean; created_at: string };

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { data, error } = await adminClient().from("media_posts").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

function clean(body: Partial<MediaPost>) {
  const out: Record<string, unknown> = {};
  if (typeof body.title === "string") out.title = body.title.trim().slice(0, 160);
  if (typeof body.url === "string") out.url = body.url.trim().slice(0, 500);
  if (body.image !== undefined) out.image = body.image ? String(body.image).trim().slice(0, 500) : null;
  if (typeof body.kind === "string") out.kind = body.kind.slice(0, 20);
  if (body.body !== undefined) out.body = body.body ? String(body.body).trim().slice(0, 600) : null;
  if (typeof body.published === "boolean") out.published = body.published;
  if (typeof body.pinned === "boolean") out.pinned = body.pinned;
  return out;
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = (await req.json().catch(() => null)) as Partial<MediaPost> | null;
  if (!body?.title?.trim() || !body?.url?.trim()) return NextResponse.json({ error: "Titre et lien requis" }, { status: 400 });
  const { data, error } = await adminClient().from("media_posts").insert({ kind: "instagram", published: true, pinned: false, ...clean(body) }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = (await req.json().catch(() => null)) as (Partial<MediaPost> & { id?: string }) | null;
  if (!body?.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const { error } = await adminClient().from("media_posts").update(clean(body)).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  const { error } = await adminClient().from("media_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
