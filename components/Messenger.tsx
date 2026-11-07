"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Lock, Send, ChevronLeft, MessageCircle, Swords, Plus, Image as ImageIcon, Music2, Search, X, Check, CheckCheck, ShieldCheck, Zap, Smartphone, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { useMessaging, type DM } from "@/lib/useMessaging";
import { encryptBlob, decryptBlob } from "@/lib/e2e";
import { parsePayload, previewOf, musicLinkIn, REACTIONS, type DMPayload } from "@/lib/dm";
import { THEME_OPTIONS } from "@/lib/themes";
import { sfx } from "@/lib/sfx";
import BrandLoader from "@/components/BrandLoader";
import SignInCta from "@/components/SignInCta";
import PreviewButton from "@/components/PreviewPlayer";
import VerifiedBadge from "@/components/VerifiedBadge";

type Lite = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; verified?: boolean | null };

/* ── Petits blocs partagés ──────────────────────────────────────────────── */
function Avatar({ p, size = 40 }: { p: Lite | undefined; size?: number }) {
  return p?.avatar_url ? (
    <img src={p.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-full text-white grid place-items-center font-extrabold shrink-0" style={{ width: size, height: size, fontSize: size * 0.4, background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{(p?.display_name ?? "?").slice(0, 1).toUpperCase()}</span>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function fmtWhen(iso: string) {
  const d = new Date(iso); const now = new Date();
  if (d.toDateString() === now.toDateString()) return fmtTime(iso);
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function dayLabel(iso: string) {
  const d = new Date(iso); const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function useFriends(userId: string | undefined) {
  const [friends, setFriends] = useState<Lite[] | null>(null);
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let alive = true;
    (async () => {
      const { data } = await supabase.from("friendships").select("requester_id,addressee_id,requester:requester_id(id,username,display_name,avatar_url,verified),addressee:addressee_id(id,username,display_name,avatar_url,verified)").eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
      const out: Lite[] = [];
      for (const r of (data ?? []) as unknown as { requester_id: string; requester: unknown; addressee: unknown }[]) { const o = one(r.requester_id === userId ? r.addressee : r.requester) as Lite | null; if (o) out.push(o); }
      if (alive) setFriends(out.sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? "")));
    })();
    return () => { alive = false; };
  }, [userId]);
  return friends;
}

function SecurityExplainer({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="dm-secure">
      <button type="button" onClick={() => setOpen((v) => !v)} className="dm-secure-head" aria-expanded={open}>
        <span className="dm-secure-icon"><Lock size={14} /></span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[13px] font-bold">Chiffré de bout en bout</span>
          {!compact && <span className="block text-[12px] text-ink-muted leading-snug">Tes messages, photos et sons sont chiffrés sur ton téléphone avant de partir. Personne ne peut les lire, pas même DailyRap.</span>}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="dm-secure-list">
          <li><ShieldCheck size={14} /> <span><b>Une clé par téléphone.</b> Elle est créée ici et ne quitte jamais ton appareil : le navigateur lui-même refuse de l&apos;exporter.</span></li>
          <li><Zap size={14} /> <span><b>Instantané.</b> Les messages arrivent en temps réel, sans rechargement, et sont marqués lus quand ton pote les ouvre.</span></li>
          <li><Smartphone size={14} /> <span><b>Comme WhatsApp sans sauvegarde.</b> Un message se lit sur les appareils qui existaient à l&apos;envoi. Si tu effaces les données du site, l&apos;historique part avec.</span></li>
          <li><Lock size={14} /> <span><b>Entre amis seulement.</b> La base refuse tout message vers quelqu&apos;un qui n&apos;est pas ami accepté.</span></li>
        </ul>
      )}
    </div>
  );
}

