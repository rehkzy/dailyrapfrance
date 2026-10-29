"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Check, X, Play, Pause, Image as ImageIcon, Loader2, Share2, ChevronUp, ChevronDown, Link2, Trash2, Music2, Sparkles, ChevronRight, Users, Save, Globe, Lock, LogIn, Pencil } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import SignInCta from "@/components/SignInCta";
import { Icon } from "@iconify/react";
import VerifiedBadge from "@/components/VerifiedBadge";
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
type SavedItem = {
  id: string; slug: string; title: string; description: string | null; cover?: string | null; track_ids: number[];
  settings: { s?: number; a?: "qcm" | "text" }; is_public: boolean; plays: number; created_at: string; user_id: string;
  profiles?: { username?: string; display_name?: string; avatar_url?: string; verified?: boolean } | { username?: string; display_name?: string; avatar_url?: string; verified?: boolean }[] | null;
};
function itemHref(it: SavedItem, extra = "") { return `/b/${it.slug}${extra}`; }
function itemAuthor(it: SavedItem) { const p = Array.isArray(it.profiles) ? it.profiles[0] : it.profiles; return p?.display_name ?? p?.username ?? "Un joueur"; }
function itemVerified(it: SavedItem) { const p = Array.isArray(it.profiles) ? it.profiles[0] : it.profiles; return !!p?.verified; }

