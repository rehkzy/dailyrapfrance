/*
 * Logo du jeu "Blind Test" — l'identité DailyRapFrance appliquée au jeu.
 *
 * La marque : un vinyle (le sujet du jeu) dont le label rouge Daily porte un triangle
 * play blanc — écho direct au triangle découpé dans le D du monogramme DR de
 * DailyRapFrance. Wordmark en Bricolage Grotesque (la display de la charte), graisse
 * maximale, avec la caution "PAR DAILYRAPFRANCE" en mono.
 *
 * Palette : strictement la charte — Rouge Daily #F0001C, éclairci #FF3B4E,
 * profond #780101, encre #F5E8E8 sur noir chaud. Aucune couleur hors charte.
 */

export function BlindTestMark({ size = 56, spinning = false }: { size?: number; spinning?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={spinning ? "vinyl-spin" : undefined}
    >
      {/* Galette */}
      <circle cx="50" cy="50" r="48" fill="#0A0707" stroke="rgba(245,232,232,0.14)" strokeWidth="1.5" />
      {/* Sillons */}
      {[40, 33, 26].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} stroke="rgba(245,232,232,0.09)" strokeWidth="1" />
      ))}
      {/* Reflet */}
      <path d="M15 34 A40 40 0 0 1 34 15" stroke="rgba(245,232,232,0.28)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Label Rouge Daily */}
      <circle cx="50" cy="50" r="19" fill="#F0001C" />
      <circle cx="50" cy="50" r="19" stroke="#780101" strokeWidth="1.5" />
      {/* Triangle play — hérité du D de DailyRapFrance */}
      <path d="M44 40 L62 50 L44 60 Z" fill="#F5E8E8" />
      {/* Trou central */}
      <circle cx="50" cy="50" r="2.6" fill="#0A0707" />
    </svg>
  );
}

export default function BlindTestLogo({
  markSize = 64,
  className = "",
  spinning = false,
}: {
  markSize?: number;
  className?: string;
  spinning?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 sm:gap-5 ${className}`}>
      <BlindTestMark size={markSize} spinning={spinning} />
      <div className="leading-none">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-glow mb-2">
          Par DailyRapFrance
        </p>
        <p className="font-display font-extrabold text-4xl sm:text-6xl tracking-tight text-ink">
          Blind <span className="text-gold">Test</span>
        </p>
        <p className="font-display font-extrabold text-xl sm:text-3xl tracking-tight text-ink-muted mt-1">
          Rap Français
        </p>
      </div>
    </div>
  );
}
