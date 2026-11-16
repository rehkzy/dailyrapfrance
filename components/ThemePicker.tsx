"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, Flame, ChevronRight, ChevronLeft, Layers, History, TrendingUp } from "lucide-react";
import ThemeSwipe from "@/components/ThemeSwipe";
import { THEME_OPTIONS, THEME_CATEGORIES, FEATURED_THEME_IDS, PHOTO_THEME_IDS, type ThemeOption } from "@/lib/themes";
import ThemeCover from "@/components/ThemeCover";
import BrandMark from "@/components/BrandMark";

/*
 * Sélecteur de thème (v4) — partagé par le jeu solo/local, la création de salon et le rejeu.
 *
 * Le catalogue fait ~190 thèmes : empilés, c'était 90 rangées à faire défiler. Désormais :
 *  - « Pour toi » (écran d'accueil) : défi de la semaine, tes thèmes récents, les tendances,
 *    puis UNE rangée horizontale par catégorie (8 thèmes + « Tout voir »). Tout tient en
 *    deux ou trois écrans, et on a toujours une catégorie sous le pouce.
 *  - Les onglets FILTRENT : un onglet = seulement cette catégorie, en grille dense
 *    (3 colonnes sur téléphone). Les artistes ont en plus un index A–Z.
 *  - La recherche reste en haut, collante, et cherche dans tout.
 *  - Le mode « Swipe » (pile de cartes) reste disponible pour ceux qui aiment.
 */

