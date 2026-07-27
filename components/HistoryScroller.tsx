"use client";

import { useEffect, useRef, useState } from "react";

export default function HistoryScroller({
  eras,
}: {
  eras: { tag: string; text: string; strong?: boolean }[];
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = refs.current.findIndex((el) => el === entry.target);
            if (idx !== -1) setActive(idx);
          }
        }
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="md:grid md:grid-cols-[110px_1fr] md:gap-10">
      {/* Repères d'époque — sticky sur desktop, celui qui correspond au paragraphe visible
          s'allume ; en ligne au-dessus de chaque paragraphe sur mobile. */}
      <div className="hidden md:block">
        <div className="sticky top-32 space-y-4">
          {eras.map((era, i) => (
            <p
              key={era.tag}
              className={`font-mono text-xs uppercase tracking-wide transition-colors duration-300 ${
                active === i ? "text-gold" : "text-ink-faint"
              }`}
            >
              {era.tag}
            </p>
          ))}
        </div>
      </div>
      <div className="space-y-6 text-lg text-ink-muted leading-relaxed">
        {eras.map((era, i) => (
          <div key={era.tag} ref={(el) => { refs.current[i] = el; }}>
            <p className="md:hidden font-mono text-xs text-gold uppercase tracking-wide mb-2">{era.tag}</p>
            <p className={era.strong ? "text-ink font-medium" : ""}>{era.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
