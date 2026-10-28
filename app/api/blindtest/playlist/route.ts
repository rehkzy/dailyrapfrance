import { NextRequest, NextResponse } from "next/server";
import { deezerFetch, toGameTrack, type DeezerTrackSummary } from "@/lib/deezerTrack";

// Import d'une playlist Deezer PUBLIQUE (lien collé dans le constructeur).
// GET /api/blindtest/playlist?url=https://www.deezer.com/fr/playlist/1234  → { title, tracks }
// Spotify / Apple Music ne sont pas importables : leurs API exigent une connexion et, pour
// Spotify, les extraits de 30 s ne sont plus fournis aux nouvelles applications (nov. 2024).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") ?? "";
  const m = url.match(/deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d+)/i) ?? url.match(/^(\d{4,})$/);
  if (!m) {
    const other = /spotify\.com|music\.apple\.com|youtube\.com|youtu\.be/i.test(url) ? "other" : "invalid";
    return NextResponse.json({ error: other }, { status: 400 });
  }
  const id = m[1];
  try {
    const meta = await deezerFetch<{ title?: string; nb_tracks?: number }>(`/playlist/${id}`);
    const json = await deezerFetch<{ data?: DeezerTrackSummary[] }>(`/playlist/${id}/tracks?limit=100`);
    const tracks = (json.data ?? []).filter((t) => t.preview).map((t) => toGameTrack({ ...t, contributors: [] }));
    return NextResponse.json({ title: meta.title ?? "Playlist", tracks });
  } catch (err) {
    console.error("[blindtest/playlist] —", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "unreachable" }, { status: 400 });
  }
}
