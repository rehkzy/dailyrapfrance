// Résolution d'artiste Deezer partagée par le pool de titres et les pochettes de thème.
//
// Le bug rapporté : `/search/artist?q=sadek&limit=1` renvoyait "Sadek (MAR)", un artiste
// marocain homonyme, plutôt que le rappeur français attendu par la liste curée. La recherche
// Deezer ne trie pas forcément par pertinence pour un nom d'artiste français précis — prendre
// le tout premier résultat est donc fragile dès qu'un homonyme existe (Sadek, mais
// potentiellement d'autres noms courts de la curation : Ali, RK, SCH, Vald...).
//
// Fix : on récupère plusieurs candidats, on garde ceux dont le nom correspond exactement
// (insensible à la casse) au nom recherché, puis parmi eux on choisit le plus populaire
// (nb_fan) — le rappeur français connu aura presque toujours plus de fans Deezer que
// l'homonyme obscur. S'il n'y a aucune correspondance exacte, on retombe sur le candidat le
// plus populaire tout court plutôt que sur le premier de la liste.

export type DeezerArtistLite = {
  id: number;
  name: string;
  nb_fan?: number;
  picture?: string;
  picture_medium?: string;
  picture_big?: string;
};

async function deezerFetch<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.deezer.com${path}`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Deezer ${path} → HTTP ${res.status}`);
  const json = await res.json();
  if (json?.error) throw new Error(`Deezer ${path} → ${json.error.message}`);
  return json;
}

const norm = (s: string) => s.toLowerCase().trim();

export async function resolveArtist(name: string): Promise<DeezerArtistLite | null> {
  try {
    const search = await deezerFetch<{ data?: DeezerArtistLite[] }>(
      `/search/artist?q=${encodeURIComponent(name)}&limit=10`
    );
    const candidates = search.data ?? [];
    if (candidates.length === 0) return null;

    const exact = candidates.filter((c) => norm(c.name) === norm(name));
    const pool = exact.length > 0 ? exact : candidates;

    return pool.reduce((best, c) => ((c.nb_fan ?? 0) > (best.nb_fan ?? 0) ? c : best), pool[0]);
  } catch {
    return null;
  }
}
