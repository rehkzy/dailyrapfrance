// Données d'exemple — structure calquée sur prisma/schema.prisma.
// À remplacer par de vraies requêtes Prisma une fois Supabase connecté (voir README).

export type MockArtist = {
  slug: string;
  name: string;
  city: string;
  label: string;
  status: "RICH" | "STANDARD" | "SKELETON";
  monthlyListeners: number;
  listenersDelta7d: number;
  hype: number;
  hypeDelta: number;
  hypeReason: string;
  certifications: { level: string; title: string; date: string }[];
};

export const artists: MockArtist[] = [
  {
    slug: "gazo",
    name: "Gazo",
    city: "Paris",
    label: "Rec. 118 / D'or et de Platine",
    status: "RICH",
    monthlyListeners: 9_800_000,
    listenersDelta7d: 4.2,
    hype: 91,
    hypeDelta: 12,
    hypeReason: "Entrée Top 50 + annonce d'album cette semaine.",
    certifications: [
      { level: "Diamant", title: "Drill FR", date: "2023-11-02" },
      { level: "Platine", title: "Nettoyage", date: "2022-06-14" },
    ],
  },
  {
    slug: "tiakola",
    name: "Tiakola",
    city: "Sevran",
    label: "92i",
    status: "RICH",
    monthlyListeners: 7_200_000,
    listenersDelta7d: 2.1,
    hype: 79,
    hypeDelta: 6,
    hypeReason: "Nouvel album annoncé, forte réaction sur les réseaux.",
    certifications: [{ level: "Platine", title: "Mal Gré Moi", date: "2023-03-10" }],
  },
  {
    slug: "luv-resval",
    name: "Luv Resval",
    city: "Marseille",
    label: "Indépendant",
    status: "STANDARD",
    monthlyListeners: 3_100_000,
    listenersDelta7d: 6.8,
    hype: 84,
    hypeDelta: 8,
    hypeReason: "Vélocité de streaming en forte hausse sur un nouveau single.",
    certifications: [],
  },
  {
    slug: "sdm",
    name: "SDM",
    city: "Corbeil-Essonnes",
    label: "Indépendant",
    status: "STANDARD",
    monthlyListeners: 4_500_000,
    listenersDelta7d: -0.5,
    hype: 65,
    hypeDelta: -2,
    hypeReason: "Pas de sortie récente, momentum en ralentissement.",
    certifications: [{ level: "Platine", title: "Bourbon", date: "2024-01-20" }],
  },
];

export type MockRelease = {
  slug: string;
  title: string;
  artistSlug: string;
  artistName: string;
  type: "ALBUM" | "EP" | "SINGLE" | "MIXTAPE";
  status: "ANNOUNCED" | "RELEASED";
  date: string;
  label: string;
  tracks: { title: string; duration: string; features: string[] }[];
};

export const releases: MockRelease[] = [
  {
    slug: "gazo-drill-fr-2",
    title: "Drill FR 2",
    artistSlug: "gazo",
    artistName: "Gazo",
    type: "ALBUM",
    status: "ANNOUNCED",
    date: "2026-09-12",
    label: "Rec. 118",
    tracks: [
      { title: "Intro", duration: "2:14", features: [] },
      { title: "Sang froid", duration: "3:02", features: ["Tiakola"] },
    ],
  },
  {
    slug: "tiakola-mal-gre-moi",
    title: "Mal Gré Moi",
    artistSlug: "tiakola",
    artistName: "Tiakola",
    type: "ALBUM",
    status: "RELEASED",
    date: "2023-03-10",
    label: "92i",
    tracks: [
      { title: "Rooftop", duration: "3:18", features: [] },
      { title: "Petrouchka", duration: "2:54", features: ["Gazo"] },
    ],
  },
];

export const chartTop: { rank: number; name: string; slug: string; score: number; delta: number }[] =
  artists
    .map((a, i) => ({ rank: i + 1, name: a.name, slug: a.slug, score: a.hype, delta: a.hypeDelta }))
    .sort((a, b) => b.score - a.score)
    .map((a, i) => ({ ...a, rank: i + 1 }));

export const briefs = [
  {
    slug: "gazo-annonce-album",
    title: "Gazo annonce « Drill FR 2 » pour septembre",
    tag: "sortie",
    date: "2026-07-24",
  },
  {
    slug: "sdm-platine",
    title: "« Bourbon » de SDM certifié Platine",
    tag: "certif",
    date: "2026-07-23",
  },
  {
    slug: "luv-resval-hype",
    title: "Luv Resval : +8 points de Hype en une semaine",
    tag: "hype",
    date: "2026-07-22",
  },
];
