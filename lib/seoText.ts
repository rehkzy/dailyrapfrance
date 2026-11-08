import type { Landing } from "@/lib/seo";
import { THEME_ARTISTS } from "@/lib/themeSources";

/*
 * Texte unique par page thème : les artistes réels du thème, des formulations tirées au sort de
 * façon stable (même page = même texte), des conseils propres à la catégorie. Fini le gabarit
 * identique sur 80 pages, que Google lit comme du contenu dupliqué.
 */
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function pick<T>(arr: T[], seed: number, salt: number): T { return arr[(seed + salt * 7919) % arr.length]; }
function cap(s: string): string { return s.split(" ").map((w) => (w.length > 2 || /^[a-z]\d/.test(w) ? w[0].toUpperCase() + w.slice(1) : w)).join(" ").replace(/\bPlk\b/, "PLK").replace(/\bSch\b/, "SCH").replace(/\bSdm\b/, "SDM").replace(/\bPnl\b/, "PNL").replace(/\bNtm\b/, "NTM").replace(/\bIam\b/, "IAM").replace(/\bMmz\b/, "MMZ").replace(/\bL2b\b/, "L2B").replace(/\bRk\b/, "RK").replace(/\bJul\b/, "Jul"); }
function list(names: string[]): string { const n = names.map(cap); return n.length <= 1 ? n.join("") : `${n.slice(0, -1).join(", ")} et ${n[n.length - 1]}`; }

