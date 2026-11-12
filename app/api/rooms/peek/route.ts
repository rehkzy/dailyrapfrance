import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/adminAuth";
import { THEME_OPTIONS } from "@/lib/themes";

/* Avant de se connecter : ce salon existe-t-il, est-ce une soirée, sur quoi, combien de joueurs ? */
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(code)) return NextResponse.json({ error: "bad_code" }, { status: 400 });
  const db = adminClient();
  let { data: room } = await db.from("rooms").select("id, code, theme, custom_title, status, rounds, is_party, host_id, created_at").eq("code", code).maybeSingle();
  if (!room) { const r = await db.from("rooms").select("id, code, theme, custom_title, status, rounds, host_id, created_at").eq("code", code).maybeSingle(); room = r.data ? { ...r.data, is_party: false } : null; } // colonne is_party absente
  if (!room) return NextResponse.json({ found: false }, { headers: { "Cache-Control": "no-store" } });
  const { count } = await db.from("room_players").select("user_id", { count: "exact", head: true }).eq("room_id", room.id);
  const { data: host } = await db.from("profiles").select("display_name, username").eq("id", room.host_id).maybeSingle();
  const label = room.custom_title ?? THEME_OPTIONS.find((t) => t.id === room.theme)?.label.replace(/^Blind Test /i, "") ?? room.theme;
  return NextResponse.json({ found: true, code: room.code, isParty: !!(room as { is_party?: boolean }).is_party, status: room.status, rounds: room.rounds, label, players: count ?? 0, host: host?.display_name ?? host?.username ?? "L'hôte" }, { headers: { "Cache-Control": "no-store" } });
}
