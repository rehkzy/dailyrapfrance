import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";
import { findClips, pickClipStart } from "@/lib/youtube";
import { THEME_OPTIONS } from "@/lib/themes";

export const dynamic = "force-dynamic";

/*
 * Back-office du catalogue « Devine le clip ».
 *   GET    ?tag=93            → liste (tous, activés ou non)
 *   POST   { url, artist, title, feats?, start?, tags? }  → ajout manuel (URL YouTube)
 *   POST   { importTheme }    → import automatique : pool Deezer du thème → clips officiels
 *   PATCH  { id, enabled?, start_seconds?, tags? }        → modification
 *   DELETE ?id=               → suppression
 */

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
function extractVideoId(input: string): string | null {
  const s = input.trim();
  if (YT_ID.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = /\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})/.exec(u.pathname);
    if (m) return m[1];
  } catch {
    /* pas une URL */
  }
  return null;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const tag = new URL(req.url).searchParams.get("tag");
  const db = adminClient();
  let q = db.from("clip_catalog").select("*").order("created_at", { ascending: false }).limit(500);
  if (tag) q = q.contains("tags", [tag]);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clips: data ?? [] });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "corps invalide" }, { status: 400 });
  const db = adminClient();

  // --- Import automatique par thème
  if (typeof body.importTheme === "string") {
    const theme = THEME_OPTIONS.find((t) => t.id === body.importTheme);
    if (!theme) return NextResponse.json({ error: "thème inconnu" }, { status: 400 });
    if (!process.env.YOUTUBE_API_KEY) return NextResponse.json({ error: "YOUTUBE_API_KEY manquante" }, { status: 500 });
    const origin = new URL(req.url).origin;
    const pool = (await fetch(`${origin}/api/blindtest/pool?theme=${theme.id}&count=30`, { cache: "no-store" }).then((r) => r.json())) as {
      tracks?: { id: string; title: string; artistName: string; feats: string[] }[];
    };
    const tracks = pool.tracks ?? [];
    const found = await findClips(tracks);
    let added = 0;
    let skipped = 0;
    for (const t of tracks) {
      const c = found[t.id];
      if (!c) {
        skipped++;
        continue;
      }
      const { error } = await db.from("clip_catalog").upsert(
        {
          video_id: c.videoId,
          artist: t.artistName,
          title: t.title,
          feats: t.feats ?? [],
          start_seconds: pickClipStart(c.duration),
          duration: c.duration,
          tags: [theme.id],
          source: "auto",
        },
        { onConflict: "video_id", ignoreDuplicates: true }
      );
      if (!error) added++;
    }
    return NextResponse.json({ ok: true, added, skipped, total: tracks.length });
  }

  // --- Ajout manuel
  const videoId = typeof body.url === "string" ? extractVideoId(body.url) : null;
  const artist = typeof body.artist === "string" ? body.artist.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!videoId || !artist || !title) return NextResponse.json({ error: "URL YouTube, artiste et titre requis" }, { status: 400 });
  // oEmbed : vérifie que la vidéo existe et est intégrable (sans clé API)
  const oembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`).catch(() => null);
  if (!oembed || !oembed.ok) return NextResponse.json({ error: "Vidéo introuvable ou non intégrable" }, { status: 400 });
  const feats = Array.isArray(body.feats) ? (body.feats as unknown[]).filter((f): f is string => typeof f === "string") : [];
  const tags = Array.isArray(body.tags) ? (body.tags as unknown[]).filter((f): f is string => typeof f === "string") : [];
  const start = Number(body.start);
  const { data, error } = await db
    .from("clip_catalog")
    .upsert(
      { video_id: videoId, artist, title, feats, tags, start_seconds: Number.isFinite(start) && start >= 0 ? Math.round(start) : 45, source: "manual" },
      { onConflict: "video_id" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, clip: data });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = (await req.json().catch(() => null)) as { id?: number; enabled?: boolean; start_seconds?: number; tags?: string[]; artist?: string; title?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (Number.isFinite(body.start_seconds)) patch.start_seconds = Math.max(0, Math.round(body.start_seconds!));
  if (Array.isArray(body.tags)) patch.tags = body.tags;
  if (typeof body.artist === "string" && body.artist.trim()) patch.artist = body.artist.trim();
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
  const db = adminClient();
  const { error } = await db.from("clip_catalog").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const db = adminClient();
  const { error } = await db.from("clip_catalog").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
