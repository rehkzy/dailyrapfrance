import { briefs } from "@/lib/mock-data";

const tagLabels: Record<string, string> = {
  sortie: "Sortie",
  certif: "Certification",
  hype: "Hype",
};

export default function MagPage() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl font-semibold mb-2">Mag</h1>
      <p className="text-ink-muted mb-8">Brèves auto-générées et articles de la rédaction.</p>

      <div className="glass rounded-xl divide-y divide-white/8 overflow-hidden">
        {briefs.map((b) => (
          <div key={b.slug} className="py-4 px-5">
            <p className="text-xs font-mono text-ink-faint uppercase mb-1">
              {tagLabels[b.tag]} · {new Date(b.date).toLocaleDateString("fr-FR")}
            </p>
            <p className="font-medium">{b.title}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
