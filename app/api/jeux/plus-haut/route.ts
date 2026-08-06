import { NextResponse } from "next/server";

export const revalidate = 3600;

/*
 * GET /api/jeux/plus-haut — renvoie ~60 morceaux du chart rap avec leur "rank" Deezer
 * (indicateur de popularité). Le client construit les paires et gère la partie ; le
 * rank part au client, assumé (jeu gratuit, pas d'enjeu — pas la peine d'une
 * vérification serveur pour chaque manche).
 */

type DeezerTrack = {
  id: number;
  title: string;
  rank: number;
  artist: { name: string };
  album: { cover_medium: string };
};

export async function GET() {
  try {
    const res = await fetch("https://api.deezer.com/chart/116/tracks?limit=80", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("deezer chart failed");
    const data = (await res.json()) as { data?: DeezerTrack[] };
    const tracks = (data.data ?? [])
      .filter((t) => t.rank > 0)
      .map((t) => ({
        id: String(t.id),
        title: t.title,
        artist: t.artist.name,
        cover: t.album.cover_medium,
        rank: t.rank,
      }));
    if (tracks.length < 10) throw new Error("pool trop petit");
    return NextResponse.json({ tracks });
  } catch (e) {
    console.error("[jeux/plus-haut]", e);
    return NextResponse.json({ error: "Impossible de charger les morceaux." }, { status: 500 });
  }
}
