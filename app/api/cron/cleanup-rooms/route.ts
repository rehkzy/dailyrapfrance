import { NextRequest, NextResponse } from "next/server";
import { cleanupRooms } from "@/lib/roomCleanup";

export const dynamic = "force-dynamic";

// GET /api/cron/cleanup-rooms — supprime les salons vides / abandonnés / terminés (cron Vercel).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await cleanupRooms(true));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST — déclenchement opportuniste depuis le site (ouverture du menu des salons), limité à
// une passe toutes les 10 min ; sans secret mais sans effet au-delà du nettoyage prévu.
export async function POST() {
  try {
    return NextResponse.json(await cleanupRooms(false));
  } catch {
    return NextResponse.json({ skipped: true });
  }
}
