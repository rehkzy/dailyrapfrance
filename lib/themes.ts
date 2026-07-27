import { Clock, Cloud, Flame, MapPin, Mic2, Shuffle, type LucideIcon } from "lucide-react";

export type ThemeOption = {
  id: string;
  label: string;
  text: string;
  Icon: LucideIcon;
  category: (typeof THEME_CATEGORIES)[number];
};

export const THEME_CATEGORIES = ["Top 50", "Époques", "Styles", "Régions", "Artistes"] as const;

// Catalogue unique — utilisé à la fois par le wizard solo/local et par le salon en ligne,
// pour que le choix de thème soit rigoureusement la même expérience (mêmes pochettes, même
// tri par catégorie) quel que soit le mode de jeu.
export const THEME_OPTIONS: ThemeOption[] = [
  { id: "pop", label: "Top 50", text: "Les sons les plus populaires du moment", Icon: Flame, category: "Top 50" },
  { id: "recent", label: "2020s / Récent", text: "Ce qui tourne en ce moment", Icon: Clock, category: "Époques" },
  { id: "2010s", label: "Les 2010s", text: "L'âge d'or du son cloud", Icon: Clock, category: "Époques" },
  { id: "2000s", label: "Les 2000s", text: "Le rap FR grand public", Icon: Clock, category: "Époques" },
  { id: "90s", label: "Les 90s", text: "Racines, âge d'or du rap FR", Icon: Clock, category: "Époques" },
  { id: "mix", label: "Mix", text: "Toutes les époques mélangées", Icon: Shuffle, category: "Époques" },
  { id: "cloud", label: "Cloud rap", text: "Suikoden, Josman, Lomepal...", Icon: Cloud, category: "Styles" },
  { id: "lagui-sadek", label: "Lagui & Sadek", text: "Que des sons de ces deux-là", Icon: Mic2, category: "Styles" },
  { id: "93", label: "Rappeurs du 93", text: "Kaaris, Vald, Maes, Kalash Criminel...", Icon: MapPin, category: "Régions" },
  { id: "91", label: "Rappeurs du 91", text: "PNL, Niska, Koba LaD...", Icon: MapPin, category: "Régions" },
  { id: "92", label: "Rappeurs du 92", text: "Booba, SDM, Benash...", Icon: MapPin, category: "Régions" },
  { id: "77", label: "Rappeurs du 77", text: "Djadja & Dinaz, RK, Timal...", Icon: MapPin, category: "Régions" },
  { id: "78", label: "Rappeurs du 78", text: "La Fouine...", Icon: MapPin, category: "Régions" },
  { id: "13", label: "Marseille (13)", text: "JUL, SCH, Soprano, Alonzo...", Icon: MapPin, category: "Régions" },
  { id: "59", label: "Rappeurs du 59", text: "Gradur...", Icon: MapPin, category: "Régions" },
  { id: "idf", label: "Île-de-France", text: "Tout le rap francilien mélangé", Icon: MapPin, category: "Régions" },
  { id: "artist-ninho", label: "Blind Test Ninho", text: "Que des sons de Ninho", Icon: Mic2, category: "Artistes" },
  { id: "artist-booba", label: "Blind Test Booba", text: "Que des sons de Booba", Icon: Mic2, category: "Artistes" },
  { id: "artist-pnl", label: "Blind Test PNL", text: "Que des sons de PNL", Icon: Mic2, category: "Artistes" },
  { id: "artist-sch", label: "Blind Test SCH", text: "Que des sons de SCH", Icon: Mic2, category: "Artistes" },
  { id: "artist-jul", label: "Blind Test JUL", text: "Que des sons de JUL", Icon: Mic2, category: "Artistes" },
  { id: "artist-nekfeu", label: "Blind Test Nekfeu", text: "Que des sons de Nekfeu", Icon: Mic2, category: "Artistes" },
  { id: "artist-badara", label: "Blind Test Badara", text: "Que des sons de Badara — Nouvelle École", Icon: Mic2, category: "Artistes" },
];

// Thèmes pour lesquels on va chercher une vraie photo d'artiste (pas les thèmes par époque,
// génériques par nature) — utilisé pour construire l'appel groupé à /api/blindtest/theme-art.
export const PHOTO_THEME_IDS = THEME_OPTIONS.filter((t) => t.category !== "Époques" && t.id !== "pop").map(
  (t) => t.id
);

// Défi du jour — un thème imposé, identique pour tout le monde, qui change à minuit. Calculé
// à partir de la date (pas de hasard, pas d'état serveur à synchroniser) : le même jour donne
// toujours le même thème pour tous les joueurs, et il change tout seul le lendemain. Sert de
// raison de revenir jouer chaque jour plutôt qu'un "Mix" toujours identique.
const DAILY_POOL = THEME_OPTIONS.filter((t) => t.id !== "mix");

export function getDailyTheme(): ThemeOption {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return DAILY_POOL[dayIndex % DAILY_POOL.length];
}
