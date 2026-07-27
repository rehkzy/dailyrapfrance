import Reveal from "@/components/Reveal";

export default function Timeline({
  items,
}: {
  items: { year: string; text: string }[];
}) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-gold via-white/15 to-transparent" aria-hidden="true" />
      <div className="space-y-8">
        {items.map((item, i) => (
          <Reveal key={item.year} delay={i * 80}>
            <div className="relative">
              <span className="absolute -left-8 top-1.5 w-[15px] h-[15px] rounded-full bg-bg border-2 border-gold" aria-hidden="true" />
              <p className="font-mono text-xs text-gold uppercase tracking-wide mb-1">{item.year}</p>
              <p className="text-sm text-ink-muted leading-relaxed">{item.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
