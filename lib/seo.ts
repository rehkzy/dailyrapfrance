import { THEME_OPTIONS, type ThemeOption } from "@/lib/themes";

/*
 * Pages d'atterrissage SEO / GEO du blind test — une URL stable et descriptive par façon de
 * jouer et par thème, pour que « blind test rap 93 », « blind test rap entre amis en ligne »
 * ou « quiz rap français gratuit » mènent directement à une page qui répond et qui lance le
 * jeu en un tap. Les moteurs génératifs (ChatGPT, Perplexity, AI Overviews) citent plus
 * volontiers une page qui énonce clairement ce qu'elle est, pour qui, à quel prix, et où.
 */

export const SITE = "https://dailyrapfrance.best";

export type Landing = {
  slug: string;
  kind: "mode" | "theme";
  title: string; // H1
  metaTitle: string;
  description: string;
  intro: string;
  playHref: string;
  playLabel: string;
  faq: { q: string; a: string }[];
  theme?: ThemeOption;
};

const COMMON_FAQ: { q: string; a: string }[] = [
  {
    q: "Le blind test rap français est-il gratuit ?",
    a: "Oui, entièrement gratuit, inscription en 10 secondes : tu ouvres dailyrapfrance.best et tu joues. Un compte (gratuit aussi) sert seulement à sauvegarder tes scores, apparaître dans le classement et créer des salons en ligne.",
  },
  {
    q: "Faut-il installer une application ?",
    a: "Non. Le blind test se joue dans le navigateur, sur téléphone, tablette, ordinateur ou TV, en France, en Belgique, en Suisse, au Québec et partout ailleurs. Tu peux l'ajouter à ton écran d'accueil pour le lancer comme une app ; une version App Store et Google Play arrive.",
  },
  {
    q: "D'où viennent les extraits ?",
    a: "Les extraits de 30 secondes sont fournis par Deezer et renouvelés à chaque partie : deux parties sur le même thème n'ont jamais la même liste.",
  },
];

