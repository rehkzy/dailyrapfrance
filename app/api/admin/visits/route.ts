import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/visits — journal des visites (IP, géo, page), paginé, plus récent d'abord.
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const PER_PAGE = 50;
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const db = adminClient();
  const { data, error, count } = await db
    .from("visit_logs")
    .select("id, ip, country, city, region, path, referer, user_agent, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    visits: data ?? [],
    hasMore: (count ?? 0) > to + 1,
    total: count ?? 0,
  });
}