/* ── Boîte de réception ─────────────────────────────────────────────────── */
export function Inbox() {
  const { user, loading } = useUser();
  const m = useMessaging(user?.id ?? null);
  const friends = useFriends(user?.id);
  const [items, setItems] = useState<{ peer: string; last: DM; unread: number }[] | null>(null);
  const [extra, setExtra] = useState<Record<string, Lite>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user || !m.ready) return;
    let alive = true;
    const refresh = async () => {
      const list = await m.loadInbox();
      if (!alive) return;
      setItems(list);
      const missing = list.map((i) => i.peer).filter((id) => !(friends ?? []).some((f) => f.id === id));
      if (missing.length) {
        const { data } = await createClient().from("profiles").select("id,username,display_name,avatar_url,verified").in("id", missing);
        if (alive) setExtra(Object.fromEntries((data ?? []).map((p) => [p.id, p])));
      }
    };
    void refresh();
    const off = m.subscribe(() => void refresh(), () => void refresh());
    return () => { alive = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, m.ready, m.deviceId, friends?.length]);

  if (loading) return <div className="py-20 grid place-items-center"><BrandLoader size="md" /></div>;
  if (!user) return <div className="max-w-sm mx-auto ticket p-8 text-center"><p className="font-display text-xl font-bold mb-2">Connecte-toi</p><p className="text-sm text-ink-muted mb-5">La messagerie est réservée aux amis.</p><SignInCta /></div>;
  if (!m.supported) return <p className="text-sm text-ink-muted">Ton navigateur ne permet pas le chiffrement de bout en bout. Essaie Safari, Chrome ou Firefox à jour.</p>;

  const profileOf = (id: string): Lite | undefined => (friends ?? []).find((f) => f.id === id) ?? extra[id];
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const match = (p: Lite | undefined) => !q || norm(`${p?.display_name ?? ""} ${p?.username ?? ""}`).includes(norm(q));
  const list = (items ?? []).filter((i) => match(profileOf(i.peer)));
  const withThread = new Set((items ?? []).map((i) => i.peer));
  const fresh = (friends ?? []).filter((f) => !withThread.has(f.id) && match(f));

  return (
    <div className="space-y-5">
      <label className="dm-search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un pote" aria-label="Chercher" /></label>

      {friends && friends.length > 0 && !q && (
        <div className="dm-friends-row" aria-label="Écrire à">
          {friends.map((f) => (
            <a key={f.id} href={`/messages/${f.username ?? f.id}`} className="dm-friend-chip">
              <span className="dm-friend-ring"><Avatar p={f} size={52} /></span>
              <span className="truncate">{(f.display_name ?? "Joueur").split(" ")[0]}</span>
            </a>
          ))}
        </div>
      )}

      {items === null ? (
        <div className="py-10 grid place-items-center"><BrandLoader size="md" /></div>
      ) : list.length === 0 && fresh.length === 0 ? (
        <div className="ticket p-8 text-center">
          <span className="w-14 h-14 rounded-2xl bg-gold/15 text-gold grid place-items-center mx-auto mb-3"><MessageCircle size={24} /></span>
          <p className="font-display text-lg font-bold mb-1">{q ? "Personne à ce nom" : "Personne à qui écrire pour l'instant"}</p>
          {!q && <><p className="text-sm text-ink-muted">Ajoute des amis : la messagerie est entre amis seulement.</p><a href="/amis" className="sticker sticker-sm mt-4">Voir mes amis</a></>}
        </div>
      ) : (
        <div className="dm-list">
          {list.map((i) => {
            const p = profileOf(i.peer);
            const pl = parsePayload(i.last.text);
            return (
              <a key={i.peer} href={`/messages/${p?.username ?? i.peer}`} className="dm-row" data-unread={i.unread > 0}>
                <Avatar p={p} size={50} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 min-w-0"><span className="text-[15px] truncate font-bold">{p?.display_name ?? "Joueur"}</span>{p?.verified && <VerifiedBadge size={13} />}</span>
                    <span className="text-[11px] text-ink-faint shrink-0">{fmtWhen(i.last.at)}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[13px] text-ink-muted">
                    {i.last.mine && (i.last.read ? <CheckCheck size={14} className="text-gold shrink-0" /> : <Check size={14} className="shrink-0" />)}
                    <span className="truncate">{pl?.k === "react" ? `${pl.e} a réagi` : previewOf(i.last.text)}</span>
                  </span>
                </span>
                {i.unread > 0 && <span className="dm-badge">{i.unread}</span>}
              </a>
            );
          })}
          {fresh.map((f) => (
            <a key={f.id} href={`/messages/${f.username ?? f.id}`} className="dm-row">
              <Avatar p={f} size={50} />
              <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold truncate">{f.display_name ?? "Joueur"}</span><span className="block text-[13px] text-ink-faint">Pas encore de conversation</span></span>
              <Send size={15} className="text-ink-faint" />
            </a>
          ))}
        </div>
      )}

      <SecurityExplainer />
    </div>
  );
}

