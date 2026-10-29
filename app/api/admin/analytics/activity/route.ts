import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/*
 * GET /api/admin/analytics/activity?type=&q=&from=&to=&limit=
 * Le journal de ce que font les joueurs connectés : pages vues, parties lancées/finies,
 * partages, clics réseaux — avec le nom du joueur, filtrable par type, joueur et période.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "";
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(500, parseInt(sp.get("limit") ?? "200", 10) || 200);
  const db = adminClient();
  let query = db.from("user_events").select("id, user_id, event_type, path, meta, created_at").neq("event_type", "heartbeat").order("created_at", { ascending: false }).limit(q ? 2000 : limit);
  if (type) query = query.eq("event_type", type);
  if (sp.get("from")) query = query.gte("created_at", `${sp.get("from")}T00:00:00Z`);
  if (sp.get("to")) query = query.lt("created_at", new Date(new Date(`${sp.get("to")}T00:00:00Z`).getTime() + 86_400_000).toISOString());
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = [...new Set((data ?? []).map((e) => e.user_id))];
  const { data: profiles } = ids.length ? await db.from("profiles").select("id, display_name, username, avatar_url, verified").in("id", ids) : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  let items = (data ?? []).map((e) => ({ ...e, profile: byId.get(e.user_id) ?? null }));
  if (q) items = items.filter((e) => (e.profile?.display_name ?? "").toLowerCase().includes(q) || (e.profile?.username ?? "").toLowerCase().includes(q)).slice(0, limit);
  return NextResponse.json({ items });
}
