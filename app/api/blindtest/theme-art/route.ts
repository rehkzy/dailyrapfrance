import { NextRequest, NextResponse } from "next/server";
import { resolveArtist } from "@/lib/deezerArtist";

// Renvoie une photo d'artiste par thème (le premier artiste de chaque liste curée), pour
// habiller les pochettes de thème avec de vrais visages plutôt qu'un dégradé générique.
// Un seul appel groupé côté client plutôt que N petits appels.

// Doit rester synchronisé avec les listes de app/api/blindtest/pool/route.ts.
const THEME_LEAD_ARTISTS: Record<string, string[]> = {
  cloud: ["suikoden"],
  "lagui-sadek": ["sadek"],
  "93": ["kaaris"],
  "91": ["pnl"],
  "92": ["booba"],
  "77": ["rk"],
  "78": ["la fouine"],
  "13": ["jul", "sch"], // Marseille — deux visages plutôt qu'un, JUL et SCH sont tous deux emblématiques
  "59": ["gradur"],
  idf: ["pnl"],
  "artist-ninho": ["ninho"],
  "artist-booba": ["booba"],
  "artist-pnl": ["pnl"],
  "artist-sch": ["sch"],
  "artist-jul": ["jul"],
  "artist-nekfeu": ["nekfeu"],
  "artist-badara": ["badara"],
  "artist-werenoi": ["werenoi"],
  "artist-benef": ["benef"],
};

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
  const themes = themesParam.split(",").filter((t) => THEME_LEAD_ARTISTS[t]);

  const entries = await Promise.all(
    themes.map(async (t) => {
      if (PHOTO_OVERRIDES[t]) {
        return [t, PHOTO_OVERRIDES[t]] as const;
      }
      const names = THEME_LEAD_ARTISTS[t];
      const photos = (await Promise.all(names.map(fetchArtistPhoto))).filter(Boolean);
      // Un thème à un seul artiste renvoie une chaîne (comportement historique) ; un thème
      // combiné (Marseille) renvoie un tableau — ThemeCover sait afficher les deux.
      return [t, photos.length > 1 ? photos : photos[0] ?? null] as const;
    })
  );

  return NextResponse.json({ photos: Object.fromEntries(entries) });
}