export default function BlindTestBuilder() {
  const [title, setTitle] = useState("");
  const [tracks, setTracks] = useState<CustomTrack[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ tracks: CustomTrack[]; artists: SearchArtist[] }>({ tracks: [], artists: [] });
  const [searching, setSearching] = useState(false);
  const [artistBusy, setArtistBusy] = useState<number | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistState, setPlaylistState] = useState<"idle" | "loading" | "ok" | "other" | "invalid" | "unreachable">("idle");
  const [missing, setMissing] = useState<{ title: string; artist: string }[]>([]);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [secs, setSecs] = useState<number | null>(null);
  const [answer, setAnswer] = useState<"qcm" | "text" | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedCustom[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compte : enregistrer dans son profil, rendre public, lien court /b/<slug>
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [mine, setMine] = useState<SavedItem[]>([]);
  const [community, setCommunity] = useState<SavedItem[]>([]);
  const [editing, setEditing] = useState<SavedItem | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [askLogin, setAskLogin] = useState(false);

  useEffect(() => setSaved(listSavedCustoms()), []);

  const loadLists = async () => {
    try {
      const res = await fetch("/api/blindtest/custom", { cache: "no-store" });
      const data = await res.json();
      setMine(data.mine ?? []);
      setCommunity(data.community ?? []);
    } catch {}
  };
  useEffect(() => { void loadLists(); }, [user?.id]);

  // Depuis l'actu : /creer?q=<artiste> pré-remplit la recherche
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modifier un blind test enregistré : /creer?b=<slug>
  useEffect(() => {
    const slug = searchParams.get("b");
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/blindtest/custom?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        const it: SavedItem | undefined = data.item;
        if (!it) return;
        const pool = await fetch(`/api/blindtest/pool?ids=${it.track_ids.join(",")}&order=keep&count=40`).then((r) => r.json());
        setTracks((pool.tracks ?? []).map(normalize));
        setTitle(it.title);
        setDescription(it.description ?? "");
        setIsPublic(it.is_public);
        setCover(it.cover ?? null);
        setSecs(it.settings?.s ?? null);
        setAnswer(it.settings?.a ?? null);
        setEditing(it);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) { if (!user) setAskLogin(true); return; }
    if (!file.type.startsWith("image/") || file.size > 6 * 1024 * 1024) { flash("Image JPG/PNG/WebP, 6 Mo max"); return; }
    setCoverBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/cover-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { cacheControl: "3600", upsert: true });
      if (error) { flash("Envoi impossible — réessaie"); return; }
      setCover(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
    } finally {
      setCoverBusy(false);
    }
  }

  async function saveToProfile() {
    if (!code) return;
    if (!user) {
      setAskLogin(true);
      return;
    }
    setSaving("busy");
    try {
      const res = await fetch("/api/blindtest/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing?.id, title: finalTitle, description, trackIds: tracks.map((t) => t.id), settings: { s: secs ?? undefined, a: answer ?? undefined }, isPublic, cover }),
      });
      const data = await res.json();
      if (!res.ok || !data.item) throw new Error(data.error ?? "save");
      setEditing(data.item);
      setSaving("done");
      flash(editing ? "Modifications enregistrées" : "Enregistré dans ton profil");
      void loadLists();
      setTimeout(() => setSaving("idle"), 2000);
    } catch {
      setSaving("error");
      setTimeout(() => setSaving("idle"), 2500);
    }
  }
  async function deleteSaved(it: SavedItem) {
    await fetch(`/api/blindtest/custom?id=${it.id}`, { method: "DELETE" });
    if (editing?.id === it.id) setEditing(null);
    void loadLists();
  }

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
    setMissing([]);
    setImportNote(null);
    try {
      const res = await fetch(`/api/blindtest/playlist?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        setPlaylistState(data.error === "other" ? "other" : data.error === "unreachable" ? "unreachable" : "invalid");
        return;
      }
      const list: CustomTrack[] = (data.tracks ?? []).map(normalize);
      let added = 0;
      setTracks((prev) => {
        const have = new Set(prev.map((t) => t.id));
        const fresh = list.filter((t) => !have.has(t.id)).slice(0, Math.max(0, CUSTOM_MAX - prev.length));
        added = fresh.length;
        return [...prev, ...fresh];
      });
      const miss: { title: string; artist: string }[] = data.missing ?? [];
      setMissing(miss);
      const src = data.source === "spotify" ? "Spotify" : "Deezer";
      setImportNote(`${list.length} titre${list.length > 1 ? "s" : ""} retrouvé${list.length > 1 ? "s" : ""} depuis ${src}${miss.length ? `, ${miss.length} indisponible${miss.length > 1 ? "s" : ""}` : ""}${data.truncated ? ` (les ${CUSTOM_MAX} premiers de ${data.truncated})` : ""}.`);
      flash(`${added} titres ajoutés`);
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
    const url = `https://dailyrapfrance.best${editing && c === code ? itemHref(editing) : customPlayHref(c)}`;
    const res = await shareOrCopy({ title: `${t} — Blind test`, text: `🎤 ${t} : un blind test de ${n} titres, fait maison. Tu joues ?\n${url}`, url });
    if (res === "copied") flash("Lien copié — envoie-le dans le groupe");
  }

  return (
    <div className="stage blindtest-shell px-5 sm:px-6 lg:px-10" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 120px)" }}>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} onPause={() => setPlayingId(null)} />
      <div className="max-w-2xl lg:max-w-6xl mx-auto">

        <p className="stage-kicker mt-4 mb-2 inline-flex items-center gap-1.5"><Sparkles size={13} /> Nouveau · Tes morceaux, tes règles</p>
        <h1 className="stage-title mb-2">Crée ton<br />blind test.</h1>
        <p className="text-sm text-ink-muted mb-6 max-w-xl">Anniversaire, soirée, mariage, cours, team building : choisis {CUSTOM_MIN} à {CUSTOM_MAX} morceaux, donne un nom, et envoie le lien. Ça se joue sans compte, sur n&apos;importe quel téléphone, avec les extraits officiels de 30 secondes.</p>

        {/* Tes blind tests d'abord — comme les brouillons d'une app : on retrouve ce qu'on a fait avant de créer */}
        {(mine.length > 0 || saved.length > 0) && (
          <section className="mb-7" aria-labelledby="mine-title">
            <div className="flex items-baseline justify-between mb-2.5">
              <h2 id="mine-title" className="font-display text-lg font-bold">Mes blind tests <span className="text-ink-faint font-semibold text-sm">({mine.length + saved.length})</span></h2>
              {editing && <button type="button" onClick={() => { setEditing(null); setTitle(""); setTracks([]); setDescription(""); setIsPublic(false); setCover(null); }} className="text-xs font-semibold text-glow inline-flex items-center gap-1"><Plus size={12} /> Nouveau</button>}
            </div>
            <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 snap-x" style={{ scrollbarWidth: "none" }}>
              {mine.map((it) => (
                <div key={it.id} className={`ticket p-3.5 w-[230px] shrink-0 snap-start flex flex-col gap-2.5 ${editing?.id === it.id ? "!border-gold" : ""}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {it.cover ? <img src={it.cover} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" /> : <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${it.is_public ? "bg-gold/15 text-gold" : "bg-white/6 text-ink-muted"}`}>{it.is_public ? <Globe size={14} /> : <Lock size={14} />}</span>}
                    <a href={itemHref(it)} className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate">{it.title}</span>
                      <span className="block text-[11px] text-ink-faint truncate">{it.track_ids.length} titres · {it.plays} partie{it.plays > 1 ? "s" : ""} · {it.is_public ? "public" : "privé"}</span>
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a href={itemHref(it)} className="sticker sticker-sm flex-1 !h-9 !px-3 text-xs"><Play size={13} fill="currentColor" /> Jouer</a>
                    <a href={`/creer?b=${it.slug}`} aria-label="Modifier" className="w-9 h-9 rounded-full bg-white/6 grid place-items-center text-ink-muted hover:text-ink"><Pencil size={14} /></a>
                    <button type="button" onClick={() => { const url = `https://dailyrapfrance.best${itemHref(it)}`; void shareOrCopy({ title: `${it.title} — Blind test`, text: `🎤 ${it.title} : un blind test de ${it.track_ids.length} titres, fait maison. Tu joues ?\n${url}`, url }).then((r) => r === "copied" && flash("Lien copié")); }} aria-label="Partager" className="w-9 h-9 rounded-full bg-white/6 grid place-items-center text-ink-muted hover:text-ink"><Share2 size={14} /></button>
                    <button type="button" onClick={() => deleteSaved(it)} aria-label="Supprimer" className="w-9 h-9 rounded-full grid place-items-center text-ink-faint hover:text-riseNeg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {saved.map((s) => (
                <div key={s.code} className="ticket p-3.5 w-[230px] shrink-0 snap-start flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-white/6 text-ink-muted grid place-items-center shrink-0"><Icon icon="game-icons:music-spell" width={15} /></span>
                    <a href={customPlayHref(s.code)} className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate">{s.title}</span>
                      <span className="block text-[11px] text-ink-faint truncate">{s.count} titres · sur cet appareil</span>
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a href={customPlayHref(s.code)} className="sticker sticker-sm flex-1 !h-9 !px-3 text-xs"><Play size={13} fill="currentColor" /> Jouer</a>
                    <button type="button" onClick={() => share(s.code, s.title, s.count)} aria-label="Partager" className="w-9 h-9 rounded-full bg-white/6 grid place-items-center text-ink-muted hover:text-ink"><Share2 size={14} /></button>
                    <button type="button" onClick={() => { removeCustom(s.code); setSaved(listSavedCustoms()); }} aria-label="Supprimer" className="w-9 h-9 rounded-full grid place-items-center text-ink-faint hover:text-riseNeg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            {saved.length > 0 && <p className="text-[11px] text-ink-faint mt-2">Les blind tests « sur cet appareil » ne sont que sur ce téléphone — enregistre-les dans ton profil pour les garder.</p>}
          </section>
        )}

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
              <p className="text-xs font-semibold text-ink-faint mb-1 inline-flex items-center gap-1.5"><Link2 size={13} /> Ou colle une playlist Spotify ou Deezer</p>
              <p className="text-xs text-ink-faint mb-3">Playlist publique. Pour Spotify, chaque titre est retrouvé dans le catalogue des extraits ; ceux qui n&apos;y sont pas te sont signalés.</p>
              <div className="flex gap-2">
                <input value={playlistUrl} onChange={(e) => { setPlaylistUrl(e.target.value); setPlaylistState("idle"); }} placeholder="https://open.spotify.com/playlist/… ou deezer.com/playlist/…" className="answer-input !min-h-[48px] !text-sm flex-1" inputMode="url" />
                <button type="button" onClick={importPlaylist} disabled={!playlistUrl.trim() || playlistState === "loading"} className="sticker sticker-ghost sticker-sm shrink-0">{playlistState === "loading" ? "…" : "Importer"}</button>
              </div>
              {playlistState === "other" && <p className="text-xs text-riseNeg mt-2">Apple Music et YouTube ne sont pas importables pour l&apos;instant. Colle une playlist Spotify ou Deezer, ou cherche les titres ci-dessus.</p>}
              {playlistState === "invalid" && <p className="text-xs text-riseNeg mt-2">Ce n&apos;est pas un lien de playlist Spotify ou Deezer.</p>}
              {playlistState === "unreachable" && <p className="text-xs text-riseNeg mt-2">Playlist introuvable — vérifie qu&apos;elle est publique (sur Spotify : « Ajouter au profil » / visibilité publique).</p>}
              {playlistState === "loading" && <p className="text-xs text-ink-faint mt-2 animate-pulse">On retrouve chaque morceau… quelques secondes pour une grande playlist.</p>}
              {importNote && <p className="text-xs text-ink-muted mt-2">{importNote}</p>}
              {missing.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-riseNeg font-semibold">{missing.length} morceau{missing.length > 1 ? "x" : ""} ne pourr{missing.length > 1 ? "ont" : "a"} pas être mis dans le blind test (pas d&apos;extrait disponible)</summary>
                  <ul className="mt-1.5 space-y-0.5 text-ink-faint">
                    {missing.map((m, i) => <li key={i}>• {m.title} — {m.artist}</li>)}
                  </ul>
                </details>
              )}
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

            {/* Enregistrer dans son profil (compte) + public */}
            <div className="ticket p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0"><Save size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold leading-tight">{editing ? "Modifier ce blind test" : "Enregistrer dans mon profil"}</p>
                  <p className="text-xs text-ink-faint mt-0.5">Pour le retrouver sur tous tes appareils, le rejouer, et avoir un lien court. {!user && "Compte gratuit, en 10 secondes."}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => coverInput.current?.click()} disabled={coverBusy} aria-label="Choisir une couverture" className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/6 border border-white/10 shrink-0 grid place-items-center text-ink-faint hover:text-ink">
                  {cover ? <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <ImageIcon size={20} />}
                  {coverBusy && <span className="absolute inset-0 bg-black/50 grid place-items-center"><Loader2 size={18} className="animate-spin text-white" /></span>}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Couverture</p>
                  <p className="text-xs text-ink-faint">Une image pour ton blind test (carré, 6 Mo max). Sinon, l&apos;icône par défaut.</p>
                  <div className="flex gap-2 mt-1.5">
                    <button type="button" onClick={() => coverInput.current?.click()} className="text-xs font-semibold text-glow">{cover ? "Changer" : "Ajouter une image"}</button>
                    {cover && <button type="button" onClick={() => setCover(null)} className="text-xs font-semibold text-ink-faint hover:text-ink">Retirer</button>}
                  </div>
                </div>
                <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={onCoverFile} />
              </div>
              <div>
                <label className="text-xs text-ink-faint mb-1.5 block" htmlFor="bt-desc">Une ligne pour les autres (optionnel)</label>
                <input id="bt-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={160} placeholder="Le blind test officiel de la soirée du 12…" className="answer-input !min-h-[46px] !text-sm" />
              </div>
              <button type="button" role="switch" aria-checked={isPublic} onClick={() => { sfx.click(); setIsPublic((v) => !v); }} className="w-full flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/8 p-3.5 text-left">
                <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${isPublic ? "bg-gold text-white" : "bg-white/8 text-ink-muted"}`}>{isPublic ? <Globe size={16} /> : <Lock size={16} />}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">{isPublic ? "Public — jouable par tout le monde" : "Privé — seulement avec le lien"}</span>
                  <span className="block text-xs text-ink-faint">{isPublic ? "Apparaît dans les blind tests de la communauté, avec ton pseudo." : "Rends-le public pour qu'il apparaisse dans la communauté."}</span>
                </span>
                <span className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${isPublic ? "bg-gold" : "bg-white/10"}`}><span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${isPublic ? "translate-x-5" : ""}`} /></span>
              </button>
              {askLogin && !user ? (
                <div className="rounded-xl bg-white/[0.04] border border-white/8 p-4">
                  <p className="text-sm font-semibold mb-3 inline-flex items-center gap-2"><LogIn size={15} className="text-gold" /> Connecte-toi pour enregistrer</p>
                  <SignInCta label="Continuer avec Google" />
                </div>
              ) : (
                <button type="button" disabled={!ready || saving === "busy"} onClick={saveToProfile} className="sticker w-full h-14 disabled:opacity-40">
                  {saving === "busy" ? "Enregistrement…" : saving === "done" ? <><Check size={18} strokeWidth={3} /> Enregistré</> : saving === "error" ? "Échec — réessaie" : <><Save size={18} /> {editing ? "Enregistrer les modifications" : "Enregistrer dans mon profil"}</>}
                </button>
              )}
              {editing && (
                <p className="text-xs text-ink-muted break-all">Lien court : <a href={itemHref(editing)} className="text-glow font-semibold">dailyrapfrance.best{itemHref(editing)}</a> · {editing.plays} partie{editing.plays > 1 ? "s" : ""}</p>
              )}
            </div>

            {ready && (
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => play("local")} className="sticker sticker-ghost h-14"><Users size={16} /> Entre potes</button>
                <button type="button" onClick={() => share()} className="sticker sticker-ghost h-14"><Share2 size={16} /> Envoyer le lien</button>
              </div>
            )}
          </div>
        </div>

        {community.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold mb-1">Blind tests de la communauté</h2>
            <p className="text-xs text-ink-faint mb-3">Créés par les joueurs et rendus publics. <a href="/blindtests" className="text-glow font-semibold">Tout voir →</a></p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {community.slice(0, 6).map((it) => (
                <a key={it.id} href={itemHref(it)} className="ticket p-4 flex items-center gap-3">
                  {it.cover ? <img src={it.cover} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" /> : <span className="w-11 h-11 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0"><Icon icon="game-icons:music-spell" width={20} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{it.title}</span>
                    <span className="block text-xs text-ink-faint truncate">{it.track_ids.length} titres · par {itemAuthor(it)}{itemVerified(it) && <VerifiedBadge size={12} className="ml-1" />} · {it.plays} partie{it.plays > 1 ? "s" : ""}</span>
                  </span>
                  <Play size={16} className="text-gold shrink-0" fill="currentColor" />
                </a>
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
