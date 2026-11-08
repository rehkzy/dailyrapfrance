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
  kind: "mode" | "theme" | "guide";
  /** Guides et comparatifs : sections rédigées à la main. */
  sections?: { h2: string; p: string }[];
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
      "Joue au blind test rap français en solo, gratuitement et inscription en 10 secondes : défi de la semaine, série de jours, variantes Survie et Sprint, classement par thème. 80+ thèmes, extraits Deezer.",
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

/* ── Guides d'usage et comparatifs (longue traîne) ───────────────────────────────────────── */
function guide(slug: string, title: string, metaTitle: string, description: string, intro: string, sections: { h2: string; p: string }[], faq: { q: string; a: string }[], playHref = "/jouer?mode=solo", playLabel = "Jouer maintenant"): Landing {
  return { slug, kind: "guide", title, metaTitle, description, intro, sections, faq: [...faq, ...COMMON_FAQ], playHref, playLabel };
}

const HONNETE = "Comparatif rédigé par DailyRapFrance à partir des sites publics des deux services (novembre 2026). Les fonctionnalités évoluent : si quelque chose a changé, écris-nous.";

export const GUIDE_LANDINGS: Landing[] = [
  guide("sans-inscription", "Blind test rap gratuit sans inscription", "Blind Test Rap Gratuit Sans Inscription — Joue Tout de Suite | DailyRapFrance",
    "Un blind test rap français jouable immédiatement, sans compte : 5 manches en QCM pour découvrir. Le compte gratuit enlève la pub et ouvre le classement, les potes et les salons.",
    "Tu veux juste tester ? Lance une partie découverte : cinq extraits, trois propositions, aucun compte demandé. Si ça te plaît, un compte gratuit en dix secondes enlève la pub et débloque tout le reste.",
    [
      { h2: "Ce que tu peux faire sans compte", p: "Le mode découverte : une partie solo de cinq manches en QCM sur le thème de ton choix, avec une pub discrète. Les extraits sont les mêmes que pour les joueurs connectés, tirés de Deezer et renouvelés à chaque partie." },
      { h2: "Ce que le compte ajoute", p: "Zéro pub. Les parties longues (jusqu'à 20 manches), le mode difficile où tu écris la réponse, ton score au classement, la série quotidienne, les amis à défier, les salons privés à distance, la soirée sur la TV et la messagerie chiffrée entre amis. Le compte se crée avec Google ou un e-mail, rien d'autre n'est demandé." },
      { h2: "Pourquoi on demande un compte pour le multijoueur", p: "Un salon relie des personnes : il faut savoir qui est qui pour les scores, les revanches et les invitations. C'est aussi ce qui permet de garder ta progression d'un téléphone à l'autre." },
    ],
    [{ q: "Le mode découverte a-t-il une limite ?", a: "Tu peux relancer autant de parties découverte que tu veux. Elles font cinq manches, en QCM, et ne sont pas sauvegardées : c'est le compte qui garde l'historique." }]),

  guide("entre-amis-a-distance", "Blind test rap entre amis à distance", "Blind Test Rap Entre Amis à Distance — Salon Privé, Chacun chez Soi | DailyRapFrance",
    "Crée un salon privé, envoie le code ou le lien, et jouez au blind test rap français chacun sur son téléphone, en temps réel, avec chat, réactions et classement.",
    "Un pote à Marseille, un autre à Bruxelles, toi à Paris : un salon privé, un code à partager, et tout le monde joue la même partie en même temps. L'extrait démarre pour tous, le plus rapide marque le plus.",
    [
      { h2: "Comment ça marche", p: "Tu choisis le thème (un artiste, une époque, une région, ou tes propres morceaux), les réglages (nombre de manches, durée, QCM ou réponse écrite, gages), puis tu invites : directement dans la messagerie du jeu si ton pote a un compte, ou par lien WhatsApp, iMessage, Snap. Il arrive dans le lobby, appuie sur Prêt, et c'est parti." },
      { h2: "Pendant la partie", p: "Chat en direct avec réponses rapides, réactions emoji qui s'affichent chez tout le monde, score en temps réel, et les ad-libs des rappeurs qui réagissent à tes bonnes et mauvaises réponses. En 2v2, les scores d'équipe s'additionnent." },
      { h2: "Après", p: "Résultat partagé, revanche en un tap, et le jeu retient vos face-à-face : classement des rivaux, classement des duos, et une notification quand un pote bat ton score sur un thème." },
    ],
    [{ q: "Combien de joueurs dans un salon ?", a: "Autant que tu veux en pratique ; au-delà d'une dizaine, le mode soirée sur la TV est plus confortable. Les retardataires peuvent rejoindre en spectateurs." }, { q: "Faut-il que tout le monde ait un compte ?", a: "Oui pour les salons privés : c'est ce qui relie les joueurs entre eux. Il se crée en dix secondes avec Google." }],
    "/jouer?mode=online", "Créer un salon"),

  guide("soiree-anniversaire", "Blind test rap pour une soirée ou un anniversaire", "Blind Test Rap pour Soirée, Anniversaire, EVG — Sur la TV, Sans Appli | DailyRapFrance",
    "Anime une soirée, un anniversaire ou un EVG avec un blind test rap français : la TV diffuse, les téléphones répondent, gages pour le dernier. Gratuit, sans application.",
    "Pour une soirée, le téléphone qui tourne ne suffit plus. Branche un écran : le code et le QR code s'affichent en grand, chacun scanne et répond depuis son téléphone, le classement vit sur la TV, et le dernier tire un gage.",
    [
      { h2: "Le matériel", p: "Une TV ou un ordinateur avec un navigateur (ou un câble HDMI, ou Chromecast), une connexion internet, et les téléphones des invités. Aucune application : les invités scannent le QR code et choisissent un pseudo." },
      { h2: "Les réglages qui font une bonne soirée", p: "Dix à quinze manches par partie, le QCM pour que tout le monde participe, un thème large pour commencer (les années 2000, le Top 50, le mix) puis des thèmes pointus pour départager. Les gages, soft ou corsés, se tirent automatiquement pour le dernier." },
      { h2: "Les idées de thèmes", p: "Pour un anniversaire : l'année de naissance de la personne et les sons de son adolescence. Pour un EVG ou un EVJF : un blind test perso construit avec les morceaux qui racontent le couple. Pour une soirée mélangée : le mix toutes époques, puis les régions pour les fiertés locales." },
    ],
    [{ q: "Combien de personnes peuvent jouer en soirée ?", a: "Des dizaines : chaque téléphone est une manette, la TV fait l'affichage commun." }, { q: "Peut-on mettre ses propres morceaux ?", a: "Oui : le constructeur de blind test te laisse chercher les titres sur Deezer, les ordonner, puis lancer la soirée dessus." }],
    "/jouer?mode=party", "Lancer une soirée"),

  guide("vs-raplay", "DailyRapFrance ou Raplay : quel blind test rap choisir ?", "DailyRap vs Raplay — Comparatif des Blind Tests Rap Français (2026)", 
    "Deux blind tests dédiés au rap français. Modes, multijoueur, thèmes, gamification, communauté : ce que fait chacun, et pour qui.",
    "Raplay et DailyRapFrance sont les deux seuls blind tests entièrement consacrés au rap français. Ils ne misent pas sur la même chose : Raplay sur des mécaniques de jeu originales et une progression profonde, DailyRapFrance sur le social, le direct et un média derrière.",
    [
      { h2: "Ce que Raplay fait très bien", p: "Des modes qu'on ne trouve pas ailleurs : Inversé (le son à l'envers), Superposé (plusieurs titres mélangés), Évolutif (l'extrait s'allonge, les points baissent), un quotidien, et des Labels, des équipes persistantes avec leur classement. Une progression en disques du bronze au saphir et plus de cent pages thèmes et artistes." },
      { h2: "Ce que DailyRapFrance fait très bien", p: "Le jeu entre potes en direct : salons privés avec chat, réactions, spectateurs, 2v2, mode soirée sur la TV, matchmaking. Les ad-libs des rappeurs qui réagissent dans la partie et deux modes Gimmicks et Mèmes uniques. Une messagerie chiffrée entre amis, des notifications de revanche, des classements rivaux et duos. Et derrière, un média rap FR avec son actu, ses sorties et sa communauté TikTok et Instagram." },
      { h2: "Pour qui", p: "Tu joues surtout seul et tu aimes grinder une progression : Raplay. Tu joues avec tes potes, en soirée ou à distance, et tu veux un jeu qui vit avec l'actu rap : DailyRapFrance. Rien n'empêche de faire les deux." },
      { h2: "Honnêteté", p: HONNETE },
    ],
    [{ q: "Les deux sont-ils gratuits ?", a: "Oui. DailyRapFrance propose une partie découverte sans compte, avec pub, et zéro pub avec un compte gratuit." }]),

  guide("vs-blindtest-gg", "DailyRapFrance ou Blindtest.gg : lequel pour un blind test rap ?", "DailyRap vs Blindtest.gg — Comparatif Blind Test en Ligne (2026)",
    "Blindtest.gg est généraliste et multijoueur, DailyRapFrance est 100 % rap français. Ce que chacun propose, et lequel choisir selon ta soirée.",
    "Blindtest.gg est un blind test généraliste bilingue : parties publiques, salons privés, import de playlists Spotify et Deezer, et un mode films, séries et animés. DailyRapFrance ne fait qu'une chose : le rap français, à fond.",
    [
      { h2: "Ce que Blindtest.gg fait très bien", p: "Jouer sans inscription, coller un lien de playlist Spotify ou Deezer pour jouer dessus, des parties publiques ouvertes à tous, des thèmes variés (années 80, rock, Disney) et le mode œuvres (films, séries, jeux vidéo). Niveaux, trophées et avatars pour ceux qui créent un compte." },
      { h2: "Ce que DailyRapFrance fait très bien", p: "Plus de quatre-vingts thèmes rap FR pensés par des gens qui écoutent du rap : par artiste, par époque, par région, par style, les classiques, les sorties de la semaine. Un constructeur de blind test avec les titres Deezer. Le mode soirée sur la TV, les salons entre potes avec chat, spectateurs et 2v2, les gimmicks de rappeurs en jeu, et un média derrière." },
      { h2: "Pour qui", p: "Une soirée aux goûts mélangés, ou un blind test films : Blindtest.gg. Une soirée rap, un défi entre potes qui écoutent du rap FR, ou l'envie de suivre l'actu en jouant : DailyRapFrance." },
      { h2: "Honnêteté", p: HONNETE },
    ],
    [{ q: "Peut-on jouer sans compte sur DailyRapFrance ?", a: "Oui, en mode découverte : cinq manches en QCM, avec pub. Le compte gratuit enlève la pub et ouvre le multijoueur." }]),

  guide("vs-zik", "DailyRapFrance ou ZIK : quel blind test pour ta soirée ?", "DailyRap vs ZIK — Comparatif Blind Test TV et En Ligne (2026)",
    "ZIK et DailyRapFrance proposent tous deux le mode TV + téléphones et le jeu en ligne. Thèmes, classement, quotidien, communauté : le comparatif.",
    "ZIK est un blind test généraliste très bien pensé pour la soirée : la TV diffuse, les téléphones répondent, sans compte pour les invités. DailyRapFrance reprend la même idée, en la réservant au rap français et en y ajoutant tout le social.",
    [
      { h2: "Ce que ZIK fait très bien", p: "Le mode salon TV sans compte pour les invités, un classement ELO en mode réponse libre, le Zikle (un son par jour en six essais), un défi communautaire hebdomadaire, des succès, l'import de playlists Deezer publiques, et des rooms thématiques variées (rap FR, chanson française, techno, Disney)." },
      { h2: "Ce que DailyRapFrance fait très bien", p: "La profondeur rap FR : un thème par artiste, par département, par style, par époque, les classiques, les sorties, les gimmicks. Les salons privés entre potes avec chat, réactions, spectateurs et 2v2, la messagerie chiffrée, les notifications de revanche, les classements rivaux et duos, et l'actu rap intégrée." },
      { h2: "Pour qui", p: "Une soirée tous styles avec des invités qui ne veulent rien installer : ZIK est excellent. Une soirée ou une bande de potes rap FR, avec l'envie de se défier dans la durée : DailyRapFrance." },
      { h2: "Honnêteté", p: HONNETE },
    ],
    [{ q: "DailyRapFrance a-t-il un mode TV ?", a: "Oui, le mode soirée : code et QR code sur la TV, réponses sur les téléphones, classement en direct, gage pour le dernier." }]),
];

export const ALL_LANDINGS: Landing[] = [...MODE_LANDINGS, ...THEME_LANDINGS, ...GUIDE_LANDINGS];

export function findLanding(slug: string): Landing | undefined {
  return ALL_LANDINGS.find((l) => l.slug === slug);
}
