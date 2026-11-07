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

export const THEME_CATEGORIES = ["Du moment", "Époques", "Styles", "Régions", "Artistes", "Classiques", "Gimmicks"] as const;

// Catalogue unique — utilisé à la fois par le wizard solo/local, le salon en ligne, les pages
// SEO (/blindtest/[slug]) et le défi de la semaine. Chaque id doit exister dans lib/themeSources.ts
// (sauf "mix" et "pop" qui sont calculés) pour que le pool sache d'où tirer les titres.
// Mis à jour le 25/10/2026 : classements 2026, Flammes 2026, NRJ Music Awards 2026.
export const THEME_OPTIONS: ThemeOption[] = [
  // --- Du moment
  { id: "pop", label: "Top 50", text: "Les sons les plus populaires du moment", Icon: Flame, category: "Du moment" },
  { id: "sorties", label: "Sorti cette semaine", text: "Les nouveautés rap FR des 15 derniers jours — ça change tout seul", Icon: Sparkles, category: "Du moment", keywords: "nouveautés sorties semaine nouveau son" },
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
  { id: "94", label: "Rappeurs du 94", text: "L2B, Bouss, Danyl, Sefyu, Rohff...", Icon: MapPin, category: "Régions", keywords: "val-de-marne" },
  { id: "77", label: "Rappeurs du 77", text: "Djadja & Dinaz, RK, Timal...", Icon: MapPin, category: "Régions", keywords: "seine-et-marne" },
  { id: "78", label: "Rappeurs du 78", text: "La Fouine...", Icon: MapPin, category: "Régions", keywords: "yvelines trappes" },
  { id: "idf", label: "Île-de-France", text: "Tout le rap francilien mélangé", Icon: MapPin, category: "Régions" },
  { id: "13", label: "Marseille (13)", text: "JUL, SCH, Alonzo, Lagui, Typhee, Zamdane...", Icon: MapPin, category: "Régions", keywords: "marseille" },
  { id: "69", label: "Lyon (69)", text: "Ashe 22, Sasso, Khali, Zeu, Lyonzon...", Icon: MapPin, category: "Régions", keywords: "lyon" },
  { id: "59", label: "Lille & le Nord (59)", text: "Gradur, Zkr, Bekar, BEN plg...", Icon: MapPin, category: "Régions", keywords: "lille roubaix nord" },
  { id: "31", label: "Toulouse (31)", text: "Bigflo & Oli, Samir Flynn...", Icon: MapPin, category: "Régions", keywords: "toulouse" },
  { id: "belgique", label: "Belgique", text: "Damso, Hamza, Green Montana, Frenetik, Caballero & JeanJass...", Icon: Globe, category: "Régions", keywords: "bruxelles belge" },
  { id: "suisse", label: "Suisse", text: "Al-Walid, Makala, Chien Bleu, Slimka, Di-Meh...", Icon: Globe, category: "Régions", keywords: "genève lausanne" },
  { id: "quebec", label: "Québec", text: "Loud, Koriass, Souldia, FouKi, Rowjay...", Icon: Globe, category: "Régions", keywords: "montréal canada" },
  { id: "antilles", label: "Antilles", text: "Meryl, Kalash, Bamby, Creamy G...", Icon: Globe, category: "Régions", keywords: "martinique guadeloupe shatta" },
  { id: "maghreb", label: "Maghreb", text: "ElGrandeToto, Soolking, Balti, Stormy, Maes, Didine Canon 16...", Icon: Globe, category: "Régions", keywords: "maroc algérie tunisie maghreb darija" },
  { id: "maroc", label: "Maroc", text: "ElGrandeToto, Stormy, Dizzy DROS, Don Bigg, Tagne, Maes, Lartiste...", Icon: Globe, category: "Régions", keywords: "maroc marocain casablanca rabat darija" },
  { id: "algerie", label: "Algérie", text: "Soolking, Didine Canon 16, Lotfi Double Kanon, Mister You, Lacrim, Rim'K...", Icon: Globe, category: "Régions", keywords: "algérie algérien alger oran" },
  { id: "tunisie", label: "Tunisie", text: "Balti, Samara, Kaso, Sanfara, A.L.A, Klay BBJ...", Icon: Globe, category: "Régions", keywords: "tunisie tunisien tunis" },

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
  { id: "artist-niro", label: "Blind Test Niro", text: "Que des sons de Niro", Icon: Mic2, category: "Artistes" },
  { id: "artist-elgrandetoto", label: "Blind Test ElGrandeToto", text: "Que des sons d'ElGrandeToto", Icon: Mic2, category: "Artistes", keywords: "maroc toto" },
  { id: "artist-stormy", label: "Blind Test Stormy", text: "Que des sons de Stormy", Icon: Mic2, category: "Artistes", keywords: "maroc" },
  { id: "artist-balti", label: "Blind Test Balti", text: "Que des sons de Balti", Icon: Mic2, category: "Artistes", keywords: "tunisie" },
  { id: "artist-soolking", label: "Blind Test Soolking", text: "Que des sons de Soolking", Icon: Mic2, category: "Artistes", keywords: "algérie" },
  { id: "artist-koba-lad", label: "Blind Test Koba LaD", text: "Que des sons de Koba LaD", Icon: Mic2, category: "Artistes", keywords: "91 évry trap" },
  { id: "artist-zola", label: "Blind Test Zola", text: "Que des sons de Zola", Icon: Mic2, category: "Artistes", keywords: "91 évry" },
  { id: "artist-leto", label: "Blind Test Leto", text: "Que des sons de Leto", Icon: Mic2, category: "Artistes", keywords: "93 sevran pineapple" },
  { id: "artist-dinos", label: "Blind Test Dinos", text: "Que des sons de Dinos", Icon: Mic2, category: "Artistes", keywords: "la courneuve" },
  { id: "artist-rim-k", label: "Blind Test Rim'K", text: "Que des sons de Rim'K", Icon: Mic2, category: "Artistes", keywords: "113 vitry" },
  { id: "artist-lacrim", label: "Blind Test Lacrim", text: "Que des sons de Lacrim", Icon: Mic2, category: "Artistes", keywords: "marseille" },
  { id: "artist-guy2bezbar", label: "Blind Test Guy2Bezbar", text: "Que des sons de Guy2Bezbar", Icon: Mic2, category: "Artistes", keywords: "75" },
  { id: "artist-fave", label: "Blind Test Favé", text: "Que des sons de Favé", Icon: Mic2, category: "Artistes", keywords: "nouvelle gen" },
  { id: "artist-luther", label: "Blind Test Luther", text: "Que des sons de Luther", Icon: Mic2, category: "Artistes", keywords: "nouvelle gen" },
  { id: "artist-zed", label: "Blind Test Zed", text: "Que des sons de Zed", Icon: Mic2, category: "Artistes", keywords: "wetin day" },
  { id: "artist-youssoupha", label: "Blind Test Youssoupha", text: "Que des sons de Youssoupha", Icon: Mic2, category: "Artistes", keywords: "conscient" },
  { id: "artist-kery-james", label: "Blind Test Kery James", text: "Que des sons de Kery James", Icon: Mic2, category: "Artistes", keywords: "conscient" },
  { id: "artist-sexion-d-assaut", label: "Blind Test Sexion d'Assaut", text: "Que des sons de Sexion d'Assaut", Icon: Mic2, category: "Artistes", keywords: "gims maître gims" },
  { id: "artist-lefa", label: "Blind Test Lefa", text: "Que des sons de Lefa", Icon: Mic2, category: "Artistes", keywords: "sexion" },
  { id: "artist-rohff", label: "Blind Test Rohff", text: "Que des sons de Rohff", Icon: Mic2, category: "Artistes", keywords: "vitry 94" },
  { id: "artist-sniper", label: "Blind Test Sniper", text: "Que des sons de Sniper", Icon: Mic2, category: "Artistes", keywords: "deuil-la-barre" },
  { id: "artist-iam", label: "Blind Test IAM", text: "Que des sons de IAM", Icon: Mic2, category: "Artistes", keywords: "marseille akhenaton" },
  { id: "artist-supreme-ntm", label: "Blind Test Suprême NTM", text: "Que des sons de Suprême NTM", Icon: Mic2, category: "Artistes", keywords: "ntm joeystarr kool shen" },
  { id: "artist-oxmo-puccino", label: "Blind Test Oxmo Puccino", text: "Que des sons de Oxmo Puccino", Icon: Mic2, category: "Artistes", keywords: "19e" },
  { id: "artist-disiz", label: "Blind Test Disiz", text: "Que des sons de Disiz", Icon: Mic2, category: "Artistes", keywords: "évry" },
  { id: "artist-hatik", label: "Blind Test Hatik", text: "Que des sons de Hatik", Icon: Mic2, category: "Artistes", keywords: "chaise pliante" },
  { id: "artist-bosh", label: "Blind Test Bosh", text: "Que des sons de Bosh", Icon: Mic2, category: "Artistes", keywords: "djomb" },
  { id: "artist-timal", label: "Blind Test Timal", text: "Que des sons de Timal", Icon: Mic2, category: "Artistes", keywords: "77" },
  { id: "artist-kalash-criminel", label: "Blind Test Kalash Criminel", text: "Que des sons de Kalash Criminel", Icon: Mic2, category: "Artistes", keywords: "93 sevran" },
  { id: "artist-gambi", label: "Blind Test Gambi", text: "Que des sons de Gambi", Icon: Mic2, category: "Artistes", keywords: "popopop" },
  { id: "artist-naza", label: "Blind Test Naza", text: "Que des sons de Naza", Icon: Mic2, category: "Artistes", keywords: "afro" },
  { id: "artist-dosseh", label: "Blind Test Dosseh", text: "Que des sons de Dosseh", Icon: Mic2, category: "Artistes", keywords: "orléans" },
  { id: "artist-kekra", label: "Blind Test Kekra", text: "Que des sons de Kekra", Icon: Mic2, category: "Artistes", keywords: "masqué" },
  { id: "artist-alpha-wann", label: "Blind Test Alpha Wann", text: "Que des sons de Alpha Wann", Icon: Mic2, category: "Artistes", keywords: "1995 boom bap" },
  { id: "artist-nemir", label: "Blind Test Nemir", text: "Que des sons de Nemir", Icon: Mic2, category: "Artistes", keywords: "perpignan" },
  { id: "artist-yvnnis", label: "Blind Test Yvnnis", text: "Que des sons de Yvnnis", Icon: Mic2, category: "Artistes", keywords: "nouvelle gen" },
  { id: "artist-zamdane", label: "Blind Test Zamdane", text: "Que des sons de Zamdane", Icon: Mic2, category: "Artistes", keywords: "marseille maroc" },
  { id: "artist-sadek", label: "Blind Test Sadek", text: "Que des sons de Sadek", Icon: Mic2, category: "Artistes", keywords: "93" },
  { id: "artist-keblack", label: "Blind Test KeBlack", text: "Que des sons de KeBlack", Icon: Mic2, category: "Artistes", keywords: "afro" },
  { id: "artist-franglish", label: "Blind Test Franglish", text: "Que des sons de Franglish", Icon: Mic2, category: "Artistes", keywords: "afro" },
  { id: "artist-jok-air", label: "Blind Test Jok'Air", text: "Que des sons de Jok'Air", Icon: Mic2, category: "Artistes", keywords: "mz" },
  { id: "artist-vegedream", label: "Blind Test Vegedream", text: "Que des sons de Vegedream", Icon: Mic2, category: "Artistes", keywords: "ramenez la coupe" },
  { id: "artist-seth-gueko", label: "Blind Test Seth Gueko", text: "Que des sons de Seth Gueko", Icon: Mic2, category: "Artistes", keywords: "barlou" },
  { id: "artist-jazzy-bazz", label: "Blind Test Jazzy Bazz", text: "Que des sons de Jazzy Bazz", Icon: Mic2, category: "Artistes", keywords: "l'entourage" },
  { id: "artist-luv-resval", label: "Blind Test Luv Resval", text: "Que des sons de Luv Resval", Icon: Mic2, category: "Artistes", keywords: "91" },
  { id: "artist-tayc", label: "Blind Test Tayc", text: "Que des sons de Tayc", Icon: Mic2, category: "Artistes", keywords: "afro r&b" },
  { id: "artist-mmz", label: "Blind Test MMZ", text: "Que des sons de MMZ", Icon: Mic2, category: "Artistes", keywords: "moha jones bulma genesis" },
  { id: "artist-sofiane", label: "Blind Test Sofiane", text: "Que des sons de Sofiane", Icon: Mic2, category: "Artistes", keywords: "fianso 93 blanc-mesnil" },
  { id: "artist-heuss-lenfoire", label: "Blind Test Heuss L'enfoiré", text: "Que des sons de Heuss L'enfoiré", Icon: Mic2, category: "Artistes", keywords: "93 aulnay" },
  { id: "artist-didine", label: "Blind Test Didine Canon 16", text: "Que des sons de Didine Canon 16", Icon: Mic2, category: "Artistes", keywords: "algérie" },
  { id: "artist-dizzy-dros", label: "Blind Test Dizzy DROS", text: "Que des sons de Dizzy DROS", Icon: Mic2, category: "Artistes", keywords: "maroc" },
  // --- Classiques : les morceaux qui ont fait l'artiste, sans les nouveautés (≥ 5 ans).
  { id: "classics-booba", label: "Classiques de Booba", text: "Les titres qui ont fait Booba — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son booba" },
  { id: "classics-rohff", label: "Classiques de Rohff", text: "Les titres qui ont fait Rohff — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son rohff" },
  { id: "classics-sexion-d-assaut", label: "Classiques de Sexion d'Assaut", text: "Les titres qui ont fait Sexion d'Assaut — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son sexion d'assaut" },
  { id: "classics-nekfeu", label: "Classiques de Nekfeu", text: "Les titres qui ont fait Nekfeu — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son nekfeu" },
  { id: "classics-pnl", label: "Classiques de PNL", text: "Les titres qui ont fait PNL — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son pnl" },
  { id: "classics-jul", label: "Classiques de Jul", text: "Les titres qui ont fait Jul — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son jul" },
  { id: "classics-ninho", label: "Classiques de Ninho", text: "Les titres qui ont fait Ninho — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son ninho" },
  { id: "classics-sch", label: "Classiques de SCH", text: "Les titres qui ont fait SCH — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son sch" },
  { id: "classics-damso", label: "Classiques de Damso", text: "Les titres qui ont fait Damso — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son damso" },
  { id: "classics-orelsan", label: "Classiques de Orelsan", text: "Les titres qui ont fait Orelsan — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son orelsan" },
  { id: "classics-iam", label: "Classiques de IAM", text: "Les titres qui ont fait IAM — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son iam" },
  { id: "classics-supreme-ntm", label: "Classiques de Suprême NTM", text: "Les titres qui ont fait Suprême NTM — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son suprême ntm" },
  { id: "classics-kaaris", label: "Classiques de Kaaris", text: "Les titres qui ont fait Kaaris — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son kaaris" },
  { id: "classics-niska", label: "Classiques de Niska", text: "Les titres qui ont fait Niska — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son niska" },
  { id: "classics-la-fouine", label: "Classiques de La Fouine", text: "Les titres qui ont fait La Fouine — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son la fouine" },
  { id: "classics-soprano", label: "Classiques de Soprano", text: "Les titres qui ont fait Soprano — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son soprano" },
  { id: "classics-gims", label: "Classiques de Gims", text: "Les titres qui ont fait Gims — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son gims" },
  { id: "classics-lacrim", label: "Classiques de Lacrim", text: "Les titres qui ont fait Lacrim — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son lacrim" },
  { id: "classics-vald", label: "Classiques de Vald", text: "Les titres qui ont fait Vald — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son vald" },
  { id: "classics-youssoupha", label: "Classiques de Youssoupha", text: "Les titres qui ont fait Youssoupha — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son youssoupha" },
  { id: "classics-kery-james", label: "Classiques de Kery James", text: "Les titres qui ont fait Kery James — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son kery james" },
  { id: "classics-oxmo-puccino", label: "Classiques de Oxmo Puccino", text: "Les titres qui ont fait Oxmo Puccino — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son oxmo puccino" },
  { id: "classics-sniper", label: "Classiques de Sniper", text: "Les titres qui ont fait Sniper — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son sniper" },
  { id: "classics-113", label: "Classiques de 113", text: "Les titres qui ont fait 113 — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son 113" },
  { id: "classics-sefyu", label: "Classiques de Sefyu", text: "Les titres qui ont fait Sefyu — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son sefyu" },
  { id: "classics-gradur", label: "Classiques de Gradur", text: "Les titres qui ont fait Gradur — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son gradur" },
  { id: "classics-alonzo", label: "Classiques de Alonzo", text: "Les titres qui ont fait Alonzo — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son alonzo" },
  { id: "classics-lomepal", label: "Classiques de Lomepal", text: "Les titres qui ont fait Lomepal — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son lomepal" },
  { id: "classics-bigflo-oli", label: "Classiques de Bigflo & Oli", text: "Les titres qui ont fait Bigflo & Oli — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son bigflo & oli" },
  { id: "classics-hamza", label: "Classiques de Hamza", text: "Les titres qui ont fait Hamza — que des sons d'il y a 5 ans ou plus", Icon: Mic2, category: "Classiques", keywords: "classique ancien vieux son hamza" },
  // --- Gimmicks : on entend l'ad-lib, on dit qui c'est. Clips maison (public/audio/gimmicks).
  { id: "gimmicks", label: "Gimmicks de rappeurs", text: "Un ad-lib, 4 noms : qui dit ça ? Kaaris, Ninho, Niska, SCH, Gazo…", Icon: Mic2, category: "Gimmicks", keywords: "adlib ad-lib gimmick voix" },
  { id: "memes", label: "Mèmes du rap", text: "Les extraits cultes : « Salut à tous, c'est Ninho »… qui parle ?", Icon: Mic2, category: "Gimmicks", keywords: "meme mème culte" },
];

