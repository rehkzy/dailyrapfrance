import { NextRequest, NextResponse } from "next/server";
import { resolveArtist } from "@/lib/deezerArtist";
import { themeLeadArtists } from "@/lib/themeSources";

// Renvoie une photo d'artiste par thème (le premier artiste de chaque liste curée), pour
// habiller les pochettes de thème avec de vrais visages plutôt qu'un dégradé générique.
// Un seul appel groupé côté client plutôt que N petits appels.

// Overrides manuels — quand la photo Deezer n'est pas la bonne (artiste émergent, visuel
// daté...), on force une URL précise. Prioritaire sur la résolution automatique.
const PHOTO_OVERRIDES: Record<string, string> = {
  "artist-benef": "https://i.scdn.co/image/ab676161000051748be5cd6646bba914b0d11712",
};

async function fetchArtistPhoto(name: string): Promise<string | null> {
  const artist = await resolveArtist(name);
  return artist?.picture_medium || artist?.picture || null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const themesParam = searchParams.get("themes") ?? "";
  const themes = themesParam.split(",").filter((t) => themeLeadArtists(t));

  const entries = await Promise.all(
    themes.map(async (t) => {
      if (PHOTO_OVERRIDES[t]) {
        return [t, PHOTO_OVERRIDES[t]] as const;
      }
      const names = themeLeadArtists(t) ?? [];
      const photos = (await Promise.all(names.map(fetchArtistPhoto))).filter(Boolean);
      // Un thème à un seul artiste renvoie une chaîne (comportement historique) ; un thème
      // combiné (Marseille) renvoie un tableau — ThemeCover sait afficher les deux.
      return [t, photos.length > 1 ? photos : photos[0] ?? null] as const;
    })
  );

  return NextResponse.json({ photos: Object.fromEntries(entries) });
}