/* ── Bulles ─────────────────────────────────────────────────────────────── */
const imgCache = new Map<string, Promise<string | null>>();
function useDecryptedImage(p: Extract<DMPayload, { k: "img" }>) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let pr = imgCache.get(p.path);
    if (!pr) {
      pr = (async () => {
        const url = createClient().storage.from("dm").getPublicUrl(p.path).data.publicUrl;
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await decryptBlob(await res.arrayBuffer(), p.key, p.iv, p.mime ?? "image/jpeg");
        return blob ? URL.createObjectURL(blob) : null;
      })();
      imgCache.set(p.path, pr);
    }
    pr.then((u) => { if (alive) setSrc(u); });
    return () => { alive = false; };
  }, [p.path, p.key, p.iv, p.mime]);
  return src;
}

function ImgBubble({ p, onOpen }: { p: Extract<DMPayload, { k: "img" }>; onOpen: (src: string) => void }) {
  const src = useDecryptedImage(p);
  const ratio = p.w && p.h ? p.h / p.w : 1;
  return (
    <button type="button" onClick={() => src && onOpen(src)} className="dm-img" style={{ aspectRatio: `${p.w || 1} / ${p.h || 1}`, maxHeight: ratio > 1.4 ? 320 : undefined }} aria-label="Photo">
      {src ? <img src={src} alt="" /> : <span className="dm-img-loading"><Lock size={14} /> déchiffrement…</span>}
    </button>
  );
}

function artistThemeFor(artist: string): string | null {
  const n = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  const key = n(artist.split(/ feat\.?| ft\.?|,|&/i)[0]);
  return THEME_OPTIONS.find((t) => t.category === "Artistes" && n(t.label) === key)?.id ?? null;
}

function TrackBubble({ p }: { p: Extract<DMPayload, { k: "track" }> }) {
  const theme = p.artist ? artistThemeFor(p.artist) : null;
  return (
    <div className="dm-track">
      {p.cover ? <img src={p.cover} alt="" className="dm-track-cover" /> : <span className="dm-track-cover grid place-items-center text-ink-faint"><Music2 size={20} /></span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold truncate">{p.title}</span>
        <span className="block text-[12px] text-ink-muted truncate">{p.artist}</span>
        <span className="flex items-center gap-2 mt-1.5">
          {theme && <a href={`/jouer?mode=solo&theme=${theme}&autostart=1`} className="dm-track-cta"><Swords size={11} /> Blind test</a>}
          {p.url && <a href={p.url} target="_blank" rel="noopener" className="dm-track-link">{p.url.includes("spotify") ? "Spotify" : "Deezer"} ↗</a>}
        </span>
      </span>
      {p.preview ? <PreviewButton id={`dm-${p.id ?? p.url}`} src={p.preview} trackId={p.id} size={40} /> : null}
    </div>
  );
}

function ChallengeBubble({ p, from, mine }: { p: Extract<DMPayload, { k: "challenge" }>; from: string; mine: boolean }) {
  const href = `/jouer?mode=solo&theme=${encodeURIComponent(p.theme)}&autostart=1${p.score ? `&from=${encodeURIComponent(from)}&score=${p.score}` : ""}`;
  return (
    <div className="dm-challenge">
      <span className="dm-challenge-icon"><Swords size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] uppercase tracking-wider font-bold text-gold">Défi</span>
        <span className="block text-[15px] font-extrabold leading-tight">{p.label}</span>
        {p.score ? <span className="block text-[12px] text-ink-muted">{p.score} pts à battre</span> : <span className="block text-[12px] text-ink-muted">Fais ton score, on compare</span>}
      </span>
      {!mine && <a href={href} className="sticker sticker-sm shrink-0">Relever</a>}
      {mine && <a href={href} className="dm-track-link shrink-0">Rejouer</a>}
    </div>
  );
}

