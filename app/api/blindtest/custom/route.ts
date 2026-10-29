import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CUSTOM_MAX, CUSTOM_MIN } from "@/lib/customBlindtest";

/*
 * Blind tests personnalisés enregistrés (compte requis pour écrire).
 *  GET  /api/blindtest/custom            → { mine: [...], community: [...] }
 *  GET  /api/blindtest/custom?slug=xxx   → { item } (public, ou le sien)
 *  POST /api/blindtest/custom            { id?, title, description?, trackIds, settings?, isPublic } → { item }
 *  DELETE /api/blindtest/custom?id=...
 */
const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
function makeSlug(len = 7): string {
  let s = "";
  for (let i = 0; i < len; i++) s += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  return s;
}

const SELECT = "id, slug, title, description, cover, featured, track_ids, settings, is_public, plays, created_at, user_id, profiles(username, display_name, avatar_url, verified)";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (slug) {
    const { data } = await supabase.from("custom_blindtests").select(SELECT).eq("slug", slug).maybeSingle();
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ item: data });
  }
  const { data: { user } } = await supabase.auth.getUser();
  const [mine, community] = await Promise.all([
    user ? supabase.from("custom_blindtests").select(SELECT).eq("user_id", user.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from("custom_blindtests").select(SELECT).eq("is_public", true).order("featured", { ascending: false }).order("plays", { ascending: false }).limit(24),
  ]);
  return NextResponse.json({ mine: mine.data ?? [], community: community.data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 60) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 160) : null;
  const trackIds: number[] = Array.isArray(body?.trackIds) ? body.trackIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0).slice(0, CUSTOM_MAX) : [];
  const settings = body?.settings && typeof body.settings === "object" ? { s: body.settings.s ?? undefined, a: body.settings.a ?? undefined } : {};
  const isPublic = !!body?.isPublic;
  const cover = typeof body?.cover === "string" && /^https?:\/\//.test(body.cover) ? body.cover.slice(0, 500) : null;
  if (!title || trackIds.length < CUSTOM_MIN) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (body?.id) {
    const { data, error } = await supabase
      .from("custom_blindtests")
      .update({ title, description, cover, track_ids: trackIds, settings, is_public: isPublic, updated_at: new Date().toISOString() })
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select(SELECT)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "db_error" }, { status: 400 });
    return NextResponse.json({ item: data });
  }
  // Nouveau : on retente le slug en cas de collision (rarissime)
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase
      .from("custom_blindtests")
      .insert({ slug: makeSlug(), user_id: user.id, title, description, cover, track_ids: trackIds, settings, is_public: isPublic })
      .select(SELECT)
      .maybeSingle();
    if (!error && data) return NextResponse.json({ item: data });
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.error("[custom] —", error.message);
      return NextResponse.json({ error: "db_error", detail: error.message }, { status: 400 });
    }
  }
  return NextResponse.json({ error: "db_error" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { error } = await supabase.from("custom_blindtests").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: !error });
}
