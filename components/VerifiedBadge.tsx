/*
 * Badge « compte certifié » — la pastille rouge de la marque avec une coche blanche, posée
 * à côté du pseudo partout où un nom apparaît (profil, classements, amis, communauté).
 * Même code visuel que sur les réseaux sociaux : on le comprend sans l'avoir jamais vu ici.
 */
export default function VerifiedBadge({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Compte certifié"
      title="Compte certifié"
      className={`inline-grid place-items-center align-middle shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path d="M12 1.6l2.6 2 3.3-.5 1.3 3 3 1.3-.5 3.3 2 2.6-2 2.6.5 3.3-3 1.3-1.3 3-3.3-.5-2.6 2-2.6-2-3.3.5-1.3-3-3-1.3.5-3.3-2-2.6 2-2.6-.5-3.3 3-1.3 1.3-3 3.3.5z" fill="#f0001c" />
        <path d="M7.6 12.3l2.9 2.9 5.9-6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
