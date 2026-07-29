import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/*
 * GET /api/admin/users/[id]/activity — vue détaillée d'un joueur pour le back-office :
 *  - présence en ligne (dernière activité de moins d'1 minute)
 *  - salon en cours + coéquipiers, s'il est en train de jouer
 *  - historique des 50 derniers événements (pages vues, clics réseaux, partages...)
 *  - compteurs agrégés (pages vues, clics Instagram, partages)
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  const db = adminClient();

  const [{ data: profile }, { data: events }, { data: activeRooms }] = await Promise.all([
    db.from("profiles").select("id, display_name, username, last_seen_at").eq("id", id).maybeSingle(),
    db
      .from("user_events")
      .select("event_type, path, meta, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("rooms").select("id, code, theme, status, players").neq("status", "finished"),
  ]);

  // Association joueur ↔ salon : les salons stockent les pseudos des joueurs, pas leur
  // id (cf. RoomsTab existant), on matche donc par display_name/username.
  const name = profile?.display_name ?? profile?.username ?? null;
  const currentRoom = name ? (activeRooms ?? []).find((r) => (r.players ?? []).includes(name)) ?? null : null;

  const lastSeenAt = profile?.last_seen_at ?? null;
  const isOnline = lastSeenAt ? Date.now() - new Date(lastSeenAt).getTime() < 60_000 : false;

  const counts = { pageViews: 0, instagramClicks: 0, shares: 0 };
  for (const e of events ?? []) {
    if (e.event_type === "page_view") counts.pageViews++;
    if (e.event_type === "click_instagram") counts.instagramClicks++;
    if (e.event_type === "share") counts.shares++;
  }

  return NextResponse.json({
    isOnline,
    lastSeenAt,
    currentRoom: currentRoom
      ? { code: currentRoom.code, theme: currentRoom.theme, players: currentRoom.players ?? [] }
      : null,
    events: events ?? [],
    counts,
  });
}
