// Client Spotify Web API — flux "Client Credentials" (accès public en lecture seule,
// pas besoin qu'un utilisateur se connecte). Utilisé par le pipeline d'ingestion.
//
// IMPORTANT — limite honnête de l'API Spotify publique :
// Spotify NE fournit PAS les "auditeurs mensuels" via son API publique — cette donnée
// n'est visible que par l'artiste lui-même sur Spotify for Artists. Ce que l'API publique
// donne réellement : `followers.total` (abonnés) et `popularity` (score 0-100 propriétaire
// à Spotify). C'est ce qu'on affiche, honnêtement labellisé.

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET manquants dans les variables d'environnement.");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Échec d'authentification Spotify : ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

async function spotifyFetch(path: string) {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Spotify API ${path} → ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type SpotifyArtist = {
  id: string;
  name: string;
  followers: number;
  popularity: number;
  imageUrl: string | null;
  genres: string[];
};

export async function searchArtist(name: string): Promise<SpotifyArtist | null> {
  const data = await spotifyFetch(`/search?q=${encodeURIComponent(name)}&type=artist&market=FR&limit=1`);
  const item = data.artists?.items?.[0];
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    followers: item.followers?.total ?? 0,
    popularity: item.popularity ?? 0,
    imageUrl: item.images?.[0]?.url ?? null,
    genres: item.genres ?? [],
  };
}

export async function getArtistAlbums(spotifyArtistId: string, limit = 8) {
  const data = await spotifyFetch(
    `/artists/${spotifyArtistId}/albums?include_groups=album,single&market=FR&limit=${limit}`
  );
  return (data.items ?? []) as Array<{
    id: string;
    name: string;
    album_type: string;
    release_date: string;
    release_date_precision: string;
    images: { url: string }[];
  }>;
}
