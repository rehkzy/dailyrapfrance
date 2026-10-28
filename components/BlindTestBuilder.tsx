"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Check, X, Play, Pause, Share2, ChevronUp, ChevronDown, Link2, Trash2, Music2, Sparkles, ChevronRight, Users } from "lucide-react";
import { Icon } from "@iconify/react";
import { encodeCustomSet, customPlayHref, listSavedCustoms, saveCustom, removeCustom, CUSTOM_MIN, CUSTOM_MAX, type CustomTrack, type SavedCustom } from "@/lib/customBlindtest";
import { shareOrCopy } from "@/lib/share";
import { sfx } from "@/lib/sfx";

/*
 * Constructeur de blind test personnalisé — « Tes morceaux, tes règles ».
 *
 * Cherche des titres ou des artistes (catalogue Deezer, extraits de 30 s), ou colle une
 * playlist Deezer publique ; compose ta liste (3 à 40 titres) ; joue tout de suite ou envoie
 * le lien. Tout est encodé dans le lien : pas de compte, pas de base, ça marche en soirée
 * comme en classe ou en entreprise. Les créations sont mémorisées sur l'appareil.
 */

type SearchArtist = { id: number; name: string; picture: string | null; fans: number };

export default function BlindTestBuilder() {
  const [title, setTitle] = useState("");
  const [tracks, setTracks] = useState<CustomTrack[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ tracks: CustomTrack[]; artists: SearchArtist[] }>({ tracks: [], artists: [] });
  const [searching, setSearching] = useState(false);
  const [artistBusy, setArtistBusy] = useState<number | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistState, setPlaylistState] = useState<"idle" | "loading" | "ok" | "other" | "invalid" | "unreachable">("idle");
  const [secs, setSecs] = useState<number | null>(null);
  const [answer, setAnswer] = useState<"qcm" | "text" | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedCustom[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setSaved(listSavedCustoms()), []);

  // Recherche avec léger délai (on ne tape pas une requête par touche)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults({ tracks: [], artists: [] });
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/blindtest/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults({ tracks: (data.tracks ?? []).map(normalize), artists: data.artists ?? [] });
      } catch {
        setResults({ tracks: [], artists: [] });
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  function normalize(t: { id: string | number; title: string; artistName: string; coverUrl: string | null; previewUrl: string }): CustomTrack {
    return { id: Number(t.id), title: t.title, artistName: t.artistName, coverUrl: t.coverUrl, previewUrl: t.previewUrl };
  }

  const ids = useMemo(() => new Set(tracks.map((t) => t.id)), [tracks]);
  const full = tracks.length >= CUSTOM_MAX;

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function add(t: CustomTrack) {
    if (ids.has(t.id)) return remove(t.id);
    if (full) return flash(`${CUSTOM_MAX} titres maximum`);
    sfx.click();
    setTracks((prev) => [...prev, t]);
  }
  function remove(id: number) {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  }
  function move(i: number, dir: -1 | 1) {
    setTracks((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function addArtistTop(a: SearchArtist) {
    setArtistBusy(a.id);
    try {
      const res = await fetch(`/api/blindtest/search?artist=${a.id}`);
      const data = await res.json();
      const list: CustomTrack[] = (data.tracks ?? []).map(normalize);
      setTracks((prev) => {
        const have = new Set(prev.map((t) => t.id));
        const fresh = list.filter((t) => !have.has(t.id)).slice(0, Math.max(0, CUSTOM_MAX - prev.length));
        flash(fresh.length ? `${fresh.length} titres de ${a.name} ajoutés` : "Rien à ajouter");
        return [...prev, ...fresh];
      });
      if (!title.trim()) setTitle(`Blind test ${a.name}`);
    } finally {
      setArtistBusy(null);
    }
  }

  async function importPlaylist() {
    const url = playlistUrl.trim();
    if (!url) return;
    setPlaylistState("loading");
    try {
      const res = await fetch(`/api/blindtest/playlist?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        setPlaylistState(data.error === "other" ? "other" : data.error === "unreachable" ? "unreachable" : "invalid");
        return;
      }
      const list: CustomTrack[] = (data.tracks ?? []).map(normalize);
      setTracks((prev) => {
        const have = new Set(prev.map((t) => t.id));
        const fresh = list.filter((t) => !have.has(t.id)).slice(0, Math.max(0, CUSTOM_MAX - prev.length));
        flash(`${fresh.length} titres importés`);
        return [...prev, ...fresh];
      });
      if (!title.trim() && data.title) setTitle(String(data.title).slice(0, 60));
      setPlaylistState("ok");
      setPlaylistUrl("");
    } catch {
      setPlaylistState("unreachable");
    }
  }

  function togglePreview(t: CustomTrack) {
    const a = audioRef.current;
    if (!a) return;
    if (playingId === t.id) {
      a.pause();
      setPlayingId(null);
      return;
    }
    a.src = t.previewUrl;
    a.currentTime = 0;
    a.play().then(() => setPlayingId(t.id)).catch(() => setPlayingId(null));
  }

  const ready = tracks.length >= CUSTOM_MIN;
  const code = useMemo(
    () => (ready ? encodeCustomSet({ v: 1, t: title.trim() || "Mon blind test", i: tracks.map((t) => t.id), s: secs ?? undefined, a: answer ?? undefined }) : null),
    [ready, title, tracks, secs, answer]
  );
  const finalTitle = title.trim() || "Mon blind test";

  function persist() {
    if (!code) return;
    const entry = { code, title: finalTitle, count: tracks.length, createdAt: new Date().toISOString() };
    saveCustom(entry);
    setSaved(listSavedCustoms());
  }

  function play(mode: "solo" | "local") {
    if (!code) return;
    sfx.click();
    persist();
    window.location.assign(customPlayHref(code, { mode }));
  }

  async function share(c = code, t = finalTitle, n = tracks.length) {
    if (!c) return;
    persist();
    const url = `https://dailyrapfrance.best${customPlayHref(c)}`;
    const res = await shareOrCopy({ title: `${t} — Blind test`, text: `🎤 ${t} : un blind test de ${n} titres, fait maison. Tu joues ?\n${url}`, url });
    if (res === "copied") flash("Lien copié — envoie-le dans le groupe");
  }

  return (
    <div className="stage blindtest-shell px-5 sm:px-6 lg:px-10" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 120px)" }}>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} onPause={() => setPlayingId(null)} />
      <div className="max-w-2xl lg:max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 pt-4 pb-2">
          <a href="/" aria-label="DailyRapFrance — accueil" className="inline-flex items-center"><img src="/logo.svg" alt="DailyRapFrance" className="h-6 sm:h-7 w-auto" /></a>
          <nav className="hidden md:flex items-center gap-0.5 text-[13px] font-semibold text-ink-muted whitespace-nowrap" aria-label="Navigation">
            <a href="/" className="h-10 px-3 rounded-full hover:text-ink hover:bg-white/6 inline-flex items-center">Accueil</a>
            <a href="/jouer" className="h-10 px-3 rounded-full hover:text-ink hover:bg-white/6 inline-flex items-center">Jouer</a>
            <a href="/blindtest/classement" className="h-10 px-3 rounded-full hover:text-ink hover:bg-white/6 inline-flex items-center">Classement</a>
          </nav>
          <a href="/jouer" className="h-10 px-3.5 rounded-full bg-white/6 text-xs font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-1.5"><Play size={13} fill="currentColor" /> Les thèmes</a>
        </div>

        <p className="stage-kicker mt-4 mb-2 inline-flex items-center gap-1.5"><Sparkles size={13} /> Nouveau · Tes morceaux, tes règles</p>
        <h1 className="stage-title mb-2">Crée ton<br />blind test.</h1>
        <p className="text-sm text-ink-muted mb-6 max-w-xl">Anniversaire, soirée, mariage, cours, team building : choisis {CUSTOM_MIN} à {CUSTOM_MAX} morceaux, donne un nom, et envoie le lien. Ça se joue sans compte, sur n&apos;importe quel téléphone, avec les extraits officiels de 30 secondes.</p>

        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
          <div className="space-y-5">
            {/* Nom */}
            <div className="ticket p-5">
              <label className="text-xs font-semibold text-ink-faint mb-2 block" htmlFor="bt-title">Le nom de ton blind test</label>
              <input id="bt-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Anniv de Sarah, Soirée années 2010, Spécial Marseille…" className="answer-input !min-h-[52px]" />
            </div>

            {/* Recherche */}
            <div className="ticket p-5">
              <p className="text-xs font-semibold text-ink-faint mb-2">Ajoute des morceaux</p>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Un titre, un artiste… (Jul, Bande organisée, PNL)" className="answer-input !min-h-[52px] !pl-11" inputMode="search" autoComplete="off" />
                {query && <button type="button" onClick={() => setQuery("")} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full grid place-items-center text-ink-faint hover:text-ink"><X size={14} /></button>}
              </div>
              {searching && <p className="text-xs text-ink-faint mt-3 animate-pulse">On cherche…</p>}
              {results.artists.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-3">
                  {results.artists.map((a) => (
                    <button key={a.id} type="button" onClick={() => addArtistTop(a)} disabled={artistBusy === a.id || full} className="inline-flex items-center gap-2 h-10 pl-1 pr-3 rounded-full bg-white/6 border border-white/10 text-xs font-semibold hover:bg-white/10 disabled:opacity-50">
                      {a.picture ? <img src={a.picture} alt="" className="w-8 h-8 rounded-full object-cover" /> : <span className="w-8 h-8 rounded-full bg-gold/20 grid place-items-center"><Music2 size={13} /></span>}
                      {artistBusy === a.id ? "Ajout…" : <>Top de {a.name} <Plus size={13} /></>}
                    </button>
                  ))}
                </div>
              )}
              {results.tracks.length > 0 && (
                <ul className="mt-3 divide-y divide-white/6 -mx-2">
                  {results.tracks.map((t) => {
                    const has = ids.has(t.id);
                    return (
                      <li key={t.id} className="flex items-center gap-3 px-2 py-2">
                        <button type="button" onClick={() => togglePreview(t)} aria-label={playingId === t.id ? "Pause" : "Écouter l'extrait"} className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-white/5 grid place-items-center">
                          {t.coverUrl && <img src={t.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />}
                          <span className="relative text-white">{playingId === t.id ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</span>
                        </button>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold truncate">{t.title}</span>
                          <span className="block text-xs text-ink-faint truncate">{t.artistName}</span>
                        </span>
                        <button type="button" onClick={() => add(t)} aria-label={has ? "Retirer" : "Ajouter"} className={`w-10 h-10 rounded-full grid place-items-center shrink-0 ${has ? "bg-gold text-white" : "bg-white/8 text-ink hover:bg-white/14"}`}>
                          {has ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={2.5} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!searching && query.trim().length >= 2 && results.tracks.length === 0 && results.artists.length === 0 && (
                <p className="text-xs text-ink-faint mt-3">Rien trouvé avec un extrait disponible. Essaie un autre titre ou le nom de l&apos;artiste.</p>
              )}
            </div>

            {/* Import playlist */}
            <div className="ticket p-5">
              <p className="text-xs font-semibold text-ink-faint mb-1 inline-flex items-center gap-1.5"><Link2 size={13} /> Ou colle une playlist Deezer</p>
              <p className="text-xs text-ink-faint mb-3">Playlist publique — tous ses titres avec extrait sont ajoutés d&apos;un coup.</p>
              <div className="flex gap-2">
                <input value={playlistUrl} onChange={(e) => { setPlaylistUrl(e.target.value); setPlaylistState("idle"); }} placeholder="https://www.deezer.com/fr/playlist/…" className="answer-input !min-h-[48px] !text-sm flex-1" inputMode="url" />
                <button type="button" onClick={importPlaylist} disabled={!playlistUrl.trim() || playlistState === "loading"} className="sticker sticker-ghost sticker-sm shrink-0">{playlistState === "loading" ? "…" : "Importer"}</button>
              </div>
              {playlistState === "other" && <p className="text-xs text-riseNeg mt-2">Spotify, Apple Music et YouTube ne peuvent pas être importés directement (leurs catalogues demandent une connexion et ne fournissent plus d&apos;extraits). Cherche les titres ci-dessus, ou recrée la liste sur Deezer puis colle son lien.</p>}
              {playlistState === "invalid" && <p className="text-xs text-riseNeg mt-2">Ce n&apos;est pas un lien de playlist Deezer.</p>}
              {playlistState === "unreachable" && <p className="text-xs text-riseNeg mt-2">Playlist introuvable — elle est peut-être privée.</p>}
            </div>
          </div>

          <div className="space-y-5 mt-5 lg:mt-0">
            {/* Sélection */}
            <div className="ticket">
              <div className="p-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="stage-kicker mb-1">Ta liste</p>
                  <p className="font-display text-2xl font-extrabold leading-tight truncate">{finalTitle}</p>
                  <p className="text-xs text-ink-faint mt-1">{tracks.length} / {CUSTOM_MAX} titres{tracks.length < CUSTOM_MIN ? ` · encore ${CUSTOM_MIN - tracks.length} pour jouer` : ""}</p>
                </div>
                {tracks.length > 0 && (
                  <button type="button" onClick={() => setTracks([])} className="text-xs font-semibold text-ink-faint hover:text-riseNeg inline-flex items-center gap-1 min-h-[40px] px-2"><Trash2 size={13} /> Vider</button>
                )}
              </div>
              <div className="ticket-cut" />
              {tracks.length === 0 ? (
                <div className="p-6 text-center text-sm text-ink-faint">
                  <Music2 size={22} className="mx-auto mb-2 text-ink-faint" />
                  Cherche un titre ou un artiste, tes morceaux apparaîtront ici.
                </div>
              ) : (
                <ul className="divide-y divide-white/6">
                  {tracks.map((t, i) => (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="score-num text-sm text-ink-faint w-5 text-right shrink-0">{i + 1}</span>
                      <button type="button" onClick={() => togglePreview(t)} aria-label={playingId === t.id ? "Pause" : "Écouter"} className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/5 grid place-items-center">
                        {t.coverUrl && <img src={t.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />}
                        <span className="relative text-white">{playingId === t.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</span>
                      </button>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold truncate">{t.title}</span>
                        <span className="block text-xs text-ink-faint truncate">{t.artistName}</span>
                      </span>
                      <span className="flex items-center shrink-0">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter" className="w-8 h-8 grid place-items-center text-ink-faint hover:text-ink disabled:opacity-20"><ChevronUp size={15} /></button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === tracks.length - 1} aria-label="Descendre" className="w-8 h-8 grid place-items-center text-ink-faint hover:text-ink disabled:opacity-20"><ChevronDown size={15} /></button>
                        <button type="button" onClick={() => remove(t.id)} aria-label="Retirer" className="w-8 h-8 grid place-items-center text-ink-faint hover:text-riseNeg"><X size={15} /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Règles imposées (optionnel) */}
            <div className="ticket p-5 space-y-4">
              <p className="text-xs font-semibold text-ink-faint">Règles (optionnel — sinon chacun règle comme il veut)</p>
              <div>
                <p className="text-xs text-ink-faint mb-2">Temps par extrait</p>
                <div className="segmented">
                  {[null, 15, 25, 45].map((v) => (
                    <button key={String(v)} type="button" aria-pressed={secs === v} onClick={() => { sfx.click(); setSecs(v); }}>{v === null ? "Libre" : `${v} s`}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-ink-faint mb-2">Réponse</p>
                <div className="segmented">
                  <button type="button" aria-pressed={answer === null} onClick={() => { sfx.click(); setAnswer(null); }}>Libre</button>
                  <button type="button" aria-pressed={answer === "qcm"} onClick={() => { sfx.click(); setAnswer("qcm"); }}>Facile · 3 choix</button>
                  <button type="button" aria-pressed={answer === "text"} onClick={() => { sfx.click(); setAnswer("text"); }}>Difficile · écrire</button>
                </div>
              </div>
              <p className="text-xs text-ink-faint">L&apos;ordre des titres est mélangé à chaque partie. Barème habituel : titre 1 pt, artiste 1 pt, featuring 2 pts.</p>
            </div>

            {ready && (
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => play("local")} className="sticker sticker-ghost h-14"><Users size={16} /> Entre potes</button>
                <button type="button" onClick={() => share()} className="sticker sticker-ghost h-14"><Share2 size={16} /> Envoyer le lien</button>
              </div>
            )}
          </div>
        </div>

        {/* Mes blind tests */}
        {saved.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold mb-3">Mes blind tests</h2>
            <div className="ticket divide-y divide-white/6">
              {saved.map((s) => (
                <div key={s.code} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-10 h-10 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0"><Icon icon="game-icons:music-spell" width={18} /></span>
                  <a href={customPlayHref(s.code)} className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{s.title}</span>
                    <span className="block text-xs text-ink-faint">{s.count} titres · {new Date(s.createdAt).toLocaleDateString("fr-FR")}</span>
                  </a>
                  <button type="button" onClick={() => share(s.code, s.title, s.count)} aria-label="Partager" className="w-10 h-10 rounded-full bg-white/6 grid place-items-center text-ink-muted hover:text-ink"><Share2 size={15} /></button>
                  <a href={customPlayHref(s.code)} aria-label="Jouer" className="w-10 h-10 rounded-full bg-gold text-white grid place-items-center"><Play size={15} fill="currentColor" /></a>
                  <button type="button" onClick={() => { removeCustom(s.code); setSaved(listSavedCustoms()); }} aria-label="Supprimer" className="w-10 h-10 rounded-full grid place-items-center text-ink-faint hover:text-riseNeg"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-ink-faint mt-10 max-w-xl">
          Idées : le blind test de ton anniversaire avec les sons de chaque invité, la soirée « que du 2016 », le quiz de fin d&apos;année de ta classe, le team building du bureau. Partage le lien, chacun joue sur son téléphone — ou lance « Entre potes » sur un seul écran avec un buzzer.
          <a href="/blindtest/creer" className="text-glow ml-1 inline-flex items-center gap-0.5">En savoir plus <ChevronRight size={12} /></a>
        </p>
      </div>

      {/* Action principale */}
      <div className="stage-fixed bottom-0 inset-x-0 px-5 pt-6 pointer-events-none" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#070404] via-[#070404]/90 to-transparent -z-10" aria-hidden="true" />
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <button type="button" disabled={!ready} onClick={() => play("solo")} className="sticker w-full h-16 text-lg">
            <Play size={20} fill="currentColor" /> {ready ? `Jouer — ${tracks.length} titres` : `Ajoute ${Math.max(0, CUSTOM_MIN - tracks.length)} titre${CUSTOM_MIN - tracks.length > 1 ? "s" : ""} pour jouer`}
          </button>
        </div>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
