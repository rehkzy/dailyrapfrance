/*
 * Les API renvoient des vignettes (Deezer picture_medium = 250 px, Spotify « 5174 » = 320 px) :
 * nettes en tuile, floues en plein écran. Les deux CDN servent la même image dans d'autres
 * tailles à partir de la même URL — on réécrit au lieu de refaire un appel.
 *   Deezer  : …/artist/<hash>/250x250-000000-80-0-0.jpg → 1000x1000 (max servi)
 *   Spotify : ab67616100005174<id> (320) → ab6761610000e5eb<id> (640)
 */
export type ArtworkSize = 250 | 500 | 1000;

export function artworkAt(url: string, size: ArtworkSize): string {
  if (!url) return url;
  if (/dzcdn\.net\/images\//.test(url)) return url.replace(/\/\d+x\d+(-[^/]*\.(?:jpg|png|webp))$/i, `/${size}x${size}$1`);
  if (/i\.scdn\.co\/image\//.test(url)) {
    if (size >= 500) return url.replace("ab67616100005174", "ab6761610000e5eb").replace("ab67616d00001e02", "ab67616d0000b273");
    return url;
  }
  return url;
}
