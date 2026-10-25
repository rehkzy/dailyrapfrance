import { NextRequest, NextResponse } from "next/server";
import { findClips, pickClipStart } from "@/lib/youtube";

// POST /api/blindtest/clips — { tracks: [{ id, title, artistName }] }
// → { clips: { [trackId]: { videoId, duration, start } | null }, available: boolean }
// available = false quand la clé YouTube n'est pas configurée (mode clip indisponible).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tracks = Array.isArray(body?.tracks)
    ? (body.tracks as { id?: unknown; title?: unknown; artistName?: unknown }[])
        .filter((t) => typeof t.id === "string" && typeof t.title === "string" && typeof t.artistName === "string")
        .slice(0, 30)
        .map((t) => ({ id: t.id as string, title: t.title as string, artistName: t.artistName as string }))
    : [];
  if (!process.env.YOUTUBE_API_KEY) return NextResponse.json({ clips: {}, available: false });
  const found = await findClips(tracks);
  const clips: Record<string, { videoId: string; duration: number; start: number } | null> = {};
  for (const [id, c] of Object.entries(found)) clips[id] = c ? { videoId: c.videoId, duration: c.duration, start: pickClipStart(c.duration) } : null;
  return NextResponse.json({ clips, available: true });
}
