"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check, X, Flame } from "lucide-react";
import { THEME_OPTIONS, THEME_CATEGORIES, FEATURED_THEME_IDS, type ThemeOption } from "@/lib/themes";
import ThemeCover from "@/components/ThemeCover";
import Row from "@/components/Row";

/*
 * Sélecteur de thème — unique, partagé par le wizard solo/local, la création de salon et
 * le rejeu de salon (avant, ce même bloc était dupliqué à l'identique 3 fois : source de
 * dérive garantie, comme le bug de deep-link ?mode= découvert plus tôt). Un seul endroit
 * à faire évoluer désormais.
 *
 * Trois idées de fond pour rendre le choix évident plutôt qu'une simple grille jolie :
 * 1. Recherche instantanée — si le joueur sait ce qu'il veut ("Werenoi"), il tape et
 *    obtient sa réponse en un geste, sans parcourir 5 catégories à la main.
 * 2. Navigation rapide par catégorie (pilules collantes) — pour parcourir en connaissance
 *    de cause plutôt qu'en scrollant à l'aveugle, comme un vrai store d'app.
 * 3. Barre de sélection persistante — le choix en cours reste visible en permanence,
 *    même après avoir défilé loin ; la confirmation avant "Suivant" ne demande jamais de
 *    remonter tout en haut pour vérifier ce qu'on a choisi.
 */

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
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollerRef = useRef<HTMLDivElement>(null);

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

  const selected = useMemo(() => THEME_OPTIONS.find((t) => t.id === themeId), [themeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return THEME_OPTIONS.filter((t) => t.label.toLowerCase().includes(q) || t.text.toLowerCase().includes(q));
  }, [query]);

  function jumpTo(cat: string) {
    sectionRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function pick(t: ThemeOption) {
    onSelect(t.id);
  }

  return (
    <div className="flex-1 flex flex-col gap-4 -mt-1">
      {/* Barre de sélection persistante — toujours visible, même loin dans la liste */}
      <div className="sticky top-0 z-10 -mx-1 px-1 pb-1 bg-bg/40 backdrop-blur-xl">
        <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3 mb-3">
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
            className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:border-gold/50 transition-colors"
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

        {/* Navigation rapide par catégorie — masquée pendant une recherche */}
        {!filtered && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {dailyTheme && (
              <button
                onClick={() => scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-mono uppercase tracking-wide border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
              >
                <Flame size={12} /> Défi
              </button>
            )}
            {THEME_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => jumpTo(cat)}
                className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-mono uppercase tracking-wide glass text-ink-muted hover:text-ink transition-colors"
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={scrollerRef} className="flex-1 flex flex-col gap-5">
        {/* Résultats de recherche — grille plate, plus de notion de catégorie une fois
            qu'on cherche quelque chose de précis */}
        {filtered ? (
          filtered.length === 0 ? (
            <p className="text-sm text-ink-faint text-center py-10">
              Aucun thème pour « {query} ». Essaie un artiste, une époque ou une région.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
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
                <div key={cat} ref={(el) => { sectionRefs.current[cat] = el; }} className="scroll-mt-32">
                  <div className="flex items-baseline justify-between mb-2.5 px-0.5">
                    <p className="font-display text-base font-semibold">{cat}</p>
                    <span className="font-mono text-[10px] text-ink-faint">{items.length}</span>
                  </div>
                  <Row>
                    {items.map((t, i) => (
                      <button
                        key={t.id}
                        onClick={() => pick(t)}
                        className="relative w-[92px] sm:w-[104px] shrink-0 snap-start text-left"
                      >
                        {trendingThemes.has(t.id) && <TrendingBadge />}
                        <ThemeCover Icon={t.Icon} label={t.label} index={i} active={themeId === t.id} photoUrl={themePhotos[t.id]} />
                      </button>
                    ))}
                    {/* Repère de fin de rangée — confirme qu'il n'y a rien de plus à droite,
                        pour ne pas laisser croire à un chargement infini qui ne vient pas. */}
                    <span className="shrink-0 w-1" aria-hidden="true" />
                  </Row>
                </div>
              );
            })}
          </>
        )}
      </div>
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