/* ── Fil de conversation (plein écran) ──────────────────────────────────── */
type Attach = null | "menu" | "track" | "challenge";

export function Thread({ peer }: { peer: Lite }) {
  const { user, loading } = useUser();
  const m = useMessaging(user?.id ?? null);
  const supabase = useMemo(() => createClient(), []);
  const [msgs, setMsgs] = useState<DM[] | null>(null);
  const [reads, setReads] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [attach, setAttach] = useState<Attach>(null);
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [myName, setMyName] = useState("Un pote");
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<{ ping: () => void; off: () => void } | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name,username").eq("id", user.id).maybeSingle().then(({ data }) => { if (data) setMyName(data.display_name ?? data.username ?? "Un pote"); });
  }, [user, supabase]);

  useEffect(() => {
    if (!user || !m.ready) return;
    let alive = true;
    Promise.all([m.loadThread(peer.id), m.loadReads(peer.id)]).then(([l, r]) => { if (alive) { setMsgs(l); setReads(r); void m.markRead(peer.id); } });
    const off = m.subscribe(
      (dm) => {
        if (dm.peer !== peer.id) return;
        setMsgs((prev) => {
          if (!prev) return prev;
          const i = prev.findIndex((x) => x.msgId === dm.msgId);
          if (i >= 0) { const c = [...prev]; c[i] = dm; return c; }
          return [...prev, dm];
        });
        if (!dm.mine) { void m.markRead(peer.id); setTyping(false); sfx.click(); }
      },
      (msgId, who) => { if (who === peer.id) setReads((prev) => new Set(prev).add(msgId)); },
    );
    typingRef.current = m.typingChannel(peer.id, () => {
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3500);
    });
    return () => { alive = false; off(); typingRef.current?.off(); typingRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, m.ready, m.deviceId, peer.id]);

  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs?.length, typing]);
  useEffect(() => { document.body.classList.add("dm-open"); return () => document.body.classList.remove("dm-open"); }, []);

  // iPhone : le clavier ne réduit pas la fenêtre, il la recouvre (et Safari fait défiler la page
  // dessous). On garde le fil plein écran et on remonte la zone de saisie de la hauteur du clavier,
  // mesurée via visualViewport ; la page est maintenue en haut pour que rien ne glisse derrière.
  const threadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = 0;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = threadRef.current;
        if (!el) return;
        const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
        el.style.setProperty("--kb", `${kb}px`);
        el.dataset.kb = kb > 40 ? "1" : "0";
        if (window.scrollY !== 0) window.scrollTo(0, 0);
        const l = listRef.current; if (l && kb > 40) l.scrollTop = l.scrollHeight;
      });
    };
    fit();
    vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit); window.addEventListener("scroll", fit);
    return () => { cancelAnimationFrame(raf); vv.removeEventListener("resize", fit); vv.removeEventListener("scroll", fit); window.removeEventListener("scroll", fit); };
  }, []);

  const pushLocal = useCallback((msgId: string, body: string) => {
    if (!user) return;
    setMsgs((prev) => [...(prev ?? []), { id: -Date.now(), msgId, from: user.id, peer: peer.id, text: body, at: new Date().toISOString(), mine: true, read: false }]);
  }, [user, peer.id]);

  const deliver = useCallback(async (body: string): Promise<boolean> => {
    const msgId = await m.send(peer.id, body);
    if (!msgId) { setErr(`${peer.display_name ?? "Ton ami"} n'a pas encore ouvert la messagerie. Dès qu'il le fait, ça passe.`); return false; }
    pushLocal(msgId, body);
    return true;
  }, [m, peer, pushLocal]);

  async function submit() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true); setErr(null);
    try {
      const link = musicLinkIn(t);
      if (link) {
        const card = await fetch(`/api/track/unfurl?url=${encodeURIComponent(link)}`).then((r) => r.json()).catch(() => null) as { title: string; artist: string; cover: string | null; preview: string | null; deezerId: number | null } | null;
        if (card?.title) {
          const rest = t.replace(link, "").trim();
          if (rest && !(await deliver(rest))) return;
          if (!(await deliver(JSON.stringify({ k: "track", id: card.deezerId, title: card.title, artist: card.artist, cover: card.cover, preview: card.preview, url: link } satisfies DMPayload)))) return;
          setText(""); sfx.click(); return;
        }
      }
      if (await deliver(t)) { setText(""); sfx.click(); }
    } finally { setBusy(false); }
  }

  async function sendPhoto(file: File) {
    if (!user) return;
    setBusy(true); setErr(null); setAttach(null);
    try {
      const { blob: jpeg, w, h } = await shrink(file);
      const { blob, key, iv } = await encryptBlob(await jpeg.arrayBuffer());
      const path = `${user.id}/${crypto.randomUUID()}.bin`;
      const { error } = await supabase.storage.from("dm").upload(path, blob, { contentType: "application/octet-stream", cacheControl: "31536000" });
      if (error) { setErr("Photo impossible à envoyer : le stockage « dm » n'est pas encore créé côté Supabase."); return; }
      await deliver(JSON.stringify({ k: "img", path, key, iv, w, h, mime: "image/jpeg" } satisfies DMPayload));
      sfx.click();
    } catch { setErr("Photo impossible à lire."); } finally { setBusy(false); }
  }

  async function sendTrack(t: { id: number | null; title: string; artist: string; cover: string | null; preview: string | null }) {
    setAttach(null); setBusy(true); setErr(null);
    await deliver(JSON.stringify({ k: "track", ...t } satisfies DMPayload));
    setBusy(false); sfx.click();
  }

  async function sendChallenge(theme: string, label: string, score: number | null) {
    setAttach(null); setBusy(true); setErr(null);
    await deliver(JSON.stringify({ k: "challenge", theme, label, score } satisfies DMPayload));
    setBusy(false); sfx.correct();
  }

  async function react(to: string, e: string) {
    setReactFor(null);
    await deliver(JSON.stringify({ k: "react", to, e } satisfies DMPayload));
  }

  if (loading) return <div className="dm-thread grid place-items-center"><BrandLoader size="md" /></div>;
  if (!user) return <div className="dm-thread grid place-items-center p-6"><div className="max-w-sm ticket p-8 text-center"><p className="font-display text-xl font-bold mb-2">Connecte-toi</p><SignInCta /></div></div>;

  // Réactions regroupées par message ; les messages « react » ne s'affichent pas en bulle.
  const reactions = new Map<string, { e: string; mine: boolean }[]>();
  const visible: DM[] = [];
  for (const dm of msgs ?? []) {
    const p = parsePayload(dm.text);
    if (p?.k === "react") { const arr = reactions.get(p.to) ?? []; arr.push({ e: p.e, mine: dm.mine }); reactions.set(p.to, arr); } else visible.push(dm);
  }
  const lastMineIdx = (() => { for (let i = visible.length - 1; i >= 0; i--) if (visible[i].mine) return i; return -1; })();

  return (
    <div className="dm-thread" ref={threadRef}>
      <header className="dm-top">
        <a href="/messages" className="dm-icon-btn" aria-label="Retour"><ChevronLeft size={22} /></a>
        <a href={peer.username ? `/profil/${peer.username}` : "#"} className="flex items-center gap-2.5 min-w-0 flex-1">
          <Avatar p={peer} size={38} />
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-[15px] font-bold truncate">{peer.display_name ?? "Joueur"}{peer.verified && <VerifiedBadge size={13} />}</span>
            <span className="block text-[11px] leading-tight">{typing ? <span className="text-gold font-semibold">écrit…</span> : <span className="text-ink-faint inline-flex items-center gap-1"><Lock size={10} /> chiffré de bout en bout</span>}</span>
          </span>
        </a>
        <button type="button" onClick={() => { (document.activeElement as HTMLElement | null)?.blur?.(); setAttach("challenge"); }} className="dm-icon-btn text-gold" aria-label="Défier"><Swords size={20} /></button>
      </header>

      <div ref={listRef} className="dm-scroll" data-lenis-prevent onClick={() => setReactFor(null)}>
        <div className="px-4 pt-3"><SecurityExplainer compact /></div>
        {msgs === null ? (
          <div className="py-10 grid place-items-center"><BrandLoader size="md" /></div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 px-8">
            <Avatar p={peer} size={72} />
            <p className="font-display text-lg font-bold mt-3">{peer.display_name ?? "Joueur"}</p>
            <p className="text-sm text-ink-muted mt-1">Vous êtes amis. Lance un son, une photo ou un défi.</p>
          </div>
        ) : (
          visible.map((dm, i) => {
            const prev = visible[i - 1];
            const newDay = !prev || new Date(prev.at).toDateString() !== new Date(dm.at).toDateString();
            const grouped = prev && prev.mine === dm.mine && !newDay && new Date(dm.at).getTime() - new Date(prev.at).getTime() < 120000;
            const p = parsePayload(dm.text);
            const rx = reactions.get(dm.msgId);
            const isRich = p && p.k !== "react";
            return (
              <div key={dm.msgId} className="px-3">
                {newDay && <div className="dm-day"><span>{dayLabel(dm.at)}</span></div>}
                <div className={`dm-line ${dm.mine ? "mine" : ""} ${grouped ? "grouped" : ""}`}>
                  <div className="relative max-w-[82%]">
                    <div
                      className={`dm-bubble ${dm.mine ? "mine" : ""} ${isRich ? "rich" : ""}`}
                      onClick={(e) => { e.stopPropagation(); setReactFor((v) => (v === dm.msgId ? null : dm.msgId)); }}
                    >
                      {!p ? (
                        <span className="whitespace-pre-wrap break-words">{dm.text ?? <span className="text-xs opacity-70 inline-flex items-center gap-1"><Lock size={11} /> Envoyé depuis un autre appareil</span>}</span>
                      ) : p.k === "img" ? (
                        <ImgBubble p={p} onOpen={setViewer} />
                      ) : p.k === "track" ? (
                        <TrackBubble p={p} />
                      ) : p.k === "challenge" ? (
                        <ChallengeBubble p={p} from={dm.mine ? myName : (peer.display_name ?? "Un pote")} mine={dm.mine} />
                      ) : null}
                      <span className="dm-meta">
                        {fmtTime(dm.at)}
                        {dm.mine && (reads.has(dm.msgId) ? <CheckCheck size={13} className="text-gold" /> : dm.id < 0 ? <Check size={13} className="opacity-50" /> : <CheckCheck size={13} className="opacity-60" />)}
                      </span>
                    </div>
                    {rx && rx.length > 0 && (
                      <div className={`dm-rx ${dm.mine ? "mine" : ""}`}>{Object.entries(rx.reduce<Record<string, number>>((a, r) => { a[r.e] = (a[r.e] ?? 0) + 1; return a; }, {})).map(([e, n]) => <span key={e}>{e}{n > 1 ? ` ${n}` : ""}</span>)}</div>
                    )}
                    {reactFor === dm.msgId && (
                      <div className={`dm-rxbar ${dm.mine ? "mine" : ""}`} onClick={(e) => e.stopPropagation()}>
                        {REACTIONS.map((e) => <button key={e} type="button" onClick={() => void react(dm.msgId, e)}>{e}</button>)}
                      </div>
                    )}
                  </div>
                </div>
                {dm.mine && i === lastMineIdx && reads.has(dm.msgId) && <p className="text-right text-[10px] text-ink-faint mt-0.5 pr-1">Lu</p>}
              </div>
            );
          })
        )}
        {typing && <div className="px-3"><div className="dm-line"><div className="dm-bubble dm-typing"><span /><span /><span /></div></div></div>}
        <div className="h-3" />
      </div>

      <footer className="dm-composer">
        {err && <p className="text-xs text-riseNeg px-1 pb-1.5">{err}</p>}
        <div className="flex items-end gap-2">
          <button type="button" onClick={() => { (document.activeElement as HTMLElement | null)?.blur?.(); setAttach(attach ? null : "menu"); }} className={`dm-plus ${attach ? "open" : ""}`} aria-label="Joindre"><Plus size={22} /></button>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value.slice(0, 4000)); typingRef.current?.ping(); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !/Mobi|Android/i.test(navigator.userAgent)) { e.preventDefault(); void submit(); } }}
            placeholder="Message"
            rows={1}
            enterKeyHint="send"
            aria-label="Message"
            className="dm-input"
            style={{ height: Math.min(120, 22 * Math.max(1, (text.match(/\n/g)?.length ?? 0) + 1) + 22) }}
          />
          <button type="button" onClick={() => void submit()} disabled={!text.trim() || busy} className="dm-send" aria-label="Envoyer">{busy ? <BrandLoader size="sm" /> : <Send size={18} />}</button>
        </div>
        {attach === "menu" && (
          <div className="dm-attach">
            <button type="button" onClick={() => fileRef.current?.click()}><span className="dm-attach-ic" style={{ background: "rgba(240,0,28,.18)", color: "#ff5a6a" }}><ImageIcon size={20} /></span>Photo<small>chiffrée</small></button>
            <button type="button" onClick={() => setAttach("track")}><span className="dm-attach-ic" style={{ background: "rgba(255,255,255,.08)" }}><Music2 size={20} /></span>Son<small>Deezer · Spotify</small></button>
            <button type="button" onClick={() => setAttach("challenge")}><span className="dm-attach-ic" style={{ background: "rgba(240,0,28,.32)", color: "#fff" }}><Swords size={20} /></span>Défi<small>score à battre</small></button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void sendPhoto(f); }} />
      </footer>

      {attach === "track" && <TrackPicker onPick={sendTrack} onClose={() => setAttach(null)} />}
      {attach === "challenge" && <ChallengePicker userId={user.id} onPick={sendChallenge} onClose={() => setAttach(null)} />}
      {viewer && <div className="dm-viewer" onClick={() => setViewer(null)}><img src={viewer} alt="" /><button type="button" className="dm-icon-btn absolute top-4 right-4" aria-label="Fermer"><X size={22} /></button></div>}
    </div>
  );
}

