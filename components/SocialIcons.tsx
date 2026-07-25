// Icônes de marque dessinées à la main (traits, cohérent avec lucide-react utilisé
// ailleurs) — évite de dépendre d'icônes de marque qui n'existent pas forcément
// dans toutes les versions de lucide-react.

export function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function TikTokIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M16.5 3c.4 2.2 1.8 3.6 4 3.9v3c-1.5.1-2.8-.3-4-1.1v6.6c0 3.4-2.3 5.6-5.5 5.6-3 0-5.5-2.3-5.5-5.4 0-3.2 2.7-5.5 5.9-5.3v3.1c-1.4-.2-2.6.7-2.6 2.1 0 1.3 1.1 2.3 2.4 2.3 1.5 0 2.6-1.1 2.6-2.9V3h2.7Z"
        stroke="currentColor"
        strokeWidth="0.4"
        fill="currentColor"
      />
    </svg>
  );
}

export function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 4l7.2 8.6L4.3 20h2.1l6.1-6.6 4.5 6.6H21l-7.5-9 6.5-7.6h-2.1L12.2 9.4 8 4H4Z"
        fill="currentColor"
      />
    </svg>
  );
}
