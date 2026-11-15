/*
 * Bibliothèque typographique des covers DailyRapFrance.
 *
 * Toutes gratuites pour un usage commercial : Google Fonts (SIL OFL) et Fontshare (ITF Free
 * Font License). Choisies pour le graphisme musical : ce sont les équivalents libres des
 * polices qu'on voit sur les covers éditoriales et les pochettes (Druk → Anton / League
 * Gothic / Tanker ; Monument Extended → Unbounded ; GT Alpina italique → Instrument Serif ;
 * Helvetica Black → Archivo Black ; Clash Display pour le côté « studio »).
 *
 * Champs : fam (nom CSS), src ("google" | "fontshare"), css (requête), weights, italic,
 * up (capitales), ls (interlettrage), lh (interligne), scale (correction de taille optique
 * pour que tous les lettrages aient à peu près le même poids visuel), mood (pour choisir).
 */
export const TYPE = {
  /* ── Impact / rue : le gros du rap ─────────────────────────────────────── */
  anton:       { fam: "Anton",            src: "google", css: "family=Anton",                       weights: [400], up: true, ls: ".01em",  lh: .9,  scale: 1.2,  mood: "poster, rue, condensé italique façon Fresh Rap" },
  league:      { fam: "League Gothic",    src: "google", css: "family=League+Gothic",               weights: [400], up: true, ls: ".01em",  lh: .88, scale: 1.3,  mood: "condensé très haut, affiche de concert" },
  bebas:       { fam: "Bebas Neue",       src: "google", css: "family=Bebas+Neue",                  weights: [400], up: true, ls: ".03em",  lh: .86, scale: 1.1,  mood: "capitales nettes, hits, classements" },
  archivo:     { fam: "Archivo Black",    src: "google", css: "family=Archivo+Black",               weights: [400], up: true, ls: "-.02em", lh: .88, scale: .82,  mood: "bloc massif, incontournables" },
  tanker:      { fam: "Tanker",           src: "fontshare", css: "f[]=tanker@400",                  weights: [400], up: true, ls: "0",      lh: .9,  scale: .95,  mood: "ultra-gras arrondi, drill, puissance" },
  shoulders:   { fam: "Big Shoulders Display", src: "google", css: "family=Big+Shoulders+Display:wght@900", weights: [900], up: true, ls: ".01em", lh: .88, scale: 1.15, mood: "condensé urbain, Chicago, sport" },
  dela:        { fam: "Dela Gothic One",  src: "google", css: "family=Dela+Gothic+One",             weights: [400], up: true, ls: "-.01em", lh: .95, scale: .72,  mood: "très large, très lourd, un seul mot" },
  protest:     { fam: "Protest Strike",   src: "google", css: "family=Protest+Strike",              weights: [400], up: true, ls: "0",      lh: .9,  scale: 1,    mood: "pancarte, revendication, brut" },
  staatliches: { fam: "Staatliches",      src: "google", css: "family=Staatliches",                 weights: [400], up: true, ls: ".04em",  lh: .9,  scale: 1.1,  mood: "stencil doux, militaire chic" },
  stencil:     { fam: "Black Ops One",    src: "google", css: "family=Black+Ops+One",               weights: [400], up: true, ls: "0",      lh: .95, scale: .9,   mood: "pochoir, armée, Allemagne" },

  /* ── Moderne / studio : propre, Spotify-like ──────────────────────────── */
  clash:       { fam: "Clash Display",    src: "fontshare", css: "f[]=clash-display@700",           weights: [700], up: false, ls: "-.03em", lh: .95, scale: 1,   mood: "sans géométrique chic, la relève, nouveautés" },
  figtree:     { fam: "Figtree",          src: "google", css: "family=Figtree:wght@800",            weights: [800], up: false, ls: "-.035em", lh: .95, scale: 1,  mood: "sobre et chaleureux, proche du Circular de Spotify" },
  unbounded:   { fam: "Unbounded",        src: "google", css: "family=Unbounded:wght@900",          weights: [900], up: true, ls: "-.02em", lh: .95, scale: .72,  mood: "large futuriste (Monument Extended libre), hits, TikTok" },
  syne:        { fam: "Syne",             src: "google", css: "family=Syne:wght@800",               weights: [800], up: false, ls: "-.02em", lh: .95, scale: .95,  mood: "éditorial contemporain, mode, pépites" },
  grotesk:     { fam: "Bricolage Grotesque", src: "google", css: "family=Bricolage+Grotesque:wght@800", weights: [800], up: false, ls: "-.045em", lh: .9, scale: 1, mood: "la police du site, repli universel" },
  space:       { fam: "Space Grotesk",    src: "google", css: "family=Space+Grotesk:wght@700",      weights: [700], up: false, ls: "-.03em", lh: .95, scale: 1,   mood: "tech, radar, data" },

  /* ── Émotion / éditorial : serifs ─────────────────────────────────────── */
  instrument:  { fam: "Instrument Serif", src: "google", css: "family=Instrument+Serif:ital@1",     weights: [400], italic: true, up: false, ls: "-.02em", lh: .95, scale: 1.1, mood: "italique fine et élégante, mood triste, perdu(e)" },
  playfair:    { fam: "Playfair Display", src: "google", css: "family=Playfair+Display:ital,wght@1,800", weights: [800], italic: true, up: false, ls: "-.03em", lh: .95, scale: .95, mood: "italique classique, foi, soul" },
  abril:       { fam: "Abril Fatface",    src: "google", css: "family=Abril+Fatface",               weights: [400], up: false, ls: "-.02em", lh: .95, scale: .95,  mood: "didone très grasse, magazine, prime" },
  fraunces:    { fam: "Fraunces",         src: "google", css: "family=Fraunces:ital,wght@1,900",    weights: [900], italic: true, up: false, ls: "-.03em", lh: .95, scale: .95, mood: "serif chaud et expressif, été, nostalgie" },
  zodiak:      { fam: "Zodiak",           src: "fontshare", css: "f[]=zodiak@800",                  weights: [800], up: false, ls: "-.02em", lh: .95, scale: .95,  mood: "serif contemporain, mélancolie moderne" },
  young:       { fam: "Young Serif",      src: "google", css: "family=Young+Serif",                 weights: [400], up: false, ls: "-.02em", lh: .95, scale: .95,  mood: "serif rond vintage, old school" },

  /* ── Culture rap : gothique, graffiti, manuscrit ──────────────────────── */
  pirata:      { fam: "Pirata One",       src: "google", css: "family=Pirata+One",                  weights: [400], up: false, ls: "0",      lh: .9,  scale: 1.1,  mood: "gothique lisible, Westside, légende" },
  unifraktur:  { fam: "UnifrakturCook",   src: "google", css: "family=UnifrakturCook:wght@700",     weights: [700], up: false, ls: "0",      lh: .95, scale: 1.05, mood: "fraktur dense, old school, Booba" },
  graffiti:    { fam: "Sedgwick Ave Display", src: "google", css: "family=Sedgwick+Ave+Display",    weights: [400], up: false, ls: "0",      lh: .95, scale: 1.05, mood: "graffiti marqueur, rue, pépites" },
  spray:       { fam: "Rubik Spray Paint", src: "google", css: "family=Rubik+Spray+Paint",          weights: [400], up: true, ls: "0",      lh: .95, scale: .85,  mood: "bombe aérosol, mur, drill" },
  marker:      { fam: "Permanent Marker", src: "google", css: "family=Permanent+Marker",            weights: [400], up: false, ls: "0",      lh: .95, scale: 1,    mood: "marqueur, été, soirée" },
  caveat:      { fam: "Caveat",           src: "google", css: "family=Caveat:wght@700",             weights: [700], up: false, ls: "0",      lh: .95, scale: 1.15, mood: "manuscrit léger" },
  rocksalt:    { fam: "Rock Salt",        src: "google", css: "family=Rock+Salt",                   weights: [400], up: false, ls: "0",      lh: 1.1, scale: .7,   mood: "craie, brut, perdu(e)" },

  /* ── Rétro / jeu / effet : à doser ────────────────────────────────────── */
  pixel:       { fam: "Press Start 2P",   src: "google", css: "family=Press+Start+2P",              weights: [400], up: true, ls: "0",      lh: 1.1, scale: .62,  mood: "pixel 8-bit, new gen, Chine" },
  silkscreen:  { fam: "Silkscreen",       src: "google", css: "family=Silkscreen:wght@700",         weights: [700], up: true, ls: "0",      lh: 1.1, scale: .75,  mood: "pixel fin, lisible" },
  jersey:      { fam: "Jersey 10",        src: "google", css: "family=Jersey+10",                   weights: [400], up: true, ls: ".02em",  lh: .9,  scale: 1.25, mood: "maillot de sport, pixel condensé" },
  bungee:      { fam: "Bungee",           src: "google", css: "family=Bungee",                      weights: [400], up: true, ls: "0",      lh: .95, scale: .85,  mood: "enseigne, contour, pépites" },
  shade:       { fam: "Bungee Shade",     src: "google", css: "family=Bungee+Shade",                weights: [400], up: true, ls: "0",      lh: 1,   scale: .7,   mood: "enseigne 3D, fête" },
  monoton:     { fam: "Monoton",          src: "google", css: "family=Monoton",                     weights: [400], up: true, ls: ".02em",  lh: 1,   scale: 1,   mood: "néon, nouvel an, disco" },
  shrikhand:   { fam: "Shrikhand",        src: "google", css: "family=Shrikhand",                   weights: [400], up: false, ls: "0",      lh: .95, scale: .95,  mood: "groovy 70s, afro, soirée" },
  mono:        { fam: "Rubik Mono One",   src: "google", css: "family=Rubik+Mono+One",              weights: [400], up: true, ls: "-.02em", lh: .95, scale: .7,   mood: "mono lourd, Pologne, techno" },
  glitch:      { fam: "Rubik Glitch",     src: "google", css: "family=Rubik+Glitch",                weights: [400], up: true, ls: "0",      lh: .95, scale: .85,  mood: "glitch, TikTok, internet" },
  sixcaps:     { fam: "Six Caps",         src: "google", css: "family=Six+Caps",                    weights: [400], up: true, ls: ".04em",  lh: .9,  scale: 1.6,  mood: "ultra-condensé, à côté d'un portrait" },
};

/* Associations qui marchent (lettering + lettering2 pour le mot accentué) :
 *  archivo + pirata      → BOOBA Prime (bloc + gothique)
 *  figtree + instrument  → Mood Triste (sobre + italique émotion)
 *  league + marker       → RADAR sorties (affiche + écrit à la main)
 *  clash + graffiti      → Les pépites (studio + tag)
 *  unbounded + bebas     → HITS TikTok (large futuriste + condensé)
 *  fraunces + figtree    → Rap Été (serif chaud + sobre)
 *  monoton + figtree     → NOUVEL AN (néon + sobre)
 */
