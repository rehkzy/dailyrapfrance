import { NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/referrals — parrains classés par nombre de filleuls (pour le tirage au sort).
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const db = adminClient();
  const { data: refs } = await db.from("referrals").select("referrer_id, referred_id, created_at");
  const ids = [...new Set((refs ?? []).flatMap((r) => [r.referrer_id, r.referred_id]))];
  const { data: profiles } = ids.length ? await db.from("profiles").select("id, username, display_name, referral_code").in("id", ids) : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  type Ref = { id: string; name: string; email: string; code: string | null; count: number; referred: { name: string; at: string }[] };
  const map = new Map<string, Ref>();
  for (const r of refs ?? []) {
    const p = byId.get(r.referrer_id);
    const cur: Ref = map.get(r.referrer_id) ?? { id: r.referrer_id, name: p?.display_name ?? p?.username ?? r.referrer_id, email: emailById.get(r.referrer_id) ?? "", code: p?.referral_code ?? null, count: 0, referred: [] as { name: string; at: string }[] };
    const f = byId.get(r.referred_id);
    cur.count += 1;
    cur.referred.push({ name: f?.display_name ?? f?.username ?? r.referred_id, at: r.created_at });
    map.set(r.referrer_id, cur);
  }
  const referrers = [...map.values()].sort((a, b) => b.count - a.count);
  return NextResponse.json({ total: refs?.length ?? 0, referrers });
}
