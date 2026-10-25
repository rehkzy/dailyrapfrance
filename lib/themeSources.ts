/*
 * Sources Deezer de chaque thème — LA référence partagée par :
 *   - app/api/blindtest/pool/route.ts   (le pool de titres)
 *   - app/api/blindtest/theme-art/route.ts (la photo de couverture : 1er ou 2 premiers noms)
 *   - lib/themes.ts (le catalogue affiché) doit avoir une entrée par id présent ici.
 *
 * Deux façons de sourcer :
 *   - par ARTISTES (top Deezer de chaque nom, complété par les albums si trop court) — pour
 *     les thèmes "scène", "génération", "région", "artiste unique" ;
 *   - par PLAYLISTS Deezer (éditoriales) — pour les styles qui sont une propriété des
 *     morceaux (drill, trap) et les tops du moment.
 *
 * Curation mise à jour le 25/10/2026 d'après les classements 2026 (Spotify France, SNEP,
 * Flammes 2026, NRJ Music Awards 2026) et la presse spécialisée. Les noms sont en minuscules
 * telles que recherchées via /search/artist (la résolution choisit l'homonyme le plus suivi).
 */

export const THEME_PLAYLISTS: Record<string, number[]> = {
  // Époques — playlists éditoriales Deezer "Rapstars"
  "90s": [1182010551],
  "2000s": [4676814864],
  "2010s": [5175061384],
  recent: [9563400362],
  // Styles sourcés par playlists (le style est une propriété des morceaux)
  drill: [3110361646, 8059169502],
  trap: [14055911981, 11116884244],
  // Du moment — "Rap Français Viral 2026 / sons TikTok"
  viral: [7764652862],
};
export const ALL_DECADE_PLAYLISTS = [1182010551, 4676814864, 5175061384, 9563400362];

