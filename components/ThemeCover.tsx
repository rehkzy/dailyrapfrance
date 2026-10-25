import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

/*
 * Affiche de thème (v3) — format portrait, photo d'artiste en bichromie rouge/noir, grand
 * libellé en bas. Même famille que les affiches de mode : on reconnaît le jeu d'un coup d'œil.
 * Pas de photo (époques, playlists) : grand motif icône sur dégradé de marque.
 */
const GRADIENTS = [
  "linear-gradient(160deg, #3a0a0f 0%, #8a0010 60%, #f0001c 130%)",
  "linear-gradient(160deg, #2a0608 0%, #5c000b 60%, #c20016 120%)",
  "linear-gradient(160deg, #1b0507 0%, #7a0f0f 60%, #ff3b4e 140%)",
  "linear-gradient(160deg, #2b1505 0%, #7a2a0a 60%, #f0001c 130%)",
];

export default function ThemeCover({
  Icon,
  label,
  index = 0,
  active = false,
  photoUrl,
  tag,
}: {
  Icon: LucideIcon;
  label: string;
  index?: number;
  active?: boolean;
  photoUrl?: string | string[] | null;
  tag?: string;
}) {
  const photos = Array.isArray(photoUrl) ? photoUrl.filter(Boolean) : photoUrl ? [photoUrl] : [];
  const clean = label.replace(/^Blind Test /i, "");

  return (
    <div className="theme-poster" data-active={active} style={{ background: GRADIENTS[index % GRADIENTS.length] }}>
      {photos.length > 0 ? (
        <div className="theme-poster-photos" data-count={Math.min(photos.length, 2)}>
          {photos.slice(0, 2).map((src, i) => (
            <img key={i} src={src} alt="" aria-hidden="true" loading="lazy" />
          ))}
        </div>
      ) : (
        <Icon size={120} strokeWidth={1} className="theme-poster-icon" aria-hidden="true" />
      )}
      <div className="theme-poster-shade" aria-hidden="true" />
      {tag && <span className="theme-poster-tag">{tag}</span>}
      {active && (
        <span className="theme-poster-check solved-pop">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
      <p className="theme-poster-label">{clean}</p>
    </div>
  );
}