/* ── Choisir un son ─────────────────────────────────────────────────────── */
type SearchTrack = { id: string; title: string; artistName: string; coverUrl: string | null; previewUrl: string };

function TrackPicker({ onPick, onClose }: { onPick: (t: { id: number | null; title: string; artist: string; cover: string | null; preview: string | null }) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchTrack[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const j = await fetch(`/api/blindtest/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()).catch(() => ({ tracks: [] }));
      setRes((j.tracks ?? []) as SearchTrack[]); setLoading(false);
    }, 280);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <Sheet title="Envoyer un son" onClose={onClose}>
      <label className="dm-search mb-3"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titre ou artiste" aria-label="Chercher un son" enterKeyHint="search" /></label>
      {q.trim().length < 2 && <p className="text-xs text-ink-faint px-1 mb-2">Astuce : tu peux aussi coller un lien Spotify ou Deezer directement dans le message.</p>}
      {loading && <div className="py-6 grid place-items-center"><BrandLoader size="sm" /></div>}
      <div className="divide-y divide-white/6">
        {res.map((t) => (
          <div key={t.id} className="flex items-center gap-3 py-2.5">
            {t.coverUrl ? <img src={t.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <span className="w-12 h-12 rounded-lg bg-white/6" />}
            <button type="button" onClick={() => onPick({ id: Number(t.id) || null, title: t.title, artist: t.artistName, cover: t.coverUrl, preview: t.previewUrl })} className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-bold truncate">{t.title}</span><span className="block text-xs text-ink-muted truncate">{t.artistName}</span>
            </button>
            <PreviewButton id={`pick-${t.id}`} src={t.previewUrl} trackId={t.id} size={36} />
            <button type="button" onClick={() => onPick({ id: Number(t.id) || null, title: t.title, artist: t.artistName, cover: t.coverUrl, preview: t.previewUrl })} className="dm-send" aria-label="Envoyer"><Send size={15} /></button>
          </div>
        ))}
      </div>
      {!loading && q.trim().length >= 2 && res.length === 0 && <p className="text-sm text-ink-faint text-center py-6">Rien trouvé.</p>}
    </Sheet>
  );
}

/* ── Lancer un défi ─────────────────────────────────────────────────────── */
function ChallengePicker({ userId, onPick, onClose }: { userId: string; onPick: (theme: string, label: string, score: number | null) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [best, setBest] = useState<Record<string, number>>({});
  useEffect(() => {
    createClient().from("blindtest_scores").select("theme,points").eq("user_id", userId).order("points", { ascending: false }).limit(300).then(({ data }) => {
      const b: Record<string, number> = {};
      for (const r of data ?? []) if (!(r.theme in b)) b[r.theme] = r.points;
      setBest(b);
    });
  }, [userId]);
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const list = THEME_OPTIONS.filter((t) => t.category !== "Gimmicks" && (!q || norm(`${t.label} ${t.keywords ?? ""}`).includes(norm(q))));
  const played = list.filter((t) => best[t.id] != null);
  const rest = list.filter((t) => best[t.id] == null);
  const Row = ({ t }: { t: (typeof THEME_OPTIONS)[number] }) => (
    <button type="button" onClick={() => onPick(t.id, t.label, best[t.id] ?? null)} className="flex items-center gap-3 w-full py-2.5 text-left">
      <span className="w-10 h-10 rounded-xl bg-white/6 grid place-items-center text-gold"><t.Icon size={18} /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-bold truncate">{t.label}</span><span className="block text-xs text-ink-muted truncate">{best[t.id] != null ? `Ton record : ${best[t.id]} pts` : t.text}</span></span>
      <Swords size={16} className="text-ink-faint" />
    </button>
  );
  return (
    <Sheet title="Lancer un défi" onClose={onClose}>
      <p className="text-xs text-ink-muted mb-3">Il joue le même thème, on compare. Si tu as déjà un record dessus, c&apos;est lui à battre.</p>
      <label className="dm-search mb-3"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Un artiste, une époque, une région…" aria-label="Chercher un thème" enterKeyHint="search" /></label>
      {played.length > 0 && <><p className="stage-kicker mb-1">Tes records</p><div className="divide-y divide-white/6 mb-4">{played.slice(0, 12).map((t) => <Row key={t.id} t={t} />)}</div></>}
      <div className="divide-y divide-white/6">{rest.slice(0, 40).map((t) => <Row key={t.id} t={t} />)}</div>
    </Sheet>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="dm-sheet-backdrop" onClick={onClose} />
      <div className="dm-sheet" role="dialog" aria-label={title}>
        <div className="flex items-center justify-between mb-3"><p className="font-display text-lg font-bold">{title}</p><button type="button" onClick={onClose} className="dm-icon-btn" aria-label="Fermer"><X size={20} /></button></div>
        <div className="overflow-y-auto min-h-0 flex-1 pb-2" data-lenis-prevent>{children}</div>
      </div>
    </>
  );
}

/* ── Réduire une photo avant chiffrement (max 1280 px, JPEG) ───────────── */
async function shrink(file: File): Promise<{ blob: Blob; w: number; h: number }> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return { blob: file, w: 0, h: 0 };
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.85));
  return { blob: blob ?? file, w, h };
}
