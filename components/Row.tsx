"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Row({
  title,
  viewAllHref,
  children,
}: {
  title: string;
  viewAllHref?: string;
  children: React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scroll(dir: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: dir * 640, behavior: "smooth" });
  }

  return (
    <section className="group/row relative py-6">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex items-baseline justify-between mb-4">
        <h2 className="font-display text-xl md:text-2xl font-medium">{title}</h2>
        {viewAllHref && (
          <a
            href={viewAllHref}
            className="text-xs font-mono uppercase tracking-wide text-ink-faint hover:text-gold transition-colors"
          >
            Tout voir
          </a>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Précédent"
          className="hidden md:flex opacity-0 group-hover/row:opacity-100 transition-opacity absolute left-0 top-0 bottom-0 z-10 w-14 items-center justify-center bg-gradient-to-r from-bg via-bg/80 to-transparent text-ink hover:text-gold"
        >
          <ChevronLeft size={22} />
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-6 md:px-12 pb-2 snap-x snap-mandatory"
        >
          {children}
        </div>

        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Suivant"
          className="hidden md:flex opacity-0 group-hover/row:opacity-100 transition-opacity absolute right-0 top-0 bottom-0 z-10 w-14 items-center justify-center bg-gradient-to-l from-bg via-bg/80 to-transparent text-ink hover:text-gold"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </section>
  );
}
