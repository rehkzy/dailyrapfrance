// Bruitages du blind test — synthétisés en direct via Web Audio API, aucun fichier audio à
// charger/héberger. Le contexte audio est créé au premier appel (après un geste utilisateur,
// requis par les navigateurs) et réutilisé ensuite.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
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
  // Joker utilisé
  joker() {
    tone(300, 0, 0.08, "sine", 0.08);
    tone(500, 0.06, 0.14, "sine", 0.08);
  },
};
