"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check, X, Flame, ArrowUp } from "lucide-react";
import { THEME_OPTIONS, THEME_CATEGORIES, FEATURED_THEME_IDS, type ThemeOption } from "@/lib/themes";
import ThemeCover from "@/components/ThemeCover";

/*
 * Sélecteur de thème — unique, partagé par le wizard solo/local, la création de salon et
 * le rejeu de salon.
 *
 * Reconstruit autour d'un principe simple : UN SEUL axe de scroll (vertical), jamais deux
 * en même temps. La version précédente empilait un carrousel horizontal PAR catégorie dans
 * une page qui scrolle verticalement — sur mobile, le doigt ne sait jamais lequel des deux
 * axes il est en train de faire défiler, ce qui donnait l'impression que le scroll "buggait"
 * pile au changement de catégorie. Toutes les catégories sont désormais une grille qui
 * s'enchaîne verticalement, comme la vue recherche — plus simple à parcourir, plus simple
 * à défiler, plus simple à comprendre.
 *
 * Deuxième correction : le site utilise Lenis (scroll fluide personnalisé, voir
 * window.__lenis). Un scrollIntoView() natif — ce qu'utilisaient les pastilles de
 * catégorie — se bat avec Lenis qui recalcule sa propre position de scroll en parallèle,
 * ce qui donnait des sauts, des à-coups, ou un scroll qui n'arrivait pas au bon endroit.
 * On passe maintenant par l'API de Lenis quand elle existe, avec un repli natif sinon.
 */

