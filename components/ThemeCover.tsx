import type { LucideIcon } from "lucide-react";

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
}: {
  Icon: LucideIcon;
  label: string;
  index?: number;
  active?: boolean;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <div
      className={`relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${gradient} transition-transform duration-200 ${
        active ? "ring-2 ring-gold scale-[1.03]" : "group-hover:scale-[1.02]"
      }`}
    >
      <Icon
        size={72}
        strokeWidth={1.2}
        className="absolute -right-3 -bottom-3 text-white/10 rotate-[-8deg]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute top-2.5 left-2.5">
        <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
          <Icon size={14} className="text-white" />
        </div>
      </div>
      <p className="absolute bottom-2 left-2.5 right-2.5 text-white text-xs font-medium leading-tight line-clamp-2">
        {label}
      </p>
      {active && (
        <div className="absolute inset-0 border-2 border-gold rounded-xl pointer-events-none" />
      )}
    </div>
  );
}