export const THEME_ARTISTS: Record<string, string[]> = {
  // --- Du moment -------------------------------------------------------------------------
  // Les 12 artistes les plus streamés de 2026 (Spotify France, juillet 2026 + Wrapped 2025)
  "hits-2026": ["jul", "gims", "ninho", "werenoi", "plk", "sdm", "damso", "tiakola", "hamza", "l2b", "gazo", "la rvfleuze"],
  // Nouvelle génération 2025-2026 (révélations Flammes / NRJ, n°1 2026)
  "nouvelle-gen": ["la rvfleuze", "mauvais djo", "lagui", "jolagreen23", "r2", "nono la grinta", "rnboi", "l2b", "typhee", "zed", "bilouki", "la mano 1.9", "theodora"],
  // Albums 2026 — les sorties marquantes de l'année
  "albums-2026": ["ninho", "plk", "la rvfleuze", "bigflo & oli", "gradur", "lagui", "jul", "alonzo", "la fouine", "kaaris", "ziak", "booba", "zkr", "makala"],
  // Duos & groupes
  duos: ["bigflo & oli", "djadja & dinaz", "pnl", "l2b", "triangle des bermudes", "caballero & jeanjass", "13 organisé", "scylla", "furax barbarossa"],

  // --- Styles ----------------------------------------------------------------------------
  // "suikoden" / "le wombat" retirés : introuvables sur Deezer, la résolution retombait sur un homonyme hors-sujet.
  cloud: ["josman", "fixpen sill", "lomepal", "laylow", "so la lune", "hamza"],
  hardcore: ["kaaris", "kalash criminel", "alkpote", "seth gueko", "rohff"],
  boombap: ["iam", "suprême ntm", "oxmo puccino", "kery james"],
  melodique: ["pnl", "hamza", "tiakola", "so la lune", "bouss", "jul"],
  conscient: ["kery james", "médine", "youssoupha", "bigflo & oli", "disiz"],
  jersey: ["kerchak", "favé", "sto", "thahomey"],
  afro: ["tiakola", "himra", "keblack", "franglish", "soolking", "danyl", "aya nakamura"],
  "nouvelle-pop": ["theodora", "rsko", "franglish", "keblack", "aya nakamura", "disiz"],
  plume: ["scylla", "furax barbarossa", "absolem", "grems", "aketo", "nekfeu", "alpha wann"],
  "lagui-sadek": ["lagui", "sadek"],

  // --- Régions ---------------------------------------------------------------------------
  "93": ["kaaris", "mac tyer", "vald", "kalash criminel", "maes", "diddi trix", "werenoi"],
  "91": ["pnl", "niska", "koba lad", "ol kainry"],
  "92": ["booba", "ali", "sdm", "benash", "jolagreen23"],
  "77": ["djadja & dinaz", "rk", "timal", "houdi"],
  "78": ["la fouine"],
  "75": ["plk", "la rvfleuze", "la mano 1.9", "guy2bezbar", "nekfeu", "alpha wann", "r2"],
  "94": ["l2b", "danyl", "sefyu", "rohff", "mafia k'1 fry"],
  "13": ["jul", "sch", "soprano", "alonzo", "naps", "soso maness", "akhenaton", "shurik'n", "lagui", "typhee", "zamdane", "kofs", "elams"],
  "69": ["bouss", "khali", "zeu", "lyonzon"],
  "59": ["gradur", "zkr", "bekar", "ben plg"],
  "31": ["bigflo & oli", "samir flynn"],
  belgique: ["damso", "hamza", "green montana", "frenetik", "caballero & jeanjass", "roméo elvis", "isha", "limsa d'aulnay"],
  suisse: ["al-walid", "makala", "chien bleu", "slimka", "varnish la piscine", "di-meh"],
  quebec: ["loud", "koriass", "souldia", "fouki", "rowjay", "mike shabb"],
  antilles: ["meryl", "kalash", "bamby", "creamy g", "kalash criminel"],

  // --- Artistes (un seul) ----------------------------------------------------------------
  "artist-aya": ["aya nakamura"],
  "artist-ninho": ["ninho"],
  "artist-booba": ["booba"],
  "artist-pnl": ["pnl"],
  "artist-sch": ["sch"],
  "artist-jul": ["jul"],
  "artist-nekfeu": ["nekfeu"],
  "artist-badara": ["badara"],
  "artist-werenoi": ["werenoi"],
  "artist-benef": ["benef"],
  "artist-djadja-dinaz": ["djadja & dinaz"],
  "artist-bouss": ["bouss"],
  "artist-maes": ["maes"],
  "artist-algerino": ["l'algerino"],
  "artist-rvfleuze": ["la rvfleuze"],
  "artist-gims": ["gims"],
  "artist-plk": ["plk"],
  "artist-sdm": ["sdm"],
  "artist-damso": ["damso"],
  "artist-tiakola": ["tiakola"],
  "artist-hamza": ["hamza"],
  "artist-gazo": ["gazo"],
  "artist-lagui": ["lagui"],
  "artist-l2b": ["l2b"],
  "artist-orelsan": ["orelsan"],
  "artist-bigflo-oli": ["bigflo & oli"],
  "artist-alonzo": ["alonzo"],
  "artist-la-fouine": ["la fouine"],
  "artist-gradur": ["gradur"],
  "artist-kaaris": ["kaaris"],
  "artist-josman": ["josman"],
  "artist-theodora": ["theodora"],
  "artist-freeze": ["freeze corleone"],
  "artist-ziak": ["ziak"],
  "artist-laylow": ["laylow"],
  "artist-lomepal": ["lomepal"],
  "artist-vald": ["vald"],
  "artist-niska": ["niska"],
  "artist-mauvais-djo": ["mauvais djo"],
  "artist-jolagreen23": ["jolagreen23"],
  "artist-zkr": ["zkr"],
  "artist-soprano": ["soprano"],
  "artist-dadju": ["dadju"],
};

// Thèmes dont les titres sont figés (IDs vérifiés) — voir pool/route.ts.
export const FIXED_TRACK_THEME_IDS = ["imene-elle-give", "artist-benef"];

// Visage(s) de couverture — le ou les deux premiers noms de la liste, sauf exceptions.
export const THEME_LEAD_OVERRIDES: Record<string, string[]> = {
  "13": ["jul", "sch"],
  "imene-elle-give": ["dadju"],
  "hits-2026": ["jul", "ninho"],
  "nouvelle-gen": ["la rvfleuze", "mauvais djo"],
  belgique: ["damso", "hamza"],
  "nouvelle-pop": ["theodora", "rsko"],
};

export function themeLeadArtists(id: string): string[] | null {
  if (THEME_LEAD_OVERRIDES[id]) return THEME_LEAD_OVERRIDES[id];
  const list = THEME_ARTISTS[id];
  if (!list) return null;
  return list.slice(0, 1);
}
