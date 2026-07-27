"use client";

import { useEffect, useRef, useState } from "react";

export default function LogoReveal({ size = 40 }: { size?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="inline-block overflow-hidden"
      style={{
        width: size,
        height: size * 0.66,
        clipPath: visible ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
        transition: "clip-path 1.1s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <img src="/icon.svg" alt="DailyRapFrance" width={size} height={size * 0.66} style={{ width: size, height: "auto" }} />
    </div>
  );
}
