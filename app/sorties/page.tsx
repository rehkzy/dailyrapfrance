import { releases } from "@/lib/mock-data";

export default function SortiesPage() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl font-semibold mb-2">Sorties</h1>
      <p className="text-ink-muted mb-8">Confirmées et à venir, triées par date.</p>

      <div className="divide-y divide-line border-t border-b border-line">
        {releases
          .slice()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((r) => (
            <a
              key={r.slug}
              href={`/sortie/${r.slug}`}
              className="flex items-center gap-4 py-4 hover:bg-surface transition-colors -mx-2 px-2"
            >
              <div className="w-10 h-10 rounded bg-surface-raised border border-line shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-ink-muted">{r.artistName} · {r.label}</p>
              </div>
              <span
                className={
                  "text-xs font-mono border rounded px-2 py-1 " +
                  (r.status === "ANNOUNCED"
                    ? "border-gold text-gold"
                    : "border-line text-ink-muted")
                }
              >
                {r.status === "ANNOUNCED" ? "à venir" : new Date(r.date).getFullYear()}
              </span>
            </a>
          ))}
      </div>
    </section>
  );
}
