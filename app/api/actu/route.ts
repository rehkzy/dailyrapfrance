import { NextRequest, NextResponse } from "next/server";
import { getTrending, getNewReleases, type TrendKind } from "@/lib/trending";
import { getNews } from "@/lib/news";

export const revalidate = 1800;

// GET /api/actu?what=tendances&kind=rap|tout  |  what=sorties  |  what=actu
export async function GET(req: NextRequest) {
  const what = req.nextUrl.searchParams.get("what") ?? "tendances";
  const limit = Math.min(30, parseInt(req.nextUrl.searchParams.get("limit") ?? "10", 10) || 10);
  if (what === "actu") return NextResponse.json({ items: await getNews(limit) });
  if (what === "sorties") return NextResponse.json({ items: await getNewReleases(limit) });
  const kind: TrendKind = req.nextUrl.searchParams.get("kind") === "tout" ? "tout" : "rap";
  return NextResponse.json({ items: await getTrending(kind, limit) });
}