export function landingBody(l: Landing): { h2: string; p: string }[] {
  if (l.kind === "guide") return l.sections ?? [];
  if (l.kind !== "theme" || !l.theme) return [];
  const t = l.theme;
  const seed = hash(t.id);
  const artists = (THEME_ARTISTS[t.id] ?? []).slice();
  const isArtist = t.category === "Artistes";
  const subject = isArtist ? t.label.replace(/^Blind Test /i, "") : t.label;
  const out: { h2: string; p: string }[] = [];

  if (isArtist) {
    const openers = [
      `Un blind test ${subject}, c'est tout sauf un quiz de fan : les extraits sont tirés de la discographie entière, les classiques comme les titres d'album que seuls les vrais ont usés.`,
      `Tu penses connaître ${subject} par cœur ? Ce blind test pioche partout, pas seulement dans les hits, et c'est là que les points se font.`,
      `Ici, que du ${subject}. Trente secondes d'extrait, le titre à retrouver le plus vite possible, et un featuring à nommer quand il y en a un.`,
    ];
    const tips = [
      `Astuce : les premières secondes d'un son de ${subject} disent souvent tout. Le beat, l'ad-lib, la façon d'attaquer le couplet : écoute avant de lire les propositions.`,
      `Le mode difficile (écrire le titre) rapporte plus et pardonne les fautes d'orthographe légères. Le mode facile propose trois titres, dont deux faux mais crédibles, tirés de la même discographie.`,
      `Les featurings comptent double : quand ${subject} invite quelqu'un, le nom de l'invité vaut autant que le titre.`,
    ];
    const social = [
      `Le classement de ce thème est séparé : ton meilleur score sur ${subject} se compare à ceux des autres joueurs, et à ceux de tes potes.`,
      `À plusieurs, c'est le meilleur terrain : un salon privé sur ${subject}, chacun sur son téléphone, et on voit tout de suite qui a vraiment écouté les albums.`,
      `Chaque partie renouvelle la liste : deux blind tests ${subject} d'affilée ne tombent pas sur les mêmes sons.`,
    ];
    out.push({ h2: `Comment se passe un blind test ${subject}`, p: pick(openers, seed, 1) });
    out.push({ h2: "Pour marquer des points", p: pick(tips, seed, 2) });
    out.push({ h2: "Seul ou entre potes", p: pick(social, seed, 3) });
    return out;
  }

  const sample = artists.slice(0, 7);
  const whoLine = sample.length >= 3 ? `Au programme, entre autres : ${list(sample)}.` : `Au programme : ${t.text}.`;
  const byCat: Record<string, { open: string[]; mid: string[] }> = {
    "Régions": {
      open: [
        `Le rap français s'écoute par territoire, et ce blind test en est la preuve : ${subject}, c'est un son, un flow, des références que les autres départements n'ont pas. ${whoLine}`,
        `Chaque coin de France a sa signature. Ce thème rassemble les rappeurs de ${subject}, des pionniers aux têtes d'affiche d'aujourd'hui. ${whoLine}`,
      ],
      mid: [
        `Les extraits tournent entre les artistes à chaque manche : tu n'enchaînes jamais trois sons du même rappeur, et la partie suivante repart sur une autre sélection.`,
        `On a équilibré la sélection pour que les gros noms ne cannibalisent pas tout : les artistes moins exposés de ${subject} apparaissent autant que les stars.`,
      ],
    },
    "Époques": {
      open: [
        `Un voyage dans le temps en trente secondes par manche : ${subject}, avec les sons qui ont marqué l'époque et ceux qu'on a un peu oubliés. ${whoLine}`,
        `Ce thème, c'est la mémoire du rap français. ${whoLine} Reconnaître l'artiste rapporte autant que trouver le titre.`,
      ],
      mid: [
        `Le piège classique : le refrain que tout le monde connaît, mais le titre que personne ne retient. Le mode facile te propose trois titres, le mode difficile te laisse l'écrire.`,
        `Les plus jeunes découvrent, les plus anciens se vengent : c'est le thème idéal pour une partie à plusieurs générations, sur le même téléphone ou sur la TV.`,
      ],
    },
    "Styles": {
      open: [
        `${subject} : un style, une esthétique, une liste d'artistes qui ne se ressemblent pas forcément mais qui partagent la même énergie. ${whoLine}`,
        `Ce blind test isole un courant du rap français, ${subject.toLowerCase()}, pour voir si tu reconnais les sons au-delà des noms. ${whoLine}`,
      ],
      mid: [
        `Quand le style est le fil rouge, c'est la production qui trahit le morceau : la batterie, le tempo, la texture du beat. Écoute l'instru avant la voix.`,
        `Les propositions du mode facile viennent du même style : impossible de deviner par élimination, il faut vraiment avoir le son en tête.`,
      ],
    },
    "Du moment": {
      open: [
        `Ce thème bouge avec l'actualité : ${t.text.replace(/\.$/, "")}. ${whoLine}`,
        `Le rap français de maintenant, celui qui tourne en boucle cette semaine : ${t.text.replace(/\.$/, "")}. ${whoLine}`,
      ],
      mid: [
        `La sélection est rafraîchie régulièrement à partir des écoutes et des sorties : reviens dans quinze jours, la liste aura changé.`,
        `C'est le thème qui départage ceux qui suivent vraiment l'actu rap de ceux qui vivent sur leurs playlists de 2019.`,
      ],
    },
    "Classiques": {
      open: [
        `Les classiques, ce sont les titres d'il y a au moins cinq ans qui tiennent encore debout : ${subject}, sans les sorties récentes, rien que ce qui est resté. ${whoLine}`,
      ],
      mid: [
        `Un classique se reconnaît en deux secondes quand on l'a vécu, et jamais quand on ne l'a pas : le thème est impitoyable et c'est ce qui le rend bon à plusieurs.`,
      ],
    },
    "Gimmicks": {
      open: [
        `Pas de musique ici : des ad-libs, des phrases cultes, des mèmes sonores du rap français. On te joue l'extrait, tu dis qui parle.`,
      ],
      mid: [
        `Les extraits sont courts et répétés avec du silence entre deux. Trois écoutes maximum par manche, puis on révèle.`,
      ],
    },
  };
  const pools = byCat[t.category] ?? { open: [`${t.text}. ${whoLine}`], mid: [`Chaque partie renouvelle la sélection : deux blind tests d'affilée ne tombent pas sur les mêmes sons.`] };
  out.push({ h2: `Ce qu'il y a dans le blind test ${subject}`, p: pick(pools.open, seed, 1) });
  out.push({ h2: "Comment gagner des points", p: pick(pools.mid, seed, 2) });
  out.push({ h2: "Seul, entre potes ou en soirée", p: pick([
    `En solo, ton score entre dans le classement du thème. Entre potes sur un téléphone, c'est le buzzer qui tranche. En ligne, un code et chacun joue chez soi. En soirée, la TV diffuse et les téléphones répondent.`,
    `Le thème est le même dans tous les modes : solo pour le classement, local sur un seul téléphone, salon privé à distance, ou mode soirée sur la TV avec un gage pour le dernier.`,
    `Lance-le en défi : un pote reçoit le lien, joue exactement la même sélection, et on compare. Les revanches se font en un tap depuis le résultat.`,
  ], seed, 3) });
  return out;
}
