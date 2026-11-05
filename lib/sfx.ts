// Bruitages du blind test — synthétisés en direct via Web Audio API, aucun fichier audio à
// charger/héberger. Le contexte audio est créé au premier appel (après un geste utilisateur,
// requis par les navigateurs) et réutilisé ensuite.

import { GIMMICKS, gimmicksEnabled, gimmicksOf, type GimmickMood } from "@/lib/gimmicks";

let ctx: AudioContext | null = null;
let muted = false;
let tagEl: HTMLAudioElement | null = null;
let gimmickEl: HTMLAudioElement | null = null;
let lastGimmickAt = 0;
let lastGimmickId: string | null = null;
const GIMMICK_COOLDOWN_MS = 12_000;
let reactRound = 0;
let reactLastRound = -2;
let reactCount = 0;

function getCtx(): AudioContext | null {
  if (muted) return null;
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", gain = 0.15) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration + 0.05);
}

export const sfx = {
  setMuted(v: boolean) {
    muted = v;
  },
  isMuted() {
    return muted;
  },
  // Petit clic sec — boutons, sélection de thème
  click() {
    tone(700, 0, 0.05, "square", 0.05);
  },
  // Buzz d'un joueur — sonnerie de jeu télévisé, courte et franche
  buzz() {
    tone(880, 0, 0.09, "square", 0.1);
    tone(1180, 0.07, 0.1, "square", 0.08);
  },
  // Bonne réponse — deux notes ascendantes, satisfaisant
  correct() {
    tone(523.25, 0, 0.14, "sine", 0.12); // do
    tone(783.99, 0.09, 0.22, "sine", 0.12); // sol
  },
  // Featuring trouvé — trois notes, plus riche (bonus +2)
  bonus() {
    tone(523.25, 0, 0.12, "triangle", 0.12);
    tone(659.25, 0.08, 0.12, "triangle", 0.12);
    tone(987.77, 0.16, 0.25, "triangle", 0.13);
  },
  // Mauvaise réponse / temps écoulé — buzz grave et bref
  wrong() {
    tone(180, 0, 0.18, "sawtooth", 0.09);
    tone(140, 0.05, 0.2, "sawtooth", 0.08);
  },
  // Tick des 5 dernières secondes — urgence discrète
  tick() {
    tone(1000, 0, 0.045, "square", 0.045);
  },
  // Révélation du titre en fin de manche
  reveal() {
    tone(392, 0, 0.3, "sine", 0.06);
    tone(587.33, 0.05, 0.35, "sine", 0.07);
  },
  // Victoire — petit arpège de fin de partie
  victory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.11, 0.35, "triangle", 0.1));
  },
  // Le tag audio DailyRapFrance (2 s, public/audio/tag.mp3) — la signature sonore du jeu :
  // au lancement d'une partie et sur l'écran de fin. Jamais pendant un extrait.
  tag(volume = 0.6) {
    if (muted || typeof window === "undefined") return;
    try {
      if (!tagEl) { tagEl = new Audio("/audio/tag.mp3"); tagEl.preload = "auto"; }
      tagEl.volume = volume;
      tagEl.currentTime = 0;
      tagEl.play().catch(() => {});
    } catch {}
  },
  // Gimmick de rappeur selon l'humeur du moment. `chance` : probabilité de le jouer (les
  // bonnes réponses sont fréquentes → 35 % ; la fin de partie → 100 %). Renvoie la durée
  // en secondes si quelque chose part (pour baisser la musique pendant ce temps), sinon 0.
  // `prefer` : artiste (ou thème artist-*) dont on veut l'ad-lib en priorité — celui qu'on
  // vient de révéler, ou celui du thème. Son propre clip passe avant l'humeur.
  // `strict` : uniquement l'ad-lib de cet artiste — rien si l'artiste n'en a pas (en partie,
  // un « Kaaris » sur un son de Jul n'a aucun sens).
  gimmick(mood: GimmickMood, chance = 1, opts: { force?: boolean; volume?: number; prefer?: string | null; strict?: boolean } = {}): number {
    if (muted || typeof window === "undefined" || !gimmicksEnabled()) return 0;
    const own = gimmicksOf(opts.prefer);
    if (opts.strict && own.length === 0) return 0;
    const now = Date.now();
    if (!opts.force && now - lastGimmickAt < GIMMICK_COOLDOWN_MS) return 0;
    if (Math.random() > chance) return 0;
    const ownMood = own.filter((g) => g.moods.includes(mood) && g.id !== lastGimmickId);
    // Un clip « intro » (le mème « Salut à tous, c'est Ninho ») ne sert qu'à l'intro.
    const ownAny = own.filter((g) => g.id !== lastGimmickId && (mood === "intro" || !g.moods.includes("intro")));
    const fallback = opts.strict ? [] : GIMMICKS.filter((g) => g.moods.includes(mood) && g.id !== lastGimmickId);
    const pool = ownMood.length ? ownMood : ownAny.length && mood !== "miss" && mood !== "lose" ? ownAny : fallback;
    if (pool.length === 0) return 0;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) return 0;
    try {
      if (!gimmickEl) { gimmickEl = new Audio(); gimmickEl.preload = "auto"; }
      gimmickEl.src = `/audio/gimmicks/${pick.id}.mp3`;
      gimmickEl.volume = opts.volume ?? 0.9;
      gimmickEl.play().catch(() => {});
      lastGimmickAt = now;
      lastGimmickId = pick.id;
      return pick.seconds;
    } catch { return 0; }
  },
  // Réaction de l'artiste lui-même (et de lui seul) : bonne ou mauvaise réponse sur un de
  // ses sons, dans tous les modes. Rien si l'artiste n'a pas d'ad-lib.
  //
  // Dose : un ad-lib au plus par manche, jamais sur deux manches de suite, et pas plus de
  // 4 par partie — passé ça, on ne l'entend plus, on le subit. Une bonne réponse déclenche
  // 1 fois sur 2 ; un raté, à coup sûr (c'est la vanne qu'on attend).
  artistReact(artistName: string | null | undefined, mood: "hit" | "miss"): number {
    if (reactRound === reactLastRound || reactRound === reactLastRound + 1 && reactLastRound >= 0) return 0;
    if (reactCount >= 4) return 0;
    if (mood === "hit" && Math.random() < 0.5) return 0;
    const secs = sfx.gimmick(mood, 1, { prefer: artistName, strict: true, force: true, volume: 0.85 });
    if (secs > 0) { reactLastRound = reactRound; reactCount++; }
    return secs;
  },
  // À appeler au début de chaque manche / de chaque partie pour la dose ci-dessus.
  nextRound() { reactRound++; },
  newGame() { reactRound = 0; reactLastRound = -2; reactCount = 0; },
  // Joker utilisé
  joker() {
    tone(300, 0, 0.08, "sine", 0.08);
    tone(500, 0.06, 0.14, "sine", 0.08);
  },
};