// Mise en avant éditoriale — ces thèmes portent la flamme "tendance" dans les sélecteurs,
// en plus des thèmes les plus joués calculés depuis les vrais scores (/api/blindtest/trending).
export const FEATURED_THEME_IDS = ["hits-2026", "nouvelle-gen", "artist-rvfleuze", "artist-mauvais-djo", "viral"];

// Thèmes pour lesquels on va chercher une vraie photo d'artiste (pas les thèmes par époque,
// génériques par nature) — utilisé pour construire l'appel groupé à /api/blindtest/theme-art.
export const PHOTO_THEME_IDS = THEME_OPTIONS.filter((t) => t.category !== "Époques" && t.id !== "pop" && t.id !== "viral" && t.category !== "Gimmicks").map(
  (t) => t.id
);

// Défi de la semaine — un thème imposé, identique pour tout le monde, qui change chaque lundi à minuit. Calculé
// à partir de la date (pas de hasard, pas d'état serveur à synchroniser) : le même jour donne
// toujours le même thème pour tous les joueurs, et il change tout seul le lendemain.
// Les thèmes à pool très restreint (régions à un seul nom) sont exclus du tirage.
const DAILY_EXCLUDED = new Set(["mix", "78", "31", "lagui-sadek", "sorties", "gimmicks", "memes"]);
const DAILY_POOL = THEME_OPTIONS.filter((t) => !DAILY_EXCLUDED.has(t.id));

function weekIndexParis(): number {
  const today = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const t = new Date(`${today}T00:00:00Z`);
  const back = (t.getUTCDay() + 6) % 7;
  return Math.floor((t.getTime() - back * 86_400_000) / (7 * 86_400_000));
}

export function getDailyTheme(): ThemeOption {
  return getWeeklyThemeAt(0);
}

/** Thème du défi pour la semaine courante + offset (−1 = semaine passée, +1 = prochaine). */
export function getWeeklyThemeAt(offsetWeeks: number): ThemeOption {
  // Défi de la SEMAINE : même thème du lundi au dimanche (heure de Paris).
  const dayIndex = Math.floor(weekIndexParis()) + offsetWeeks;
  // Pas aléatoire mais "mélangé" : un pas premier par rapport à la taille du pool évite
  // d'enchaîner deux thèmes voisins dans la liste (deux artistes d'affilée, etc.).
  const step = 7;
  return DAILY_POOL[(((dayIndex * step) % DAILY_POOL.length) + DAILY_POOL.length) % DAILY_POOL.length];
}
