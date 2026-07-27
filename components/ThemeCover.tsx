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
  photoUrl?: string | null;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    // Bordure de sélection en "ring-inset" — dessinée À L'INTÉRIEUR de la boîte, jamais
    // coupée par le défilement horizontal ou le fondu de bord du parent, quelle que soit la
    // situation (contrairement à un ring classique ou un ring-offset, qui débordent la boîte
    // et se font rogner par n'importe quel overflow ancêtre).
    <div
      className={`relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${gradient} transition-transform duration-200 ${
        active ? "ring-2 ring-inset ring-gold scale-[1.04]" : "group-hover:scale-[1.02]"
      }`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
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
      {/* Pastille de sélection façon Spotify — coche pleine en haut à droite */}
      {active && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gold flex items-center justify-center shadow-lg">
          <Check size={14} className="text-white" strokeWidth={3} />
        </div>
      )}
      <p className="absolute bottom-2 left-2.5 right-2.5 text-white text-xs font-medium leading-tight line-clamp-2">
        {label}
      </p>
    </div>
  );
}
