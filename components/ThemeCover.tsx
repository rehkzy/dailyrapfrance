import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

// Petite palette de dégradés (dans la famille de marque, avec juste assez de variation
// pour distinguer les thèmes visuellement) — cyclée par index, pas de fichier image à charger.
const GRADIENTS = [
  "from-[#3a0a0a] via-[#780101] to-[#F0001C]",
  "from-[#2b0505] via-[#5c0f0f] to-[#F0001C]",
  "from-[#1a0a05] via-[#7a2a0a] to-[#F0001C]",
  "from-[#3a0505] via-[#8a1010] to-[#FF3B4E]",
  "from-[#2b1505] via-[#7a4a0a] to-[#F0001C]",
];

export default function ThemeCover({
  Icon,
  label,
  index = 0,
  active = false,
  photoUrl,
}: {
  Icon: LucideIcon;
  label: string;
  index?: number;
  active?: boolean;
  photoUrl?: string | string[] | null;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const photos = Array.isArray(photoUrl) ? photoUrl.filter(Boolean) : photoUrl ? [photoUrl] : [];

  return (
    // Sélection à la Spotify/Apple : jamais de scale sur la tuile elle-même (ça vit dans un
    // rang qui défile — un scale y ressemble à un bug de "zoom au clic" et bouscule ses
    // voisines). Le retour visuel tient uniquement à la bordure, au glow et au badge.
    <div
      className={`tap-press relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${gradient} ring-2 ring-inset transition-[box-shadow,ring-color] duration-200 ${
        active ? "ring-gold shadow-[0_0_0_1px_rgba(240,0,28,0.4),0_8px_24px_-6px_rgba(240,0,28,0.5)]" : "ring-transparent"
      }`}
    >
      {photos.length === 2 ? (
        <div className="absolute inset-0 flex">
          <img src={photos[0]} alt="" aria-hidden="true" className="w-1/2 h-full object-cover" loading="lazy" />
          <img src={photos[1]} alt="" aria-hidden="true" className="w-1/2 h-full object-cover" loading="lazy" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-black/40" />
        </div>
      ) : photos.length === 1 ? (
        <img src={photos[0]} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : (
        <Icon
          size={72}
          strokeWidth={1.2}
          className="absolute -right-3 -bottom-3 text-white/10 rotate-[-8deg]"
          aria-hidden="true"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
      <div className="absolute top-2.5 left-2.5">
        <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
          <Icon size={14} className="text-white" />
        </div>
      </div>
      {/* Pastille de sélection façon Spotify — coche pleine en haut à droite, seule à "pop" */}
      {active && (
        <div className="solved-pop absolute top-2 right-2 w-6 h-6 rounded-full bg-gold flex items-center justify-center shadow-lg">
          <Check size={14} className="text-white" strokeWidth={3} />
        </div>
      )}
      <p className="absolute bottom-2 left-2.5 right-2.5 text-white text-xs font-medium leading-tight line-clamp-2">
        {label}
      </p>
    </div>
  );
}
