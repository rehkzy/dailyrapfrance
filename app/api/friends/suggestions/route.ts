import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/adminAuth";
import { friendIds } from "@/lib/friends";

export const dynamic = "force-dynamic";

/*
 * GET — suggestions d'amis, par ordre de pertinence :
 *  1. les gens avec qui on a joué en ligne (room_results), les plus fréquents d'abord ;
 *  2. les amis de nos amis (en commun ≥ 1), les plus « en commun » d'abord ;
 *  3. en complément, les joueurs du défi de la semaine les mieux placés.
 * Jamais soi-même, ni un ami, ni une demande en attente.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const db = adminClient();

  const [{ data: pending }, friends] = await Promise.all([
    db.from("friendships").select("requester_id,addressee_id").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    friendIds(db, user.id),
  ]);
  const exclude = new Set<string>([user.id, ...friends]);
  for (const r of pending ?? []) exclude.add(r.requester_id === user.id ? r.addressee_id : r.requester_id);

  const score = new Map<string, { score: number; reason: string }>();
  const bump = (id: string, pts: number, reason: string) => {
    if (exclude.has(id)) return;
    const cur = score.get(id);
    if (!cur) score.set(id, { score: pts, reason });
    else { cur.score += pts; if (pts >= 3) cur.reason = reason; }
  };

  // 1. Joué ensemble
  const { data: played } = await db.from("room_results").select("players").contains("players", JSON.stringify([{ user_id: user.id }])).order("finished_at", { ascending: false }).limit(200);
  for (const r of played ?? []) for (const p of (r.players as { user_id: string }[])) bump(p.user_id, 3, "Vous avez joué ensemble");

  // 2. Amis d'amis
  if (friends.length) {
    const { data: fof } = await db.from("friendships").select("requester_id,addressee_id").eq("status", "accepted").or(`requester_id.in.(${friends.join(",")}),addressee_id.in.(${friends.join(",")})`).limit(2000);
    const common = new Map<string, number>();
    for (const r of fof ?? []) {
      const a = friends.includes(r.requester_id) ? r.addressee_id : r.requester_id;
      common.set(a, (common.get(a) ?? 0) + 1);
    }
    for (const [id, n] of common) bump(id, n, n > 1 ? `${n} amis en commun` : "1 ami en commun");
  }

  // 3. Complément : actifs du moment
  if (score.size < 6) {
    const { data: recent } = await db.from("blindtest_scores").select("user_id").gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()).order("points", { ascending: false }).limit(60);
    for (const r of recent ?? []) bump(r.user_id, 0.5, "Actif cette semaine");
  }

  const ids = [...score.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, 12).map(([id]) => id);
  if (ids.length === 0) return NextResponse.json({ suggestions: [] });
  const { data: profiles } = await db.from("profiles").select("id,username,display_name,avatar_url,verified").in("id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const suggestions = ids.map((id) => ({ ...(byId.get(id) ?? { id, username: null, display_name: "Joueur", avatar_url: null, verified: false }), reason: score.get(id)!.reason })).filter((p) => !!byId.get(p.id));
  return NextResponse.json({ suggestions });
}
