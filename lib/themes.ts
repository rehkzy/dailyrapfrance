import {
  BookOpen, Clock, Cloud, Flame, MapPin, Mic2, Music, Shuffle, Skull, Swords, Zap, Sparkles, Disc3, Users, Globe, PenLine, Waves, Star, TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type ThemeOption = {
  id: string;
  label: string;
  text: string;
  Icon: LucideIcon;
  category: (typeof THEME_CATEGORIES)[number];
  /** Mots-clés pour la recherche dans le sélecteur (noms d'artistes, synonymes). */
  keywords?: string;
};

export const THEME_CATEGORIES = ["Du moment", "Époques", "Styles", "Régions", "Artistes"] as const;

// Catalogue unique — utilisé à la fois par le wizard solo/local, le salon en ligne, les pages
// SEO (/blindtest/[slug]) et le défi du jour. Chaque id doit exister dans lib/themeSources.ts
// (sauf "mix" et "pop" qui sont calculés) pour que le pool sache d'où tirer les titres.
// Mis à jour le 25/10/2026 : classements 2026, Flammes 2026, NRJ Music Awards 2026.
export const THEME_OPTIONS: ThemeOption[] = [
  // --- Du moment
  { id: "pop", label: "Top 50", text: "Les sons les plus populaires du moment", Icon: Flame, category: "Du moment" },
  { id: "hits-2026", label: "Les stars de 2026", text: "Jul, Gims, Ninho, Werenoi, PLK, SDM, Tiakola...", Icon: Star, category: "Du moment", keywords: "2026 top streams" },
  { id: "viral", label: "Viral TikTok", text: "Les sons rap FR qui tournent en boucle", Icon: TrendingUp, category: "Du moment", keywords: "tiktok viral tendance" },
  { id: "nouvelle-gen", label: "Nouvelle génération", text: "La Rvfleuze, Mauvais Djo, Lagui, Jolagreen23, R2...", Icon: Sparkles, category: "Du moment", keywords: "révélation 2026 nouvelle école" },
  { id: "albums-2026", label: "Albums 2026", text: "M.I.L.S IV, Grand Garçon, Numéro d'écrou, Karma...", Icon: Disc3, category: "Du moment", keywords: "sorties 2026" },
  { id: "duos", label: "Duos & groupes", text: "Bigflo & Oli, Djadja & Dinaz, PNL, L2B, 13 Organisé...", Icon: Users, category: "Du moment", keywords: "groupe duo collectif" },

  // --- Époques
  { id: "recent", label: "2020s / Récent", text: "Ce qui tourne en ce moment", Icon: Clock, category: "Époques" },
  { id: "2010s", label: "Les 2010s", text: "PNL, Nekfeu, Damso, Lomepal, Vald, SCH...", Icon: Clock, category: "Époques" },
  { id: "2000s", label: "Les 2000s", text: "Booba, Rohff, Diam's, Sniper, Sefyu, Sinik...", Icon: Clock, category: "Époques" },
  { id: "90s", label: "Les 90s", text: "IAM, NTM, MC Solaar, Fonky Family, Lunatic...", Icon: Clock, category: "Époques" },
  { id: "mix", label: "Mix", text: "Toutes les époques mélangées", Icon: Shuffle, category: "Époques" },

  // --- Styles
  { id: "drill", label: "Drill FR", text: "Ziak, La Rvfleuze, Gazo, Freeze Corleone, Kerchak...", Icon: Swords, category: "Styles" },
  { id: "trap", label: "Trap FR", text: "Kaaris, SDM, Niska, Koba LaD, Zkr...", Icon: Zap, category: "Styles" },
  { id: "melodique", label: "Rap mélodique", text: "PNL, Hamza, Tiakola, Bouss, Jul...", Icon: Mic2, category: "Styles", keywords: "mélo autotune" },
  { id: "afro", label: "Afro & rap", text: "Tiakola, Himra, KeBlack, Franglish, Soolking, Danyl...", Icon: Globe, category: "Styles", keywords: "afrobeats afro-trap" },
  { id: "jersey", label: "Jersey club", text: "Kerchak, Favé, Sto, ThaHomey...", Icon: Waves, category: "Styles", keywords: "jersey drill club" },
  { id: "nouvelle-pop", label: "Nouvelle pop", text: "Theodora, Rsko, Franglish, KeBlack, Aya Nakamura...", Icon: Sparkles, category: "Styles", keywords: "pop urbaine" },
  { id: "cloud", label: "Cloud rap", text: "Suikoden, Josman, Lomepal...", Icon: Cloud, category: "Styles" },
  { id: "hardcore", label: "Rap hardcore", text: "Kaaris, Kalash Criminel, Alkpote, Rohff...", Icon: Skull, category: "Styles" },
  { id: "boombap", label: "Boom bap / Old school", text: "IAM, NTM, Oxmo Puccino, Kery James...", Icon: Music, category: "Styles" },
  { id: "plume", label: "Rap à plume", text: "Scylla, Furax Barbarossa, Nekfeu, Alpha Wann, Absolem...", Icon: PenLine, category: "Styles", keywords: "lyrics technique" },
  { id: "conscient", label: "Rap conscient", text: "Kery James, Médine, Youssoupha, Bigflo & Oli...", Icon: BookOpen, category: "Styles" },
  { id: "imene-elle-give", label: "Imène elle give", text: "Dadju, Tiakola, Jul, Oboy...", Icon: Music, category: "Styles", keywords: "love festif" },
  { id: "lagui-sadek", label: "Lagui & Sadek", text: "Que des sons de ces deux-là", Icon: Mic2, category: "Styles" },

  // --- Régions
  { id: "75", label: "Paris intra-muros", text: "PLK, La Rvfleuze, La Mano 1.9, Guy2Bezbar, Nekfeu...", Icon: MapPin, category: "Régions", keywords: "paris 75" },
  { id: "93", label: "Rappeurs du 93", text: "Kaaris, Vald, Maes, Werenoi, Kalash Criminel...", Icon: MapPin, category: "Régions", keywords: "seine-saint-denis" },
  { id: "91", label: "Rappeurs du 91", text: "PNL, Niska, Koba LaD...", Icon: MapPin, category: "Régions", keywords: "essonne" },
  { id: "92", label: "Rappeurs du 92", text: "Booba, SDM, Jolagreen23, Benash...", Icon: MapPin, category: "Régions", keywords: "hauts-de-seine" },
  { id: "94", label: "Rappeurs du 94", text: "L2B, Danyl, Sefyu, Rohff, Mafia K'1 Fry...", Icon: MapPin, category: "Régions", keywords: "val-de-marne" },
  { id: "77", label: "Rappeurs du 77", text: "Djadja & Dinaz, RK, Timal...", Icon: MapPin, category: "Régions", keywords: "seine-et-marne" },
  { id: "78", label: "Rappeurs du 78", text: "La Fouine...", Icon: MapPin, category: "Régions", keywords: "yvelines trappes" },
  { id: "idf", label: "Île-de-France", text: "Tout le rap francilien mélangé", Icon: MapPin, category: "Régions" },
  { id: "13", label: "Marseille (13)", text: "JUL, SCH, Alonzo, Lagui, Typhee, Zamdane...", Icon: MapPin, category: "Régions", keywords: "marseille" },
  { id: "69", label: "Lyon (69)", text: "Bouss, Khali, Zeu, Lyonzon...", Icon: MapPin, category: "Régions", keywords: "lyon" },
  { id: "59", label: "Lille & le Nord (59)", text: "Gradur, Zkr, Bekar, BEN plg...", Icon: MapPin, category: "Régions", keywords: "lille roubaix nord" },
  { id: "31", label: "Toulouse (31)", text: "Bigflo & Oli, Samir Flynn...", Icon: MapPin, category: "Régions", keywords: "toulouse" },
  { id: "belgique", label: "Belgique", text: "Damso, Hamza, Green Montana, Frenetik, Caballero & JeanJass...", Icon: Globe, category: "Régions", keywords: "bruxelles belge" },
  { id: "suisse", label: "Suisse", text: "Al-Walid, Makala, Chien Bleu, Slimka, Di-Meh...", Icon: Globe, category: "Régions", keywords: "genève lausanne" },
  { id: "quebec", label: "Québec", text: "Loud, Koriass, Souldia, FouKi, Rowjay...", Icon: Globe, category: "Régions", keywords: "montréal canada" },
  { id: "antilles", label: "Antilles", text: "Meryl, Kalash, Bamby, Creamy G...", Icon: Globe, category: "Régions", keywords: "martinique guadeloupe shatta" },

  // --- Artistes
  { id: "artist-jul", label: "Blind Test JUL", text: "Que des sons de JUL", Icon: Mic2, category: "Artistes" },
  { id: "artist-ninho", label: "Blind Test Ninho", text: "Que des sons de Ninho", Icon: Mic2, category: "Artistes" },
  { id: "artist-gims", label: "Blind Test Gims", text: "Que des sons de Gims", Icon: Mic2, category: "Artistes" },
  { id: "artist-werenoi", label: "Blind Test Werenoi", text: "Que des sons de Werenoi", Icon: Mic2, category: "Artistes" },
  { id: "artist-plk", label: "Blind Test PLK", text: "Que des sons de PLK", Icon: Mic2, category: "Artistes" },
  { id: "artist-sdm", label: "Blind Test SDM", text: "Que des sons de SDM", Icon: Mic2, category: "Artistes" },
  { id: "artist-rvfleuze", label: "Blind Test La Rvfleuze", text: "Que des sons de La Rvfleuze", Icon: Mic2, category: "Artistes" },
  { id: "artist-damso", label: "Blind Test Damso", text: "Que des sons de Damso", Icon: Mic2, category: "Artistes" },
  { id: "artist-tiakola", label: "Blind Test Tiakola", text: "Que des sons de Tiakola", Icon: Mic2, category: "Artistes" },
  { id: "artist-hamza", label: "Blind Test Hamza", text: "Que des sons de Hamza", Icon: Mic2, category: "Artistes" },
  { id: "artist-gazo", label: "Blind Test Gazo", text: "Que des sons de Gazo", Icon: Mic2, category: "Artistes" },
  { id: "artist-booba", label: "Blind Test Booba", text: "Que des sons de Booba", Icon: Mic2, category: "Artistes" },
  { id: "artist-pnl", label: "Blind Test PNL", text: "Que des sons de PNL", Icon: Mic2, category: "Artistes" },
  { id: "artist-sch", label: "Blind Test SCH", text: "Que des sons de SCH", Icon: Mic2, category: "Artistes" },
  { id: "artist-nekfeu", label: "Blind Test Nekfeu", text: "Que des sons de Nekfeu", Icon: Mic2, category: "Artistes" },
  { id: "artist-aya", label: "Blind Test Aya Nakamura", text: "Que des sons d'Aya Nakamura", Icon: Mic2, category: "Artistes" },
  { id: "artist-lagui", label: "Blind Test Lagui", text: "En Croix, Mandat de dépôt...", Icon: Mic2, category: "Artistes" },
  { id: "artist-mauvais-djo", label: "Blind Test Mauvais Djo", text: "Pilé, Maladie, Charger...", Icon: Mic2, category: "Artistes" },
  { id: "artist-jolagreen23", label: "Blind Test Jolagreen23", text: "23 jours plus tard, 99+XP...", Icon: Mic2, category: "Artistes" },
  { id: "artist-l2b", label: "Blind Test L2B", text: "Nés pour briller, Tour du monde...", Icon: Mic2, category: "Artistes" },
  { id: "artist-theodora", label: "Blind Test Theodora", text: "MEGA BBL, Fashion Designa, Melodrama...", Icon: Mic2, category: "Artistes" },
  { id: "artist-orelsan", label: "Blind Test Orelsan", text: "Que des sons d'Orelsan", Icon: Mic2, category: "Artistes" },
  { id: "artist-bigflo-oli", label: "Blind Test Bigflo & Oli", text: "Karma, Coup de vieux...", Icon: Mic2, category: "Artistes" },
  { id: "artist-alonzo", label: "Blind Test Alonzo", text: "Drakkar, Longue Vie à Nous...", Icon: Mic2, category: "Artistes" },
  { id: "artist-la-fouine", label: "Blind Test La Fouine", text: "Capitale du Crime Radio...", Icon: Mic2, category: "Artistes" },
  { id: "artist-gradur", label: "Blind Test Gradur", text: "Décennie, Opps, Bolide...", Icon: Mic2, category: "Artistes" },
  { id: "artist-kaaris", label: "Blind Test Kaaris", text: "Byakugan, Zoo, Or Noir...", Icon: Mic2, category: "Artistes" },
  { id: "artist-josman", label: "Blind Test Josman", text: "Dom Perignon Crying, L'EAU...", Icon: Mic2, category: "Artistes" },
  { id: "artist-freeze", label: "Blind Test Freeze Corleone", text: "Que des sons de Freeze Corleone", Icon: Mic2, category: "Artistes" },
  { id: "artist-ziak", label: "Blind Test Ziak", text: "Monsieur Loyal, Akimbo...", Icon: Mic2, category: "Artistes" },
  { id: "artist-laylow", label: "Blind Test Laylow", text: "Trinity, L'Étrange Histoire de Mr. Anderson...", Icon: Mic2, category: "Artistes" },
  { id: "artist-lomepal", label: "Blind Test Lomepal", text: "Que des sons de Lomepal", Icon: Mic2, category: "Artistes" },
  { id: "artist-vald", label: "Blind Test Vald", text: "Que des sons de Vald", Icon: Mic2, category: "Artistes" },
  { id: "artist-niska", label: "Blind Test Niska", text: "Que des sons de Niska", Icon: Mic2, category: "Artistes" },
  { id: "artist-zkr", label: "Blind Test Zkr", text: "La Méthode K...", Icon: Mic2, category: "Artistes" },
  { id: "artist-soprano", label: "Blind Test Soprano", text: "Que des sons de Soprano", Icon: Mic2, category: "Artistes" },
  { id: "artist-dadju", label: "Blind Test Dadju", text: "Que des sons de Dadju", Icon: Mic2, category: "Artistes" },
  { id: "artist-badara", label: "Blind Test Badara", text: "Que des sons de Badara — Nouvelle École", Icon: Mic2, category: "Artistes" },
  { id: "artist-benef", label: "Blind Test Benef", text: "Mafia Italienne, Le Temps, IA...", Icon: Mic2, category: "Artistes" },
  { id: "artist-djadja-dinaz", label: "Blind Test Djadja & Dinaz", text: "Que des sons du duo Djadja & Dinaz", Icon: Mic2, category: "Artistes" },
  { id: "artist-bouss", label: "Blind Test Bouss", text: "Que des sons de Bouss", Icon: Mic2, category: "Artistes" },
  { id: "artist-maes", label: "Blind Test Maes", text: "Que des sons de Maes", Icon: Mic2, category: "Artistes" },
  { id: "artist-algerino", label: "Blind Test L'Algérino", text: "Que des sons de L'Algérino", Icon: Mic2, category: "Artistes" },
];

// Mise en avant éditoriale — ces thèmes portent la flamme "tendance" dans les sélecteurs,
// en plus des thèmes les plus joués calculés depuis les vrais scores (/api/blindtest/trending).
export const FEATURED_THEME_IDS = ["hits-2026", "nouvelle-gen", "artist-rvfleuze", "artist-mauvais-djo", "viral"];

// Thèmes pour lesquels on va chercher une vraie photo d'artiste (pas les thèmes par époque,
// génériques par nature) — utilisé pour construire l'appel groupé à /api/blindtest/theme-art.
export const PHOTO_THEME_IDS = THEME_OPTIONS.filter((t) => t.category !== "Époques" && t.id !== "pop" && t.id !== "viral").map(
  (t) => t.id
);

// Défi du jour — un thème imposé, identique pour tout le monde, qui change à minuit. Calculé
// à partir de la date (pas de hasard, pas d'état serveur à synchroniser) : le même jour donne
// toujours le même thème pour tous les joueurs, et il change tout seul le lendemain.
// Les thèmes à pool très restreint (régions à un seul nom) sont exclus du tirage.
const DAILY_EXCLUDED = new Set(["mix", "78", "31", "lagui-sadek"]);
const DAILY_POOL = THEME_OPTIONS.filter((t) => !DAILY_EXCLUDED.has(t.id));

export function getDailyTheme(): ThemeOption {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  // Pas aléatoire mais "mélangé" : un pas premier par rapport à la taille du pool évite
  // d'enchaîner deux thèmes voisins dans la liste (deux artistes d'affilée, etc.).
  const step = 7;
  return DAILY_POOL[(dayIndex * step) % DAILY_POOL.length];
}
