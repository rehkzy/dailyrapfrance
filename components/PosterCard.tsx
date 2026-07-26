export default function PosterCard({
  href,
  title,
  subtitle,
  imageUrl,
  badge,
  circle = false,
}: {
  href: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  circle?: boolean;
}) {
  return (
    <a href={href} className="group/card shrink-0 w-[150px] sm:w-[180px] snap-start">
      <div
        className={`relative aspect-square overflow-hidden glass mb-2.5 transition-transform duration-300 ease-out group-hover/card:scale-[1.06] group-hover/card:z-10 group-hover/card:shadow-2xl ${
          circle ? "rounded-full" : "rounded-lg"
        }`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface-raised to-bg-deep flex items-center justify-center">
            <span className="font-display text-3xl text-ink-faint">{title.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        {badge && (
          <span className="absolute top-2 right-2 bg-gold text-white text-[10px] font-mono uppercase px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <div>
            <p className="text-sm font-medium leading-tight line-clamp-2">{title}</p>
            {subtitle && <p className="text-xs text-ink-faint mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <p className="text-sm font-medium truncate group-hover/card:text-gold transition-colors">{title}</p>
      {subtitle && <p className="text-xs text-ink-faint truncate">{subtitle}</p>}
    </a>
  );
}