export const MODE_LANDINGS: Landing[] = [
  {
    slug: "solo",
    kind: "mode",
    title: "Blind test rap français en solo",
    metaTitle: "Blind Test Rap Français Solo — Gratuit, Défi de la Semaine et Classement | DailyRapFrance",
    description:
      "Joue au blind test rap français en solo, gratuitement et inscription en 10 secondes : défi de la semaine, série de jours, variantes Survie et Sprint, classement par thème. 40+ thèmes, extraits Deezer.",
    intro:
      "Cinq minutes dans le métro ou une heure sur le canapé : le mode solo te propose un extrait, un chrono, et trois questions — qui chante, quel titre, qui est en feat. Chaque jour, un défi commun à tous les joueurs change à minuit ; ta série de jours grandit tant que tu reviens.",
    playHref: "/jouer?mode=solo",
    playLabel: "Jouer en solo",
    faq: [
      { q: "Comment fonctionne le défi de la semaine ?", a: "Un thème est tiré pour tout le monde et change chaque lundi à minuit (heure de Paris). Tu peux le rejouer autant de fois que tu veux ; ton meilleur score de la semaine et ta série de jours consécutifs sont conservés sur ton appareil, et dans ton profil si tu es connecté." },
      { q: "Qu'est-ce que les variantes Survie et Sprint ?", a: "Survie : la partie s'arrête au premier extrait entièrement raté, le score c'est la distance. Sprint : 20 extraits de 8 secondes, sans joker, que de l'instinct. Chaque variante a son propre classement." },
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "entre-amis",
    kind: "mode",
    title: "Blind test rap français entre amis, sur un seul téléphone",
    metaTitle: "Blind Test Rap Entre Amis — Sur le Même Écran, avec Buzzer | DailyRapFrance",
    description:
      "Un blind test rap français à jouer entre potes sur un seul téléphone : jusqu'à 8 joueurs, un buzzer, les pseudos de chacun, des jokers. Gratuit, compte en 10 secondes, sans appli à installer.",
    intro:
      "Un seul téléphone passe de main en main : l'extrait démarre, le premier qui reconnaît le son buzze et répond. Bonne réponse, les points sont à lui ; mauvaise réponse, les autres reprennent la main. Jusqu'à huit joueurs, et une configuration que tu peux enregistrer pour la relancer la prochaine fois avec les mêmes pseudos.",
    playHref: "/jouer?mode=local",
    playLabel: "Lancer une partie entre potes",
    faq: [
      { q: "Combien de joueurs peuvent jouer sur un téléphone ?", a: "De 2 à 8 joueurs sur le même écran. Chacun a son nom, ses points et ses jokers d'écoute." },
      { q: "Peut-on rejouer la même configuration ?", a: "Oui : à la fin de la partie, touche « Enregistrer cette config pour mes soirées ». Elle apparaît ensuite sur l'accueil, prête à relancer, et tu peux en copier le lien pour l'envoyer dans le groupe." },
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "en-ligne",
    kind: "mode",
    title: "Blind test rap français en ligne, à distance avec un code",
    metaTitle: "Blind Test Rap en Ligne à Distance — Salon Privé avec Code | DailyRapFrance",
    description:
      "Crée un salon privé, partage le code, chacun joue depuis son téléphone où qu'il soit. Le blind test rap français multijoueur en ligne, gratuit, pour jouer avec des amis à distance.",
    intro:
      "Tu crées un salon, tu envoies le code ou le lien, et chacun rejoint depuis son propre téléphone — à Paris, Bruxelles, Genève ou Montréal. Tout le monde entend le même extrait au même moment ; tous ceux qui trouvent marquent, les plus rapides prennent un bonus.",
    playHref: "/jouer?mode=online",
    playLabel: "Créer un salon en ligne",
    faq: [
      { q: "Faut-il un compte pour jouer en ligne ?", a: "Le salon en ligne demande un compte gratuit (Google ou e-mail), c'est lui qui relie les joueurs entre eux. Le solo et le mode entre amis sur un seul téléphone se jouent sans compte." },
      { q: "Comment rejoindre un salon ?", a: "Ouvre le lien reçu, ou va sur dailyrapfrance.best/jouer, choisis « Salon en ligne » et entre le code à 5 lettres." },
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "soiree",
    kind: "mode",
    title: "Blind test rap français en soirée : la TV comme écran, les téléphones comme manettes",
    metaTitle: "Blind Test Rap pour Soirée — Écran TV, Téléphones en Manette, Gages | DailyRapFrance",
    description:
      "Le jeu de soirée rap français : l'écran partagé s'affiche sur la TV avec un QR code, chacun répond depuis son téléphone, le dernier du classement tire un gage. 2 à 8 joueurs, gratuit.",
    intro:
      "Branche la télé ou un ordinateur, ouvre l'écran partagé : un code à 5 lettres et un QR code s'affichent en grand. Tout le monde scanne, choisit un pseudo, et la soirée démarre — l'extrait sur la TV, les réponses sur les téléphones, le classement en direct, et un gage pour le dernier.",
    playHref: "/jouer?mode=party",
    playLabel: "Lancer une soirée",
    faq: [
      { q: "De quoi a-t-on besoin pour une soirée blind test ?", a: "D'un écran connecté à internet (TV avec navigateur, ordinateur branché en HDMI ou Chromecast) et des téléphones des joueurs. Aucune application à installer : tout passe par le navigateur." },
      { q: "Comment marchent les gages ?", a: "Active les gages dans les réglages du salon (soft ou corsés). À la fin de chaque partie, le dernier du classement tire un gage affiché sur la TV." },
      ...COMMON_FAQ,
    ],
  },
];

export function themeSlug(t: ThemeOption): string {
  return t.id.startsWith("artist-") ? t.id.slice("artist-".length) : t.id;
}

export function themeLanding(t: ThemeOption): Landing {
  const isArtist = t.category === "Artistes";
  const subject = isArtist ? t.label.replace(/^Blind Test /i, "") : t.label;
  const title = isArtist ? `Blind test ${subject}` : `Blind test rap français : ${subject}`;
  return {
    slug: themeSlug(t),
    kind: "theme",
    theme: t,
    title,
    metaTitle: `${title} — Gratuit, en Ligne, Compte en 10 Secondes | DailyRapFrance`,
    description: `${title} : ${t.text}. Joue gratuitement en solo, entre amis sur un téléphone, à distance avec un code ou en soirée sur la TV. Extraits Deezer, nouveaux à chaque partie.`,
    intro: isArtist
      ? `Que des sons de ${subject}. Reconnais le titre le plus vite possible — et le featuring s'il y en a un — sur des extraits tirés de toute la discographie, renouvelés à chaque partie.`
      : `${t.text}. Reconnais l'artiste, le titre et le featuring sur des extraits de 30 secondes, en solo pour le classement ou à plusieurs pour la soirée.`,
    playHref: `/jouer?mode=solo&theme=${t.id}`,
    playLabel: `Jouer : ${subject}`,
    faq: [
      { q: `Comment jouer au ${title.toLowerCase()} ?`, a: `Ouvre dailyrapfrance.best, choisis le thème « ${t.label} », lance la partie. Un extrait démarre, tu réponds en touchant la bonne proposition (mode facile) ou en écrivant la réponse (mode difficile). Titre et artiste rapportent un point chacun, un featuring deux points, la rapidité un bonus.` },
      ...COMMON_FAQ,
    ],
  };
}

export const THEME_LANDINGS: Landing[] = THEME_OPTIONS.filter((t) => t.id !== "mix").map(themeLanding);
export const ALL_LANDINGS: Landing[] = [...MODE_LANDINGS, ...THEME_LANDINGS];

export function findLanding(slug: string): Landing | undefined {
  return ALL_LANDINGS.find((l) => l.slug === slug);
}