function scrollToEl(el: HTMLElement | null, offset: number) {
  if (!el) return;
  const lenis = (window as unknown as { __lenis?: { scrollTo: (target: HTMLElement, opts?: object) => void } }).__lenis;
  if (lenis?.scrollTo) {
    lenis.scrollTo(el, { offset, duration: 0.9 });
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y, behavior: "smooth" });
  }
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
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/blindtest/trending")
      .then((r) => r.json())
      .then((d) => setTrendingThemes(new Set([...FEATURED_THEME_IDS, ...(d.themes ?? [])])))
      .catch(() => {});
    fetch(`/api/blindtest/theme-art?themes=${THEME_OPTIONS.filter((t) => t.category !== "Top 50").map((t) => t.id).join(",")}`)
      .then((r) => r.json())
      .then((data) => setThemePhotos(data.photos ?? {}))
      .catch(() => {});
  }, []);

  // Surligne automatiquement la pastille de la catégorie qu'on est en train de regarder —
  // fini de deviner "où" on est dans la liste après avoir scrollé un moment.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          const cat = (visible.target as HTMLElement).dataset.category;
          if (cat) setActiveCategory(cat);
        }
      },
      { rootMargin: "-140px 0px -70% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themePhotos]);

  // Bouton "Remonter" — apparaît une fois qu'on a vraiment scrollé, pas dès le premier pixel.
  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > 480);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const selected = useMemo(() => THEME_OPTIONS.find((t) => t.id === themeId), [themeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return THEME_OPTIONS.filter((t) => t.label.toLowerCase().includes(q) || t.text.toLowerCase().includes(q));
  }, [query]);

  function jumpTo(cat: string) {
    scrollToEl(sectionRefs.current[cat], -120);
  }

  function backToTop() {
    const lenis = (window as unknown as { __lenis?: { scrollTo: (target: number, opts?: object) => void } }).__lenis;
    if (lenis?.scrollTo) lenis.scrollTo(0, { duration: 0.9 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pick(t: ThemeOption) {
    onSelect(t.id);
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col gap-4 -mt-1">
      {/* Barre de sélection persistante — toujours visible, même loin dans la liste */}
      <div className="sticky top-0 z-10 -mx-1 px-1 pb-1">
        <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3 mb-3 backdrop-blur-xl">
          <div className="icon-tile w-9 h-9 shrink-0 bg-gradient-to-br from-gold to-glow text-white">
            {selected ? <selected.Icon size={16} /> : <Search size={16} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono uppercase tracking-wide text-ink-faint">Thème choisi</p>
            <p className="text-sm font-semibold truncate">{selected?.label ?? "Choisis un thème ci-dessous"}</p>
          </div>
        </div>

        {/* Recherche instantanée */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un thème, un artiste, une époque..."
            className="w-full bg-bg/50 backdrop-blur-xl border border-white/10 rounded-full pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Navigation rapide par catégorie — la catégorie active se surligne toute seule.
            Masquée pendant une recherche (plus de notion de catégorie à ce moment-là). */}
        {!filtered && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {dailyTheme && (
              <button
                onClick={backToTop}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-mono uppercase tracking-wide border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
              >
                <Flame size={12} /> Défi
              </button>
            )}
            {THEME_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => jumpTo(cat)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-mono uppercase tracking-wide backdrop-blur-xl transition-colors ${
                  activeCategory === cat ? "bg-gold text-white" : "glass text-ink-muted hover:text-ink"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-6">
        {/* Résultats de recherche — même grille que la liste normale, juste sans notion de
            catégorie une fois qu'on cherche quelque chose de précis */}
        {filtered ? (
          filtered.length === 0 ? (
            <p className="text-sm text-ink-faint text-center py-10">
              Aucun thème pour « {query} ». Essaie un artiste, une époque ou une région.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered.map((t, i) => (
                <button key={t.id} onClick={() => pick(t)} className="relative text-left">
                  {trendingThemes.has(t.id) && <TrendingBadge />}
                  <ThemeCover Icon={t.Icon} label={t.label} index={i} active={themeId === t.id} photoUrl={themePhotos[t.id]} />
                </button>
              ))}
            </div>
          )
        ) : (
          <>
            {/* Défi du jour — même thème imposé pour tout le monde aujourd'hui */}
            {dailyTheme && (
              <button
                onClick={() => onSelect(dailyTheme.id)}
                className={`tap-press group relative w-full flex items-center gap-4 rounded-2xl p-4 text-left overflow-hidden border transition-[box-shadow,border-color] duration-200 ${
                  themeId === dailyTheme.id
                    ? "border-gold shadow-[0_0_0_1px_rgba(240,0,28,0.4),0_10px_28px_-8px_rgba(240,0,28,0.55)]"
                    : "border-gold/30 hover:border-gold/50"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#3a0a0a] via-[#780101]/70 to-transparent opacity-70" aria-hidden="true" />
                <div className="icon-tile relative w-12 h-12 shrink-0 bg-gradient-to-br from-gold to-glow text-white">
                  <Flame size={20} strokeWidth={2} />
                </div>
                <span className="relative min-w-0 flex-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Défi du jour</span>
                  <span className="block text-sm font-semibold mt-0.5">{dailyTheme.label}</span>
                  <span className="block text-xs text-ink-faint mt-0.5">{dailyTheme.text}</span>
                </span>
                {themeId === dailyTheme.id && (
                  <div className="relative w-7 h-7 shrink-0 rounded-full bg-gold text-white flex items-center justify-center">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            )}

            {THEME_CATEGORIES.map((cat) => {
              const items = THEME_OPTIONS.filter((t) => t.category === cat);
              return (
                <div
                  key={cat}
                  ref={(el) => { sectionRefs.current[cat] = el; }}
                  data-category={cat}
                  className="scroll-mt-32"
                >
                  <div className="flex items-baseline justify-between mb-2.5 px-0.5">
                    <p className="font-display text-base font-semibold">{cat}</p>
                    <span className="font-mono text-[10px] text-ink-faint">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {items.map((t, i) => (
                      <button key={t.id} onClick={() => pick(t)} className="relative text-left">
                        {trendingThemes.has(t.id) && <TrendingBadge />}
                        <ThemeCover Icon={t.Icon} label={t.label} index={i} active={themeId === t.id} photoUrl={themePhotos[t.id]} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Remonter — pour "revenir en arrière" sans avoir à re-scroller toute la liste à la
          main. N'apparaît qu'une fois qu'on a vraiment avancé dans la page. */}
      {showBackToTop && (
        <button
          onClick={backToTop}
          aria-label="Remonter en haut"
          className="fixed bottom-28 right-4 z-20 w-11 h-11 rounded-full bg-gold hover:bg-glow text-white shadow-[0_6px_20px_rgba(240,0,28,0.45)] flex items-center justify-center transition-colors"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}

function TrendingBadge() {
  return (
    <span
      className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-gradient-to-br from-glow to-gold text-white flex items-center justify-center shadow-[0_4px_12px_rgba(240,0,28,0.5)] ring-2 ring-bg/70"
      title="En tendance"
    >
      <Flame size={12} fill="currentColor" />
    </span>
  );
}
