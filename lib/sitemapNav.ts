import { Trophy, Users, Gift, Calendar, Mic2, Sparkles, LayoutGrid, Settings, Newspaper, Info, Tv, Play, Clapperboard, Smartphone, Globe, type LucideIcon } from "lucide-react";

/*
 * Plan du site en trois pôles — la seule source pour le menu desktop, le tiroir mobile,
 * le hub /jouer, l'espace perso et le footer. Une page ajoutée ici est atteignable partout.
 *  · Jouer      : le jeu et tout ce qui tourne autour (défi, classement, thèmes, communauté)
 *  · Mon espace : ce qui appartient à la personne (profil, amis, parrainage, mes blind tests)
 *  · Média      : DailyRapFrance en tant que média (actu, à propos)
 */
export type NavLink = { href: string; label: string; sub?: string; Icon: LucideIcon; tag?: string };

export const PLAY_LINKS: NavLink[] = [
  { href: "/jouer?mode=solo", label: "Solo", sub: "Score sauvegardé, 80 thèmes", Icon: Play },
  { href: "/jouer?mode=local", label: "Entre potes", sub: "Un téléphone, un buzzer", Icon: Smartphone },
  { href: "/jouer?mode=online", label: "En ligne", sub: "Un code, chacun chez soi", Icon: Globe },
  { href: "/jouer?mode=party", label: "Soirée TV", sub: "La télé + les téléphones", Icon: Tv },
  { href: "/jouer?mode=clips", label: "Devine le clip", sub: "Le clip plein écran", Icon: Clapperboard },
  { href: "/creer", label: "Créer mon blind test", sub: "Mes morceaux, mon lien", Icon: Sparkles, tag: "Nouveau" },
];

export const EXPLORE_LINKS: NavLink[] = [
  { href: "/blindtest/defi", label: "Défi de la semaine", sub: "Même thème pour tous, jusqu'à dimanche", Icon: Calendar },
  { href: "/blindtest/classement", label: "Classement", sub: "Par thème et par variante", Icon: Trophy },
  { href: "/blindtest", label: "Tous les thèmes", sub: "Époques, styles, villes, artistes", Icon: LayoutGrid },
  { href: "/blindtests", label: "Blind tests des joueurs", sub: "Créés par la communauté", Icon: Users },
  { href: "/artistes", label: "Top sons par artiste", sub: "Les 10 titres à connaître", Icon: Mic2 },
];

export const SPACE_LINKS: NavLink[] = [
  { href: "/amis", label: "Amis", sub: "Ajouter, suivre, défier", Icon: Users },
  { href: "/parrainage", label: "Parrainage", sub: "2 places pour Kaaris", Icon: Gift },
  { href: "/creer#mine-title", label: "Mes blind tests", sub: "Rejouer, renvoyer le lien", Icon: Sparkles },
  { href: "/parametres", label: "Réglages", sub: "Pseudo, avatar, compte", Icon: Settings },
];

export const MEDIA_LINKS: NavLink[] = [
  { href: "/actu", label: "Actu & tendances", sub: "Sons du moment, sorties, articles", Icon: Newspaper },
  { href: "/a-propos", label: "À propos", sub: "Le média, depuis 2020", Icon: Info },
];
