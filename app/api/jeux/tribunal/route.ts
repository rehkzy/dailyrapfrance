import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
 * Tribunal du Rap — un duel par jour, votes uniques par joueur.
 *
 * GET  : renvoie le duel du jour (le crée automatiquement au premier passage de la
 *        journée, à partir de deux morceaux tirés du chart rap Deezer) + les totaux de
 *        votes + le vote du joueur connecté s'il existe.
 * POST : { choice: "a" | "b" } — enregistre le vote (contrainte d'unicité en base,
 *        un joueur ne vote qu'une fois par duel).
 */

function dayKeyParis(): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

type DeezerTrack = {
  id: number;
  title: string;
  artist: { name: string };
  album: { cover_medium: string };
};

async function ensureTodayDuel(supabase: Awaited<ReturnType<typeof createClient>>) {
  const day = dayKeyParis();
  const { data: existing } = await supabase.from("duels").select("*").eq("day", day).maybeSingle();
  if (existing) return existing;

  // Pas encore de duel aujourd'hui : on en crée un depuis le chart rap.
  const res = await fetch("https://api.deezer.com/chart/116/tracks?limit=50", {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("deezer chart failed");
  const data = (await res.json()) as { data?: DeezerTrack[] };
  const pool = data.data ?? [];
  if (pool.length < 2) throw new Error("pool trop petit");

  // Deux morceaux distincts, tirés de façon déterministe sur la date — si deux requêtes
  // arrivent en même temps, elles construisent le MÊME duel, et la contrainte unique
  // sur `day` fait qu'une seule insertion gagne (l'autre relit simplement).
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  const a = pool[h % pool.length];
  let bIndex = (h * 7 + 13) % pool.length;
  if (bIndex === h % pool.length) bIndex = (bIndex + 1) % pool.length;
  const b = pool[bIndex];

  const row = {
    day,
    a_id: String(a.id),
    a_title: a.title,
    a_artist: a.artist.name,
    a_cover: a.album.cover_medium,
    b_id: String(b.id),
    b_title: b.title,
    b_artist: b.artist.name,
    b_cover: b.album.cover_medium,
  };
  const { data: inserted, error } = await supabase.from("duels").insert(row).select().single();
  if (error) {
    // Conflit sur `day` (autre requête plus rapide) : on relit.
    const { data: again } = await supabase.from("duels").select("*").eq("day", day).single();
    return again;
  }
  return inserted;
}

export async function GET() {
  const supabase = await createClient();
  try {
    const duel = await ensureTodayDuel(supabase);
    if (!duel) throw new Error("duel introuvable");

    const { data: votes } = await supabase.from("duel_votes").select("choice,user_id").eq("duel_id", duel.id);
    const a = (votes ?? []).filter((v) => v.choice === "a").length;
    const b = (votes ?? []).filter((v) => v.choice === "b").length;

    const { data: { user } } = await supabase.auth.getUser();
    const myVote = user ? (votes ?? []).find((v) => v.user_id === user.id)?.choice ?? null : null;

    return NextResponse.json({ duel, votes: { a, b }, myVote, signedIn: !!user });
  } catch (e) {
    console.error("[jeux/tribunal]", e);
    return NextResponse.json({ error: "Impossible de charger le duel du jour." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi pour voter." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const choice = body?.choice === "a" || body?.choice === "b" ? body.choice : null;
  if (!choice) return NextResponse.json({ error: "Choix invalide." }, { status: 400 });

  const duel = await ensureTodayDuel(supabase);
  if (!duel) return NextResponse.json({ error: "Duel introuvable." }, { status: 500 });

  const { error } = await supabase.from("duel_votes").insert({ duel_id: duel.id, user_id: user.id, choice });
  if (error) {
    // Doublon = déjà voté (clé primaire duel_id+user_id) — pas une vraie erreur.
    return NextResponse.json({ ok: false, reason: "already_voted" });
  }
  return NextResponse.json({ ok: true });
}
