"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Flame, ArrowUp } from "lucide-react";
import { THEME_OPTIONS, THEME_CATEGORIES, FEATURED_THEME_IDS, PHOTO_THEME_IDS, type ThemeOption } from "@/lib/themes";
import ThemeCover from "@/components/ThemeCover";
import BrandMark from "@/components/BrandMark";

/*
 * Sélecteur de thème (v3) — partagé par le jeu solo/local, la création de salon et le rejeu.
 *
 *  - Un seul axe de défilement : vertical. Les thèmes sont des AFFICHES portrait sur deux
 *    colonnes (trois sur tablette, quatre sur ordinateur), rangées par catégorie.
 *  - Une barre collante : recherche + onglets de catégorie (l'onglet suit le défilement).
 *  - Le défi de la semaine en tête, en pleine largeur.
 *  - Lenis (scroll fluide du site) : on passe par son API pour les sauts de catégorie.
 */

function scrollToEl(el: HTMLElement | null, offset: number) {
  if (!el) return;
  const lenis = (window as unknown as { __lenis?: { scrollTo: (target: HTMLElement, opts?: object) => void } }).__lenis;
  if (lenis?.scrollTo) lenis.scrollTo(el, { offset, duration: 0.8 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: "smooth" });
}

export default function ThemePicker({
  themeId,
  onSelect,
  dailyTheme,
}: {
  themeId: string;
  onSelect: (id: string) => void;
  dailyTheme?: { id: string; label: string; text: string } | null;
}) {
  const [themePhotos, setThemePhotos] = useState<Record<string, string | string[]>>({});
  const [trendingThemes, setTrendingThemes] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(THEME_CATEGORIES[0]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    fetch("/api/blindtest/trending")
      .then((r) => r.json())
      .then((d) => setTrendingThemes(new Set([...FEATURED_THEME_IDS, ...(d.themes ?? [])])))
      .catch(() => {});
    fetch(`/api/blindtest/theme-art?themes=${PHOTO_THEME_IDS.join(",")}`)
      .then((r) => r.json())
      .then((data) => setThemePhotos(data.photos ?? {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const cat = (visible?.target as HTMLElement | undefined)?.dataset.category;
        if (cat) setActiveCategory(cat);
      },
      { rootMargin: "-160px 0px -65% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themePhotos]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const selected = useMemo(() => THEME_OPTIONS.find((t) => t.id === themeId), [themeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return THEME_OPTIONS.filter((t) => `${t.label} ${t.text} ${t.keywords ?? ""}`.toLowerCase().includes(q));
  }, [query]);

  function backToTop() {
    const lenis = (window as unknown as { __lenis?: { scrollTo: (target: number, opts?: object) => void } }).__lenis;
    if (lenis?.scrollTo) lenis.scrollTo(0, { duration: 0.8 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const Poster = ({ t, i }: { t: ThemeOption; i: number }) => (
    <button type="button" onClick={() => onSelect(t.id)} aria-pressed={themeId === t.id} className="text-left">
      <ThemeCover
        Icon={t.Icon}
        label={t.label}
        index={i}
        active={themeId === t.id}
        photoUrl={themePhotos[t.id]}
        tag={trendingThemes.has(t.id) ? "Tendance" : t.category === "Artistes" ? "Artiste" : undefined}
      />
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Barre collante : recherche + onglets */}
      <div className="sticky top-0 z-10 -mx-5 px-5 sm:-mx-6 sm:px-6 pt-2 pb-3 bg-[#070404]/92 backdrop-blur-md">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Un artiste, une époque, une ville…"
            aria-label="Chercher un thème"
            className="answer-input !pl-11 !pr-10 !min-h-[52px] !text-[15px]"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-ink-faint hover:text-ink">
              <X size={16} />
            </button>
          )}
        </div>
        {!filtered && (
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar mt-2.5 -mx-1 px-1">
            {THEME_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => scrollToEl(sectionRefs.current[cat], -150)}
                aria-pressed={activeCategory === cat}
                className={`shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors ${
                  activeCategory === cat ? "bg-white text-black" : "bg-white/8 text-ink-muted hover:text-ink"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
        {selected && (
          <p className="text-xs text-ink-faint mt-2.5">
            Sélection : <span className="text-ink font-semibold">{selected.label}</span>
          </p>
        )}
      </div>

      {filtered ? (
        filtered.length === 0 ? (
          <p className="text-sm text-ink-faint text-center py-10">Rien pour « {query} ». Essaie un artiste, une époque ou une ville.</p>
        ) : (
          <div className="theme-grid">
            {filtered.map((t, i) => (
              <Poster key={t.id} t={t} i={i} />
            ))}
          </div>
        )
      ) : (
        <>
          {dailyTheme && (
            <button
              type="button"
              onClick={() => onSelect(dailyTheme.id)}
              aria-pressed={themeId === dailyTheme.id}
              className="poster !aspect-auto !max-w-none !flex-none w-full min-h-[132px] p-5"
              data-active={themeId === dailyTheme.id}
              style={{ "--poster-bg": "linear-gradient(120deg, #1b0507 0%, #8a0010 55%, #f0001c 130%)" } as React.CSSProperties}
            >
              <BrandMark className="poster-mark !w-[46%] !-top-[30%] !-right-[8%]" size="46%" />
              <span className="poster-tag inline-flex items-center gap-1"><Flame size={11} /> Défi de la semaine</span>
              <span className="relative poster-title !text-[1.7rem] mt-6">{dailyTheme.label.replace(/^Blind Test /i, "")}</span>
              <span className="relative poster-sub">{dailyTheme.text} — le même thème pour tout le monde aujourd&apos;hui.</span>
            </button>
          )}

          {THEME_CATEGORIES.map((cat) => {
            const items = THEME_OPTIONS.filter((t) => t.category === cat);
            return (
              <section key={cat} ref={(el) => { sectionRefs.current[cat] = el; }} data-category={cat} className="scroll-mt-40">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-display text-2xl font-extrabold tracking-tight">{cat}</h3>
                  <span className="text-xs text-ink-faint">{items.length} thèmes</span>
                </div>
                <div className="theme-grid">
                  {items.map((t, i) => (
                    <Poster key={t.id} t={t} i={i} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      {showBackToTop && (
        <button type="button" onClick={backToTop} aria-label="Remonter" className="fixed bottom-24 right-4 z-20 w-11 h-11 rounded-full bg-white text-black shadow-lg grid place-items-center">
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}
