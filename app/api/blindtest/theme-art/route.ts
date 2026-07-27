import { NextRequest, NextResponse } from "next/server";

// Renvoie une photo d'artiste par thème (le premier artiste de chaque liste curée), pour
// habiller les pochettes de thème avec de vrais visages plutôt qu'un dégradé générique.
// Un seul appel groupé côté client plutôt que N petits appels.

// Doit rester synchronisé avec les listes de app/api/blindtest/pool/route.ts.
const THEME_LEAD_ARTIST: Record<string, string> = {
  cloud: "suikoden",
  "lagui-sadek": "sadek",
  "93": "kaaris",
  "91": "pnl",
  "92": "booba",
  "77": "rk",
  "78": "la fouine",
  "13": "jul",
  "59": "gradur",
  idf: "pnl",
  "artist-ninho": "ninho",
  "artist-booba": "booba",
  "artist-pnl": "pnl",
  "artist-sch": "sch",
  "artist-jul": "jul",
  "artist-nekfeu": "nekfeu",
};

async function deezerFetch(path: string) {
  const res = await fetch(`https://api.deezer.com${path}`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Deezer ${path} → HTTP ${res.status}`);
  return res.json();
}

async function fetchArtistPhoto(name: string): Promise<string | null> {
  try {
    const search = await deezerFetch(`/search/artist?q=${encodeURIComponent(name)}&limit=1`);
    const artist = search.data?.[0];
    return artist?.picture_medium || artist?.picture || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const themesParam = searchParams.get("themes") ?? "";
  const themes = themesParam.split(",").filter((t) => THEME_LEAD_ARTIST[t]);

  const entries = await Promise.all(
    themes.map(async (t) => [t, await fetchArtistPhoto(THEME_LEAD_ARTIST[t])] as const)
  );

  return NextResponse.json({ photos: Object.fromEntries(entries) });
}
