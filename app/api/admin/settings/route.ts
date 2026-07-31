import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminClient } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Réglages pilotables à distance depuis /admin : bannière d'annonce (texte affiché sur
// tout le site), mode maintenance (bloque le lancement de nouvelles parties avec un
// message), et deux interrupteurs de fonctionnalités (salons en ligne, mode Soirée) pour
// couper une fonctionnalité précise sans passer par le mode maintenance global. Stockés
// dans site_settings — lisibles par tous, modifiables uniquement ici (service_role,
// aucune policy d'écriture publique).

const ALLOWED_KEYS = new Set(["announcement", "maintenance", "online_rooms", "party_mode"]);

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const db = adminClient();
  const { data, error } = await db.from("site_settings").select("key, value, updated_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: Object.fromEntries((data ?? []).map((s) => [s.key, s.value])) });
}

export async function PUT(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json().catch(() => null)) as { key?: string; value?: unknown } | null;
  if (!body?.key || !ALLOWED_KEYS.has(body.key) || typeof body.value !== "object" || body.value === null) {
    return NextResponse.json({ error: "clé ou valeur invalide" }, { status: 400 });
  }

  const db = adminClient();
  const { error } = await db
    .from("site_settings")
    .upsert({ key: body.key, value: body.value, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
