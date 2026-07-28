/*
 * Logo du jeu "Blind Test" — DailyRapFrance.
 *
 * Le jeu porte la marque du média : le monogramme DR officiel (avec son triangle play
 * intégré) est la marque du jeu, présenté en tuile verre 3D animée en continu — légère
 * rotation/inclinaison perpétuelle, reflet qui balaie la tuile, glow Rouge Daily.
 * Pas de caution "par DailyRapFrance" : le jeu EST DailyRapFrance.
 *
 * Palette : strictement la charte — Rouge Daily #F0001C, éclairci #FF3B4E,
 * profond #780101, encre #F5E8E8 sur noir chaud.
 */

const DR_PATH =
  "M813.2,0h-264l-20.3,94.8C504.8,35.4,439.4,0,345,0h-193.2l-74.7,348.5h217c82.9,0,152.5-26.6,195.9-72.5l-15.6,72.5h117l20.9-99h149c31.1,0,37.4,9.2,30.6,40.3l-12.6,58.7h117l16.5-77.7c8.7-40.3-12.1-63.1-52.4-66.5,48.5-13.1,80.1-42.2,89.3-84.9C964.6,48.1,923.4,0,813.2,0h0ZM209.5,245.6l34.6-76.2c.9-2,.9-4.2,0-6.2l-31.9-74.3c-2.7-6.3,3.6-12.7,9.9-10.1l205.6,83.4c6.5,2.6,6.4,11.8-.1,14.3l-208.3,79.5c-6.4,2.4-12.5-4.1-9.7-10.3h0ZM829.7,126.2c-4.9,25.7-28.2,32-58.2,32h-139.8l14.1-67h138.8c31.5,0,50,6.8,45.1,34.9h0Z";

export function DRMark3D({ size = 96 }: { size?: number | string }) {
  // Tuile verre en 3D : perspective sur le conteneur, la tuile oscille en rotateX/rotateY
  // (animation dr-tilt, définie dans globals.css), un reflet diagonal la balaie.
  return (
    <span
      className="dr3d-scene inline-block"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="dr3d-tile">
        <svg viewBox="0 0 1029.7 348.5" className="dr3d-glyph" xmlns="http://www.w3.org/2000/svg">
          <path d={DR_PATH} fill="#F5E8E8" />
        </svg>
        <span className="dr3d-sheen" />
      </span>
    </span>
  );
}

/** Compat : l'ancien nom BlindTestMark reste exporté (utilisé par InstallPrompt, etc.) */
export function BlindTestMark({ size = 56 }: { size?: number; spinning?: boolean }) {
  return <DRMark3D size={size} />;
}

export default function BlindTestLogo({
  className = "",
}: {
  markSize?: number;
  className?: string;
  spinning?: boolean;
}) {
  // La tuile DR fait la hauteur du bloc texte entier ("Blind Test" + "Rap Français"),
  // pour une composition équilibrée : deux masses de même hauteur, alignées au centre.
  return (
    <div className={`flex items-center gap-5 sm:gap-7 ${className}`}>
      <span className="block w-[104px] h-[104px] sm:w-[164px] sm:h-[164px] shrink-0">
        <DRMark3D size="100%" />
      </span>
      <div className="leading-none">
        <p className="font-display font-extrabold text-4xl sm:text-6xl tracking-tight text-ink">
          Blind <span className="text-gold">Test</span>
        </p>
        <p className="font-display font-extrabold text-xl sm:text-3xl tracking-tight text-ink-muted mt-1.5">
          Rap Français
        </p>
      </div>
    </div>
  );
}
