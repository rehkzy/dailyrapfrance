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

/** Pastille app : la marque blanche sur fond Rouge Daily arrondi (même rendu que l'icône installée). */
export function BrandTile({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-grid place-items-center shrink-0 text-white ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: "linear-gradient(135deg, #ff3b4e, #f0001c 70%)",
        boxShadow: "0 10px 24px -10px rgba(240,0,28,0.8), inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
      aria-hidden="true"
    >
      <BrandMark size={size * 0.58} />
    </span>
  );
}
