import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminClient, adminEmails } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/*
 * GET /api/admin/users?q=&filter=&page=&sort=
 * Tous les comptes (auth.users + profils + nb de parties), recherche et filtres SUR TOUT LE
 * MONDE — avant, la recherche ne regardait que la page courante de 50 comptes, d'où des
 * joueurs introuvables. On lit auth.users par pages de 1000 (cache 30 s en mémoire).
 *   filter : verification (demandes en attente) · verified · online · admins · new7d
 *   sort   : created (défaut) · lastSeen · games · name
 */
export type AdminUserRow = {
  id: string; email: string; provider: string; createdAt: string; lastSignInAt: string | null;
  displayName: string | null; username: string | null; avatarUrl: string | null; games: number;
  isOnline: boolean; lastSeenAt: string | null; verified: boolean; verificationRequestedAt: string | null;
  isAdmin: boolean; referrals: number; customs: number;
};

let cache: { at: number; rows: AdminUserRow[] } | null = null;

async function loadAll(): Promise<AdminUserRow[]> {
  if (cache && Date.now() - cache.at < 30_000) return cache.rows;
  const db = adminClient();
  const authUsers: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null; app_metadata?: { provider?: string }; user_metadata?: { full_name?: string } }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    authUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const [{ data: profiles }, { data: scores }, { data: refs }, { data: customs }] = await Promise.all([
    db.from("profiles").select("id, display_name, username, avatar_url, created_at, last_seen_at, verified, verification_requested_at"),
    db.from("blindtest_scores").select("user_id"),
    db.from("referrals").select("referrer_id"),
    db.from("custom_blindtests").select("user_id"),
  ]);
  const count = (rows: { [k: string]: unknown }[] | null, key: string) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) { const k = r[key] as string; m.set(k, (m.get(k) ?? 0) + 1); }
    return m;
  };
  const games = count(scores, "user_id"), referrals = count(refs, "referrer_id"), customsBy = count(customs, "user_id");
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const admins = new Set(adminEmails());
  const now = Date.now();
  const rows: AdminUserRow[] = authUsers.map((u) => {
    const p = profileById.get(u.id);
    const lastSeenAt = p?.last_seen_at ?? null;
    return {
      id: u.id,
      email: u.email ?? "",
      provider: u.app_metadata?.provider ?? "email",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      displayName: p?.display_name ?? u.user_metadata?.full_name ?? null,
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      games: games.get(u.id) ?? 0,
      isOnline: lastSeenAt ? now - new Date(lastSeenAt).getTime() < 60_000 : false,
      lastSeenAt,
      verified: !!p?.verified,
      verificationRequestedAt: p?.verification_requested_at ?? null,
      isAdmin: !!u.email && admins.has(u.email.toLowerCase()),
      referrals: referrals.get(u.id) ?? 0,
      customs: customsBy.get(u.id) ?? 0,
    };
  });
  cache = { at: Date.now(), rows };
  return rows;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const filter = sp.get("filter") ?? "";
  const sort = sp.get("sort") ?? "created";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const perPage = 50;

  let rows: AdminUserRow[];
  try { rows = await loadAll(); } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }); }

  const week = Date.now() - 7 * 86_400_000;
  if (filter === "verification") rows = rows.filter((u) => u.verificationRequestedAt && !u.verified);
  else if (filter === "verified") rows = rows.filter((u) => u.verified);
  else if (filter === "online") rows = rows.filter((u) => u.isOnline);
  else if (filter === "admins") rows = rows.filter((u) => u.isAdmin);
  else if (filter === "new7d") rows = rows.filter((u) => new Date(u.createdAt).getTime() > week);
  if (q) rows = rows.filter((u) => u.email.toLowerCase().includes(q) || (u.displayName ?? "").toLowerCase().includes(q) || (u.username ?? "").toLowerCase().includes(q));

  rows = [...rows].sort((a, b) => {
    if (sort === "lastSeen") return (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? "");
    if (sort === "games") return b.games - a.games;
    if (sort === "name") return (a.displayName ?? a.email).localeCompare(b.displayName ?? b.email, "fr");
    return b.createdAt.localeCompare(a.createdAt);
  });

  const total = rows.length;
  const users = rows.slice((page - 1) * perPage, page * perPage);
  return NextResponse.json({ users, page, perPage, total, hasMore: page * perPage < total, pendingVerification: (await loadAll()).filter((u) => u.verificationRequestedAt && !u.verified).length });
}

// PATCH /api/admin/users { id, verified } — donne ou retire la certification.
export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = (await req.json().catch(() => null)) as { id?: string; verified?: boolean } | null;
  if (!body?.id || typeof body.verified !== "boolean") return NextResponse.json({ error: "id et verified requis" }, { status: 400 });
  const db = adminClient();
  const { error } = await db.from("profiles").update({ verified: body.verified, ...(body.verified ? {} : { verification_requested_at: null }) }).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  cache = null;
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/users?id= — supprime un compte (cascade). Jamais un admin.
export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  const db = adminClient();
  const { data: target } = await db.auth.admin.getUserById(id);
  if (target?.user?.email && adminEmails().includes(target.user.email.toLowerCase())) {
    return NextResponse.json({ error: "Impossible de supprimer un compte admin." }, { status: 400 });
  }
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  cache = null;
  return NextResponse.json({ ok: true });
}