const RECENT_KEY = "drf-recent-themes";
const ROW_LIMIT = 6; // 6 affiches + la carte « +N » = 7 cases, la ligne complète sur ordinateur
const POUR_TOI = "Pour toi";
const COMMUNITY_CAT = "Communauté";

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function pushRecent(id: string) {
  try {
    const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}
function firstLetter(label: string) {
  const l = label.replace(/^Blind Test /i, "").trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const c = l[0] ?? "#";
  return /[A-Z]/.test(c) ? c : "#";
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
  // Les covers de playlists sont des fichiers du site : affichées tout de suite, sans attendre les photos Deezer.
  const [themePhotos, setThemePhotos] = useState<Record<string, string | string[]>>(() => Object.fromEntries(THEME_OPTIONS.filter((t) => t.image).map((t) => [t.id, t.image!])));
  const [trendingThemes, setTrendingThemes] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<string>(POUR_TOI);
  const [letter, setLetter] = useState<string | null>(null);
  const [view, setView] = useState<"swipe" | "browse">("browse");

  useEffect(() => {
    setRecent(readRecent());
    try {
      if (localStorage.getItem("drf-theme-view") === "swipe") setView("swipe");
    } catch {}
    fetch("/api/blindtest/trending")
      .then((r) => r.json())
      .then((d) => setTrendingThemes(new Set([...FEATURED_THEME_IDS, ...(d.themes ?? [])])))
      .catch(() => setTrendingThemes(new Set(FEATURED_THEME_IDS)));
    fetch(`/api/blindtest/theme-art?themes=${PHOTO_THEME_IDS.join(",")}`)
      .then((r) => r.json())
      .then((data) => setThemePhotos((prev) => ({ ...prev, ...(data.photos ?? {}) })))
      .catch(() => {});
  }, []);

  function switchView(v: "swipe" | "browse") {
    setView(v);
    try { localStorage.setItem("drf-theme-view", v); } catch {}
  }
  function pick(id: string) {
    pushRecent(id);
    setRecent(readRecent());
    onSelect(id);
  }
  function openTab(cat: string) {
    setTab(cat);
    setLetter(null);
    setQuery("");
    // On remonte en haut du sélecteur : la grille de la catégorie commence là.
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number, o?: object) => void } }).__lenis;
    const top = Math.max(0, (document.getElementById("theme-picker")?.getBoundingClientRect().top ?? 0) + window.scrollY - 76);
    if (window.scrollY > top) {
      if (lenis?.scrollTo) lenis.scrollTo(top, { duration: 0.5 });
      else window.scrollTo({ top, behavior: "smooth" });
    }
  }

  const byId = useMemo(() => new Map(THEME_OPTIONS.map((t) => [t.id, t])), []);
  const selected = byId.get(themeId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return THEME_OPTIONS.filter((t) => `${t.label} ${t.text} ${t.keywords ?? ""}`.toLowerCase().includes(q));
  }, [query]);

  const swipeOrder = useMemo(() => {
    const pool = THEME_OPTIONS.filter((t) => t.id !== "mix" && t.id !== "random");
    const daily = pool.filter((t) => t.id === dailyTheme?.id);
    const hot = pool.filter((t) => t.id !== dailyTheme?.id && trendingThemes.has(t.id));
    const rest = pool.filter((t) => t.id !== dailyTheme?.id && !trendingThemes.has(t.id)).sort(() => Math.random() - 0.5);
    return [...daily, ...hot, ...rest];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendingThemes.size, dailyTheme?.id]);

  const trendingList = useMemo(() => THEME_OPTIONS.filter((t) => trendingThemes.has(t.id)), [trendingThemes]);
  const recentList = useMemo(() => recent.map((id) => byId.get(id)).filter((t): t is ThemeOption => !!t), [recent, byId]);

  const Poster = ({ t, i, dense }: { t: ThemeOption; i: number; dense?: boolean }) => (
    <button type="button" onClick={() => pick(t.id)} aria-pressed={themeId === t.id} className="text-left" data-dense={dense || undefined}>
      <ThemeCover
        Icon={t.Icon}
        label={t.label}
        index={i}
        active={themeId === t.id}
        photoUrl={themePhotos[t.id]}
        plain={!!t.image}
        tag={trendingThemes.has(t.id) ? "Tendance" : t.lang ? t.lang : t.category === "Playlists" ? "Playlist" : undefined}
      />
    </button>
  );

  /* Une rangée horizontale : titre, « Tout voir », 8 affiches + carte de fin */
  const Row = ({ title, items, cat, Icon }: { title: string; items: ThemeOption[]; cat?: string; Icon?: typeof Flame }) => {
    if (!items.length) return null;
    // Une carte « +1 » n'a pas de sens : à 7 thèmes, on les montre tous.
    const shown = items.length <= ROW_LIMIT + 1 ? items : items.slice(0, ROW_LIMIT);
    const more = items.length - shown.length;
    return (
      <section className="theme-row-wrap">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-xl font-extrabold tracking-tight inline-flex items-center gap-2">
            {Icon && <Icon size={18} className="text-glow" />}
            {title}
          </h3>
          {cat && more > 0 && (
            <button type="button" onClick={() => openTab(cat)} className="text-[13px] font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-0.5">
              Tout voir <span className="text-ink-faint">({items.length})</span> <ChevronRight size={14} />
            </button>
          )}
        </div>
        <div className="theme-row">
          {shown.map((t, i) => (
            <Poster key={t.id} t={t} i={i} />
          ))}
          {cat && more > 0 && (
            <button type="button" onClick={() => openTab(cat)} className="theme-row-more" aria-label={`Voir les ${more} autres thèmes ${title}`}>
              <span className="font-display text-3xl font-extrabold">+{more}</span>
              <span className="text-xs font-semibold text-ink-muted">Tout voir</span>
            </button>
          )}
        </div>
      </section>
    );
  };

  const catItems = tab !== POUR_TOI && tab !== COMMUNITY_CAT ? THEME_OPTIONS.filter((t) => t.category === tab) : [];
  const letters = useMemo(() => {
    if (tab !== "Artistes") return [];
    const set = new Set(catItems.map((t) => firstLetter(t.label)));
    return [...set].sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
  const catShown = letter ? catItems.filter((t) => firstLetter(t.label) === letter) : catItems;

  return (
    <div id="theme-picker" className="flex flex-col gap-5">
      {/* Barre collante : recherche + onglets (filtres) */}
      <div className="sticky z-10 -mx-5 px-5 sm:-mx-6 sm:px-6 pt-2 pb-2.5 bg-[#070404]" style={{ top: "calc(64px + env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Un artiste, une époque, une ville…"
              aria-label="Chercher un thème"
              className="answer-input !pl-11 !pr-10 !min-h-[48px] !text-[15px]"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center text-ink-faint hover:text-ink">
                <X size={16} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => switchView(view === "swipe" ? "browse" : "swipe")}
            aria-pressed={view === "swipe"}
            title={view === "swipe" ? "Revenir au catalogue" : "Mode Swipe"}
            className={`shrink-0 h-12 w-12 grid place-items-center rounded-2xl border transition-colors ${view === "swipe" ? "bg-white text-black border-white" : "bg-white/6 border-white/10 text-ink-muted hover:text-ink"}`}
          >
            <Layers size={18} />
          </button>
        </div>
        {!filtered && view !== "swipe" && (
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar mt-2.5 -mx-1 px-1">
            {[POUR_TOI, ...THEME_CATEGORIES, COMMUNITY_CAT].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => openTab(cat)}
                aria-pressed={tab === cat}
                className={`shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors ${tab === cat ? "bg-white text-black" : "bg-white/8 text-ink-muted hover:text-ink"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === "swipe" && !filtered ? (
        <ThemeSwipe themes={swipeOrder} photos={themePhotos} trending={trendingThemes} highlightId={dailyTheme?.id} onPlay={pick} onClose={() => switchView("browse")} />
      ) : filtered ? (
        filtered.length === 0 ? (
          <p className="text-sm text-ink-faint text-center py-10">Rien pour « {query} ». Essaie un artiste, une époque ou une ville.</p>
        ) : (
          <>
            <p className="text-xs text-ink-faint -mt-2">{filtered.length} thème{filtered.length > 1 ? "s" : ""}</p>
            <div className="theme-grid theme-grid--dense">
              {filtered.map((t, i) => (
                <Poster key={t.id} t={t} i={i} dense />
              ))}
            </div>
          </>
        )
      ) : tab === POUR_TOI ? (
        <>
          {dailyTheme && (
            <button
              type="button"
              onClick={() => pick(dailyTheme.id)}
              aria-pressed={themeId === dailyTheme.id}
              className="poster !aspect-auto !max-w-none !flex-none w-full min-h-[112px] p-5"
              data-active={themeId === dailyTheme.id}
              style={{ "--poster-bg": "linear-gradient(120deg, #1b0507 0%, #8a0010 55%, #f0001c 130%)" } as React.CSSProperties}
            >
              <BrandMark className="poster-mark !w-[46%] !-top-[30%] !-right-[8%]" size="46%" />
              <span className="poster-tag inline-flex items-center gap-1"><Flame size={11} /> Défi de la semaine</span>
              <span className="relative poster-title !text-[1.6rem] mt-6">{dailyTheme.label.replace(/^Blind Test /i, "")}</span>
              <span className="relative poster-sub">{dailyTheme.text}</span>
            </button>
          )}

          {selected && (
            <p className="text-xs text-ink-faint -mt-1">
              Sélection : <span className="text-ink font-semibold">{selected.label.replace(/^Blind Test /i, "")}</span>
            </p>
          )}

          <Row title="Tes derniers thèmes" items={recentList} Icon={History} />
          <Row title="Tendances" items={trendingList} Icon={TrendingUp} />
          {THEME_CATEGORIES.map((cat) => (
            <Row key={cat} title={cat} cat={cat} items={THEME_OPTIONS.filter((t) => t.category === cat)} />
          ))}
          <CommunitySection compact onMore={() => openTab(COMMUNITY_CAT)} />
        </>
      ) : tab === COMMUNITY_CAT ? (
        <>
          <button type="button" onClick={() => openTab(POUR_TOI)} className="back-link -mt-1"><ChevronLeft size={16} /> Pour toi</button>
          <CommunitySection />
        </>
      ) : (
        <>
          <div className="flex items-baseline justify-between -mt-1">
            <button type="button" onClick={() => openTab(POUR_TOI)} className="back-link"><ChevronLeft size={16} /> Pour toi</button>
            <span className="text-xs text-ink-faint">{catShown.length} thème{catShown.length > 1 ? "s" : ""}</span>
          </div>
          {letters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 -mt-2">
              <button type="button" onClick={() => setLetter(null)} aria-pressed={!letter} className={`h-8 min-w-8 px-2.5 rounded-lg text-[12px] font-bold ${!letter ? "bg-white text-black" : "bg-white/8 text-ink-muted"}`}>Tous</button>
              {letters.map((l) => (
                <button key={l} type="button" onClick={() => setLetter(l === letter ? null : l)} aria-pressed={letter === l} className={`h-8 min-w-8 px-2 rounded-lg text-[12px] font-bold ${letter === l ? "bg-white text-black" : "bg-white/8 text-ink-muted"}`}>{l}</button>
              ))}
            </div>
          )}
          <div className="theme-grid theme-grid--dense">
            {catShown.map((t, i) => (
              <Poster key={t.id} t={t} i={i} dense />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type CommunityItem = { id: string; slug: string; title: string; cover?: string | null; track_ids: number[]; plays: number; featured?: boolean; profiles?: { username?: string; display_name?: string; verified?: boolean } | { username?: string; display_name?: string; verified?: boolean }[] | null };

/* Les blind tests publics des joueurs : une rangée dans « Pour toi », une grille complète dans
   l'onglet Communauté. C'est ici qu'on choisit « à quoi jouer », donc ils ont leur place ici. */
function CommunitySection({ compact = false, onMore }: { compact?: boolean; onMore?: () => void }) {
  const [items, setItems] = useState<CommunityItem[] | null>(null);
  useEffect(() => {
    fetch("/api/blindtest/custom?community=all").then((r) => r.json()).then((d) => setItems(d.community ?? [])).catch(() => setItems([]));
  }, []);
  const list = items ?? [];
  if (compact && items && list.length === 0) return null;
  const shown = compact ? list.slice(0, 6) : list;
  const Card = ({ it }: { it: CommunityItem }) => {
    const p = Array.isArray(it.profiles) ? it.profiles[0] : it.profiles;
    return (
      <a href={`/b/${it.slug}?go=1`} className="ticket overflow-hidden flex flex-col">
        <span className="block relative aspect-square bg-gradient-to-br from-[#3a0a0f] to-[#8a0010]">
          {it.cover && <img src={it.cover} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />}
          {it.featured && <span className="absolute left-2 top-2 rounded-full bg-black/60 backdrop-blur text-[10px] font-bold text-gold px-2 py-0.5">★ Sélection</span>}
          <span className="absolute right-2 bottom-2 rounded-full bg-black/60 backdrop-blur text-[10px] font-bold text-white px-2 py-0.5">{it.track_ids.length} titres</span>
        </span>
        <span className="p-2.5 min-w-0">
          <span className="block text-[13px] font-semibold truncate">{it.title}</span>
          <span className="block text-[11px] text-ink-faint truncate">par {p?.display_name ?? p?.username ?? "un joueur"} · {it.plays} partie{it.plays > 1 ? "s" : ""}</span>
        </span>
      </a>
    );
  };
  return (
    <section className="theme-row-wrap">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-xl font-extrabold tracking-tight">Communauté</h3>
        {compact && list.length > 6 && onMore && (
          <button type="button" onClick={onMore} className="text-[13px] font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-0.5">
            Tout voir <span className="text-ink-faint">({list.length})</span> <ChevronRight size={14} />
          </button>
        )}
      </div>
      {items && list.length === 0 && (
        <div className="ticket p-5 text-sm text-ink-muted">Aucun blind test public pour l&apos;instant. <a href="/creer" className="text-glow font-semibold">Crée le tien</a> et rends-le public : il apparaîtra ici pour tout le monde.</div>
      )}
      {compact ? (
        <div className="theme-row">
          {shown.map((it) => <Card key={it.id} it={it} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {shown.map((it) => <Card key={it.id} it={it} />)}
        </div>
      )}
      {!compact && <a href="/creer" className="hub-link mt-3"><span className="min-w-0"><span className="block text-sm font-bold">Crée ton blind test</span><span className="block text-xs text-ink-muted">Tes morceaux, ton lien, public si tu veux</span></span></a>}
    </section>
  );
}
