/*
 * GameCover — carte de jeu avec logo DR discret (façon watermark Netflix, coin
 * supérieur gauche) + titre en surimpression en bas (scrim dégradé pour la lisibilité,
 * quel que soit le visuel derrière). Les covers fournies n'embarquent plus le texte ni
 * le logo en dur — tout est posé en code, ce qui permet de réutiliser le MÊME visuel en
 * portrait (.nf-poster) et en paysage (.nf-card) sans dupliquer les fichiers avec texte.
 */
export default function GameCover({
  href,
  cover,
  title,
  flag,
  variant = "poster",
}: {
  href: string;
  cover: string;
  title: string;
  flag?: string | null;
  variant?: "poster" | "card";
}) {
  return (
    <a
      href={href}
      className={`cover-frame ${variant === "poster" ? "nf-poster" : "nf-card"}`}
      style={{
        backgroundImage: `linear-gradient(180deg, transparent 50%, rgba(10,7,7,0.9) 100%), url(${cover})`,
      }}
      aria-label={title}
    >
      <img src="/icon.svg" alt="" aria-hidden="true" className="cover-logo" />
      {flag && <span className="nf-flag">{flag}</span>}
      <span className={variant === "card" ? "cover-title cover-title-lg" : "cover-title"}>{title}</span>
    </a>
  );
}
