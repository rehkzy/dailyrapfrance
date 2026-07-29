import { NextResponse } from "next/server";
import { fetchTrackDetail, toGameTrack } from "@/lib/deezerTrack";

export const revalidate = 3600;

/*
 * "Devine du jour" — un seul morceau, LE MÊME pour tout le monde le même jour, façon
 * Heardle/Wordle : reconnaissance rapide, rituel quotidien, résultat partageable sans
 * spoiler la réponse.
 *
 * Détermination du morceau du jour : un index calculé à partir de la date (fuseau Paris)
 * dans une liste FIGÉE de titres ultra-connus — volontairement indépendant du pool
 * aléatoire du blind test classique. Deux raisons :
 *  1. Un Heardle a besoin de titres que presque tout le monde reconnaît (sinon la
 *     mécanique "de plus en plus d'indices" perd son sel) — pas n'importe quel morceau
 *     d'un thème de niche.
 *  2. Le calcul doit être 100% déterministe pour que deux joueurs le même jour, sur deux
 *     appareils différents, tombent EXACTEMENT sur le même morceau — un tirage aléatoire
 *     habituel (comme /api/blindtest/pool) ne garantit pas ça.
 *
 * Liste vérifiée un par un contre l'API Deezer le 29/07/2026 (bon artiste + preview
 * disponible) — leçon tirée d'un bug de curation similaire découvert le même jour sur le
 * thème "Imène elle give" : ne jamais faire confiance à une recherche floue par titre,
 * toujours vérifier via /track/{id} direct.
 */
const DAILY_POOL: number[] = [
  652380172, 479801712, // Ninho — La vie qu'on mène, Un Poco
  2654111972, 434591642, // Booba — Dolce Camara, Ridin'
  783257042, 783257002, // PNL — Menace, Hasta la vista
  569246062, // SCH — Ciel rouge
  410780162, 4013762661, // Jul — Parfum quartier, Le monde est à moi
  137260126, 698747302, // Nekfeu — Galatée, Dans l'univers
  4007826141, 135949706, // Kaaris — Huracan, Tchoin
  91045659, 73956352, // IAM — Je danse le Mia, Petit frère
  2459444615, 3340153351, // Werenoi — Tu connais, Piano
  1798370057, // Gazo — DIE
  3442901201, // Niska — Adriano
  3469521671, // Soolking — Tour du monde
  429974992, 2570360062, // Dadju — Reine, I love you
  3995047821, 576851242, // Aya Nakamura — Sexy Nana, Copines
  1544258312, 3637839332, // Orelsan — La Quête, Encore une fois
  2193152117, // Maes — Tmax 530
  4059400101, // Tiakola — Mélo Décalé
  870857, // Suprême NTM — Ma Benz
  5639255, // Sexion d'Assaut — Wati by Night
  122927588, // MHD — Afro Trap Pt. 3
  1684004267, // Josman — Intro
  2814600412, // Alonzo — Hasta la vista
  1374440512, // Soso Maness — Petrouchka
  667799802, // Koba LaD — RR 9.1
  62766452, // Youssoupha — On se connaît
  365936531, // Kery James — Banlieusards
];

function parisDateString(): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date()); // YYYY-MM-DD
}

function seedFromDate(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) {
    h = (h * 31 + date.charCodeAt(i)) >>> 0;
  }
  return h;
}

// GET /api/blindtest/daily-guess → { date, dayNumber, track }
export async function GET() {
  const date = parisDateString();
  const seed = seedFromDate(date);
  const index = seed % DAILY_POOL.length;
  const trackId = DAILY_POOL[index];

  const full = await fetchTrackDetail(trackId);
  if (!full || !full.preview) {
    return NextResponse.json({ error: "Titre du jour indisponible, réessaie dans un instant." }, { status: 503 });
  }

  // Numéro de jour depuis un point de départ fixe — juste pour l'affichage ("Devine #47"),
  // façon Wordle.
  const epoch = new Date("2026-07-29T00:00:00+02:00").getTime();
  const dayNumber = Math.max(1, Math.floor((Date.now() - epoch) / 86_400_000) + 1);

  return NextResponse.json({ date, dayNumber, track: toGameTrack(full) });
}
