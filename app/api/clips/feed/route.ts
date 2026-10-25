import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
 * GET /api/clips/feed?count=10&tag=93
 * Tire `count` clips activés au hasard dans le catalogue (filtrés par tag si demandé) et
 * renvoie, pour chaque clip, deux artistes "intrus" pris dans le reste du catalogue.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const count = Math.min(Math.max(Number(searchParams.get("count")) || 10, 3), 30);
  const tag = searchParams.get("tag");
  const supabase = await createClient();
  let q = supabase.from("clip_catalog").select("id, video_id, artist, title, feats, start_seconds, duration, tags").eq("enabled", true).limit(400);
  if (tag) q = q.contains("tags", [tag]);
  const { data, error } = await q;
  if (error) return NextResponse.json({ clips: [], error: error.message }, { status: 200 });
  const all = data ?? [];
  // Un seul clip par artiste dans une partie, pour que les intrus soient de vrais intrus.
  const byArtist = new Map<string, typeof all>();
  for (const c of all) byArtist.set(c.artist, [...(byArtist.get(c.artist) ?? []), c]);
  const artists = [...byArtist.keys()].sort(() => Math.random() - 0.5);
  const picked = artists.slice(0, count).map((a) => {
    const list = byArtist.get(a)!;
    return list[Math.floor(Math.random() * list.length)];
  });
  const allArtists = [...byArtist.keys()];
  const clips = picked.map((c) => {
    const others = allArtists.filter((a) => a !== c.artist).sort(() => Math.random() - 0.5).slice(0, 2);
    return {
      id: c.id,
      videoId: c.video_id,
      artist: c.artist,
      title: c.title,
      feats: c.feats ?? [],
      start: c.start_seconds,
      duration: c.duration,
      choices: [c.artist, ...others].sort(() => Math.random() - 0.5),
    };
  });
  return NextResponse.json({ clips, total: all.length });
}
