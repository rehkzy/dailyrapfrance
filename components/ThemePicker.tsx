"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Flame, ArrowUp, LayoutGrid, Layers } from "lucide-react";
import ThemeSwipe from "@/components/ThemeSwipe";
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
  // Vue « pile de cartes » (glisser) ou grille complète. Par défaut la pile sur téléphone —
  // c'est le geste que tout le monde a dans les doigts — la grille sur grand écran.
  const [view, setView] = useState<"swipe" | "grid">("grid");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("drf-theme-view");
      if (saved === "swipe" || saved === "grid") setView(saved);
      else if (window.matchMedia("(max-width: 639px)").matches) setView("swipe");
    } catch {}
  }, []);
  function switchView(v: "swipe" | "grid") {
    setView(v);
    try { localStorage.setItem("drf-theme-view", v); } catch {}
  }
  // Ordre de la pile : tendances d'abord, puis le reste mélangé (stable pendant la session)
  const swipeOrder = useMemo(() => {
    const pool = THEME_OPTIONS.filter((t) => t.id !== "mix" && t.id !== "random");
    const daily = pool.filter((t) => t.id === dailyTheme?.id);
    const hot = pool.filter((t) => t.id !== dailyTheme?.id && trendingThemes.has(t.id));
    const rest = pool.filter((t) => t.id !== dailyTheme?.id && !trendingThemes.has(t.id)).sort(() => Math.random() - 0.5);
    return [...daily, ...hot, ...rest];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendingThemes.size, dailyTheme?.id]);
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

  // L'onglet de catégorie suit le défilement : la catégorie active est la dernière dont le
  // titre est passé sous la barre collante. Calcul direct à chaque scroll (l'ancien
  // IntersectionObserver ne voyait que les sections qui changeaient d'état, et n'observait
  // rien quand les sections n'étaient pas encore montées).
  useEffect(() => {
    if (view !== "grid" || filtered) return;
    const LINE = 190; // hauteur de la barre collante + marge
    let raf = 0;
    const compute = () => {
      raf = 0;
      let current: string = THEME_CATEGORIES[0];
      for (const cat of THEME_CATEGORIES) {
        const el = sectionRefs.current[cat];
        if (el && el.getBoundingClientRect().top <= LINE) current = cat;
      }
      setActiveCategory((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filtered]);

  // Défilement différé vers une catégorie demandée depuis le mode Swipe
  const pendingScrollRef = useRef<string | null>(null);
  useEffect(() => {
    if (view !== "grid" || !pendingScrollRef.current) return;
    const cat = pendingScrollRef.current;
    pendingScrollRef.current = null;
    const id = setTimeout(() => scrollToEl(sectionRefs.current[cat], -150), 350);
    return () => clearTimeout(id);
  }, [view]);

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
                onClick={() => {
                  if (view === "swipe") {
                    // En mode Swipe, les sections n'existent pas : on bascule sur la grille, puis on y va
                    // une fois la grille montée et mesurée (effet ci-dessous).
                    pendingScrollRef.current = cat;
                    switchView("grid");
                    setActiveCategory(cat);
                  } else {
                    scrollToEl(sectionRefs.current[cat], -150);
                  }
                }}
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
        {selected && view !== "swipe" && (
          <p className="text-xs text-ink-faint mt-2.5">
            Sélection : <span className="text-ink font-semibold">{selected.label}</span>
          </p>
        )}
      </div>

      {!filtered && (
        <div className="segmented max-w-xs -mt-2" role="tablist" aria-label="Affichage des thèmes">
          <button type="button" role="tab" aria-pressed={view === "swipe"} onClick={() => switchView("swipe")}><Layers size={14} className="inline -mt-0.5 mr-1" /> Swipe</button>
          <button type="button" role="tab" aria-pressed={view === "grid"} onClick={() => switchView("grid")}><LayoutGrid size={14} className="inline -mt-0.5 mr-1" /> Tout voir</button>
        </div>
      )}

      {!filtered && view === "swipe" ? (
        <ThemeSwipe themes={swipeOrder} photos={themePhotos} trending={trendingThemes} highlightId={dailyTheme?.id} onPlay={onSelect} />
      ) : filtered ? (
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
              <span className="relative poster-sub">{dailyTheme.text} — le même thème pour tout le monde cette semaine.</span>
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
