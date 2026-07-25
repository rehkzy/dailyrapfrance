import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/blindtest/pool?era=NINETIES&era=TWO_THOUSANDS&theme=cloud&pop=1&count=15
// Renvoie un lot mélangé de titres pour une partie — voir components/BlindTest.tsx.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eras = searchParams.getAll("era");
  const themes = searchParams.getAll("theme");
  const pop = searchParams.get("pop") === "1";
  const count = Math.min(Math.max(Number(searchParams.get("count")) || 15, 1), 50);

  try {
    const where: Record<string, unknown> = {};
    if (eras.length) where.era = { in: eras };
    if (themes.length) where.themes = { hasSome: themes };

    const candidates = pop
      ? await prisma.blindTestTrack.findMany({ where, orderBy: { rank: "desc" }, take: count * 4 })
      : await prisma.blindTestTrack.findMany({ where, take: 500 });

    const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, count);

    return NextResponse.json({
      tracks: shuffled.map((t) => ({
        id: t.id,
        title: t.title,
        artistName: t.artistName,
        previewUrl: t.previewUrl,
        coverUrl: t.coverUrl,
      })),
    });
  } catch (err) {
    console.error("[blindtest/pool] erreur —", err instanceof Error ? err.message : err);
    return NextResponse.json({ tracks: [] });
  }
}
