// Loader de marque — un anneau dégradé rouge tourne autour de l'emblème "d" du logo, qui
// respire doucement au centre. Remplace les spinners génériques partout sur le site (chargement
// de route, chargement du pool de titres, salon en ligne en attente...) pour que même les
// moments d'attente portent la marque plutôt que de ressembler à n'importe quel site.

export default function BrandLoader({
  label,
  size = "md",
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: 56, md: 84, lg: 120 }[size];
  const iconSize = Math.round(dims * 0.42);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-2" role="status" aria-label={label ?? "Chargement"}>
      <div className="relative shrink-0" style={{ width: dims, height: dims }}>
        {/* Halo doux derrière l'anneau */}
        <div
          className="absolute inset-[-20%] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, rgba(240,0,28,0.45), transparent 70%)" }}
          aria-hidden="true"
        />
        {/* Anneau dégradé qui tourne */}
        <div
          className="brand-ring absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, #F0001C 0deg, #FF3B4E 70deg, transparent 130deg, transparent 360deg)",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          }}
          aria-hidden="true"
        />
        {/* Emblème au centre, qui respire */}
        <div className="brand-pulse absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full bg-bg-deep border border-white/10 flex items-center justify-center"
            style={{ width: dims * 0.72, height: dims * 0.72 }}
          >
            <img src="/icon.svg" alt="" aria-hidden="true" style={{ width: iconSize, height: iconSize }} className="opacity-95" />
          </div>
        </div>
      </div>
      {label && <p className="font-mono text-xs text-ink-faint uppercase tracking-[0.16em] animate-pulse">{label}</p>}
    </div>
  );
}
