/*
 * L'icône officielle DailyRapFrance — la flèche "play" tirée du monogramme DR.
 * Fournie en SVG inline pour pouvoir la teinter (currentColor) et l'utiliser comme motif :
 * favicon, puce de progression, filigrane de carte, marque de buzzer.
 */

export const BRAND_MARK_PATH =
  "M2.97,703.29l145.19-320.02c3.74-8.25,3.84-17.7.26-26.02L14.26,45.01C2.9,18.57,29.29-8.37,55.96,2.45l863.88,350.39c27.11,10.99,26.7,49.52-.63,59.94L43.78,746.69c-26.88,10.25-52.7-17.2-40.81-43.4Z";

export default function BrandMark({
  size = 24,
  className = "",
  title,
}: {
  size?: number | string;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 939.94 748.89"
      width={size}
      height={typeof size === "number" ? (size * 748.89) / 939.94 : size}
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}
      <path d={BRAND_MARK_PATH} fill="currentColor" />
    </svg>
  );
}

// Monogramme DR officiel (celui du logo) — utilisé par la pastille "app".
export const DR_MONOGRAM_PATH =
  "M813.2,0h-264l-20.3,94.8C504.8,35.4,439.4,0,345,0h-193.2l-74.7,348.5h217c82.9,0,152.5-26.6,195.9-72.5l-15.6,72.5h117l20.9-99h149c31.1,0,37.4,9.2,30.6,40.3l-12.6,58.7h117l16.5-77.7c8.7-40.3-12.1-63.1-52.4-66.5,48.5-13.1,80.1-42.2,89.3-84.9C964.6,48.1,923.4,0,813.2,0h0ZM209.5,245.6l34.6-76.2c.9-2,.9-4.2,0-6.2l-31.9-74.3c-2.7-6.3,3.6-12.7,9.9-10.1l205.6,83.4c6.5,2.6,6.4,11.8-.1,14.3l-208.3,79.5c-6.4,2.4-12.5-4.1-9.7-10.3h0ZM829.7,126.2c-4.9,25.7-28.2,32-58.2,32h-139.8l14.1-67h138.8c31.5,0,50,6.8,45.1,34.9h0Z";

/** Pastille app : le monogramme DR officiel sur le dégradé rouge de la charte — même rendu
 *  que l'icône installée sur l'écran d'accueil. */
export function BrandTile({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-grid place-items-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: "linear-gradient(135deg, #ff3b4e 0%, #f0001c 55%, #8a0010 100%)",
        boxShadow: "0 10px 24px -10px rgba(240,0,28,0.8), inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1029.7 348.5" width={size * 0.72} height={(size * 0.72 * 348.5) / 1029.7} xmlns="http://www.w3.org/2000/svg">
        <path d={DR_MONOGRAM_PATH} fill="#FFFFFF" />
      </svg>
    </span>
  );
}
