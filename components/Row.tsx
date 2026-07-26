"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Row({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scroll(dir: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  }

  return (
    <div className="group/row relative -mx-6 md:mx-0">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Précédent"
        className="hidden md:flex opacity-0 group-hover/row:opacity-100 transition-opacity absolute left-0 top-0 bottom-0 z-10 w-10 items-center justify-center bg-gradient-to-r from-bg to-transparent text-ink hover:text-gold"
      >
        <ChevronLeft size={18} />
      </button>
      <div ref={scrollerRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-6 md:px-0 pb-1 snap-x">
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Suivant"
        className="hidden md:flex opacity-0 group-hover/row:opacity-100 transition-opacity absolute right-0 top-0 bottom-0 z-10 w-10 items-center justify-center bg-gradient-to-l from-bg to-transparent text-ink hover:text-gold"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
