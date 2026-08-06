import { NextResponse } from "next/server";

export const revalidate = 3600; // le morceau du jour ne change pas : cache 1h sans risque

/*
 * GET /api/jeux/tracklist — le morceau mystère du jour, identique pour tout le monde.
 *
 * Sélection déterministe : hash de la date (Europe/Paris) → index dans le chart rap
 * Deezer. Pas de table à maintenir, pas de cron : le même jour donne toujours le même
 * morceau, pour tous les joueurs, comme Wordle.
 *
 * Les indices sont renvoyés dans l'ordre où le client les dévoile (un par mauvaise
 * réponse). La réponse (title) part aussi au client — assumé : c'est un jeu gratuit
 * sans enjeu, pas la peine de complexifier avec une vérification serveur.
 */

const DEEZER_RAP_PLAYLIST_CHART = "https://api.deezer.com/chart/116/tracks?limit=80"; // 116 = genre Rap/Hip-Hop

function dayKeyParis(): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date()); // YYYY-MM-DD
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

type DeezerTrack = {
  id: number;
  title: string;
  duration: number;
  rank: number;
  preview: string;
  artist: { name: string };
  album: { title: string; cover_medium: string };
};

export async function GET() {
  try {
    const res = await fetch(DEEZER_RAP_PLAYLIST_CHART, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("deezer chart failed");
    const data = (await res.json()) as { data?: DeezerTrack[] };
    const pool = (data.data ?? []).filter((t) => t.preview);
    if (pool.length < 5) throw new Error("pool trop petit");

    const day = dayKeyParis();
    const track = pool[hashString(day) % pool.length];

    // Détail du morceau pour la date de sortie (pas dans le chart)
    let releaseYear: string | null = null;
    try {
      const det = await fetch(`https://api.deezer.com/track/${track.id}`, { next: { revalidate: 86400 } });
      if (det.ok) {
        const d = (await det.json()) as { release_date?: string };
        releaseYear = d.release_date ? d.release_date.slice(0, 4) : null;
      }
    } catch {
      // pas grave, l'indice année sera sauté
    }

    const minutes = Math.floor(track.duration / 60);
    const seconds = String(track.duration % 60).padStart(2, "0");

    // Indices dans l'ordre de dévoilement — du plus vague au plus précis
    const hints = [
      releaseYear ? `Sorti en ${releaseYear}` : `Durée : ${minutes}:${seconds}`,
      `Album : « ${track.album.title} »`,
      `Artiste : ${track.artist.name}`,
      `Le titre commence par « ${track.title.charAt(0).toUpperCase()} »`,
      `Le titre fait ${track.title.length} caractères`,
    ];

    return NextResponse.json({
      day,
      id: String(track.id),
      title: track.title,
      artist: track.artist.name,
      cover: track.album.cover_medium,
      preview: track.preview,
      hints,
    });
  } catch (e) {
    console.error("[jeux/tracklist]", e);
    return NextResponse.json({ error: "Impossible de charger le morceau du jour." }, { status: 500 });
  }
}
