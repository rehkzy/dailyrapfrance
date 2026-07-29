import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminClient, adminEmails } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/users?q=&page= — liste paginée des comptes, e-mails et dernière connexion
// compris (via auth.users, accessibles seulement avec la clé service_role), croisés avec
// les profils et le nombre de parties de chacun.
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const db = adminClient();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = 50;

  const { data: authList, error } = await db.auth.admin.listUsers({ page, perPage });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = authList.users.map((u) => u.id);
  const [{ data: profiles }, { data: counts }] = await Promise.all([
    db.from("profiles").select("id, display_name, username, created_at, last_seen_at").in("id", ids),
    db.from("blindtest_scores").select("user_id").in("user_id", ids),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const gamesById = new Map<string, number>();
  for (const c of counts ?? []) gamesById.set(c.user_id, (gamesById.get(c.user_id) ?? 0) + 1);

  let users = authList.users.map((u) => {
    const lastSeenAt = profileById.get(u.id)?.last_seen_at ?? null;
    return {
      id: u.id,
      email: u.email ?? "",
      provider: u.app_metadata?.provider ?? "email",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      displayName: profileById.get(u.id)?.display_name ?? u.user_metadata?.full_name ?? null,
      username: profileById.get(u.id)?.username ?? null,
      games: gamesById.get(u.id) ?? 0,
      isOnline: lastSeenAt ? Date.now() - new Date(lastSeenAt).getTime() < 60_000 : false,
    };
  });

  if (q) {
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q) ||
        (u.username ?? "").toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ users, page, perPage, hasMore: authList.users.length === perPage });
}

// DELETE /api/admin/users?id= — supprime un compte (cascade : profil, scores, amitiés,
// participations aux salons). Garde-fou : impossible de supprimer un compte admin.
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
  return NextResponse.json({ ok: true });
}
