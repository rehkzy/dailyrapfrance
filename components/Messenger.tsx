"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Lock, Send, ChevronLeft, MessageCircle, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { useMessaging, type DM } from "@/lib/useMessaging";
import { sfx } from "@/lib/sfx";
import BrandLoader from "@/components/BrandLoader";
import SignInCta from "@/components/SignInCta";

type Lite = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

function Avatar({ p, size = 40 }: { p: Lite | undefined; size?: number }) {
  return p?.avatar_url ? (
    <img src={p.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-full text-white grid place-items-center font-extrabold shrink-0" style={{ width: size, height: size, fontSize: size * 0.4, background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{(p?.display_name ?? "?").slice(0, 1).toUpperCase()}</span>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso); const now = new Date();
  const same = d.toDateString() === now.toDateString();
  return same ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/* ── Boîte de réception ─────────────────────────────────────────────────── */
export function Inbox() {
  const { user, loading } = useUser();
  const m = useMessaging(user?.id ?? null);
  const supabase = createClient();
  const [items, setItems] = useState<{ peer: string; last: DM; unread: number }[] | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Lite>>({});
  const [friends, setFriends] = useState<Lite[]>([]);

  useEffect(() => {
    if (!user || !m.ready) return;
    let alive = true;
    const refresh = async () => {
      const list = await m.loadInbox();
      if (!alive) return;
      setItems(list);
      const ids = list.map((i) => i.peer);
      const { data: fr } = await supabase.from("friendships").select("requester_id,addressee_id,requester:requester_id(id,username,display_name,avatar_url),addressee:addressee_id(id,username,display_name,avatar_url)").eq("status", "accepted").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
      const fl: Lite[] = [];
      for (const r of (fr ?? []) as unknown as { requester_id: string; requester: unknown; addressee: unknown }[]) { const o = one(r.requester_id === user.id ? r.addressee : r.requester) as Lite | null; if (o) fl.push(o); }
      if (!alive) return;
      setFriends(fl.sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? "")));
      const missing = ids.filter((id) => !fl.some((f) => f.id === id));
      const map: Record<string, Lite> = Object.fromEntries(fl.map((f) => [f.id, f]));
      if (missing.length) { const { data } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", missing); for (const p of data ?? []) map[p.id] = p; }
      if (alive) setProfiles(map);
    };
    void refresh();
    const off = m.subscribe(() => void refresh());
    return () => { alive = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, m.ready]);

  if (loading) return <div className="py-20 grid place-items-center"><BrandLoader size="md" /></div>;
  if (!user) return <div className="max-w-sm mx-auto ticket p-8 text-center"><p className="font-display text-xl font-bold mb-2">Connecte-toi</p><p className="text-sm text-ink-muted mb-5">La messagerie est réservée aux amis.</p><SignInCta /></div>;
  if (!m.supported) return <p className="text-sm text-ink-muted">Ton navigateur ne permet pas le chiffrement de bout en bout. Essaie Safari, Chrome ou Firefox à jour.</p>;

  const withThread = new Set((items ?? []).map((i) => i.peer));
  const others = friends.filter((f) => !withThread.has(f.id));

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-faint inline-flex items-center gap-1.5"><Lock size={12} /> Chiffré de bout en bout : personne d&apos;autre que vous deux ne peut lire, pas même DailyRapFrance.</p>
      {items === null ? (
        <div className="py-10 grid place-items-center"><BrandLoader size="md" /></div>
      ) : items.length === 0 && others.length === 0 ? (
        <div className="ticket p-8 text-center">
          <span className="w-14 h-14 rounded-2xl bg-gold/15 text-gold grid place-items-center mx-auto mb-3"><MessageCircle size={24} /></span>
          <p className="font-display text-lg font-bold mb-1">Personne à qui écrire pour l&apos;instant</p>
          <p className="text-sm text-ink-muted">Ajoute des amis : la messagerie est entre amis seulement.</p>
          <a href="/amis" className="sticker sticker-sm mt-4">Voir mes amis</a>
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="ticket divide-y divide-white/6 overflow-hidden">
              {items.map((i) => {
                const p = profiles[i.peer];
                return (
                  <a key={i.peer} href={`/messages/${p?.username ?? i.peer}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
                    <Avatar p={p} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2"><span className={`text-sm truncate ${i.unread ? "font-extrabold" : "font-semibold"}`}>{p?.display_name ?? "Joueur"}</span><span className="text-[11px] text-ink-faint shrink-0">{fmtTime(i.last.at)}</span></span>
                      <span className={`block text-xs truncate ${i.unread ? "text-ink" : "text-ink-faint"}`}>{i.last.mine ? "Toi : " : ""}{i.last.text ?? "🔒 Message sur un autre appareil"}</span>
                    </span>
                    {i.unread > 0 && <span className="min-w-[22px] h-[22px] rounded-full bg-gold text-white text-[11px] font-bold grid place-items-center px-1.5">{i.unread}</span>}
                  </a>
                );
              })}
            </div>
          )}
          {others.length > 0 && (
            <section>
              <p className="stage-kicker mb-2">Écrire à un ami</p>
              <div className="ticket divide-y divide-white/6 overflow-hidden">
                {others.map((f) => (
                  <a key={f.id} href={`/messages/${f.username ?? f.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03]">
                    <Avatar p={f} size={36} /><span className="text-sm font-semibold truncate flex-1">{f.display_name ?? "Joueur"}</span><Send size={14} className="text-ink-faint" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ── Fil de conversation ────────────────────────────────────────────────── */
export function Thread({ peer }: { peer: Lite }) {
  const { user, loading } = useUser();
  const m = useMessaging(user?.id ?? null);
  const [msgs, setMsgs] = useState<DM[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !m.ready) return;
    let alive = true;
    m.loadThread(peer.id).then((l) => { if (alive) { setMsgs(l); void m.markRead(peer.id); } });
    const off = m.subscribe((dm) => { if (dm.peer === peer.id) { setMsgs((prev) => (prev && !prev.some((x) => x.id === dm.id) ? [...prev, dm] : prev)); if (!dm.mine) { void m.markRead(peer.id); sfx.click(); } } });
    return () => { alive = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, m.ready, peer.id]);

  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs?.length]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true); setErr(null);
    const ok = await m.send(peer.id, text);
    setBusy(false);
    if (!ok) { setErr(`${peer.display_name ?? "Ton ami"} n'a pas encore ouvert la messagerie — dès qu'il le fait, tu pourras lui écrire. (Ou vous n'êtes pas encore amis.)`); return; }
    setText("");
    sfx.click();
  }

  if (loading) return <div className="py-20 grid place-items-center"><BrandLoader size="md" /></div>;
  if (!user) return <div className="max-w-sm mx-auto ticket p-8 text-center"><p className="font-display text-xl font-bold mb-2">Connecte-toi</p><SignInCta /></div>;

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 190px)" }}>
      <div className="flex items-center gap-3 pb-3 border-b border-white/8">
        <a href="/messages" className="w-9 h-9 rounded-full bg-white/6 grid place-items-center text-ink-muted" aria-label="Retour"><ChevronLeft size={18} /></a>
        <a href={peer.username ? `/profil/${peer.username}` : "#"} className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar p={peer} size={38} />
          <span className="min-w-0"><span className="block text-sm font-bold truncate">{peer.display_name ?? "Joueur"}</span><span className="block text-[11px] text-ink-faint inline-flex items-center gap-1"><Lock size={10} /> chiffré de bout en bout</span></span>
        </a>
        <a href={`/jouer?mode=online`} className="sticker sticker-ghost sticker-sm" aria-label="Défier"><Swords size={14} /> Défier</a>
      </div>

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-4 space-y-2" data-lenis-prevent>
        {msgs === null ? (
          <div className="py-10 grid place-items-center"><BrandLoader size="md" /></div>
        ) : msgs.length === 0 ? (
          <p className="text-center text-sm text-ink-faint py-10">Dis-lui quelque chose. Personne d&apos;autre ne lira.</p>
        ) : (
          msgs.map((dm) => (
            <div key={dm.id} className={`flex ${dm.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${dm.mine ? "bg-gold text-white rounded-br-md" : "bg-white/8 rounded-bl-md"}`}>
                {dm.text ?? <span className="text-xs opacity-70 inline-flex items-center gap-1"><Lock size={11} /> Envoyé depuis un autre appareil</span>}
                <span className={`block text-[10px] mt-1 ${dm.mine ? "text-white/70" : "text-ink-faint"}`}>{fmtTime(dm.at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {err && <p className="text-xs text-riseNeg mb-2">{err}</p>}
      <form onSubmit={submit} className="chat-input">
        <input value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} placeholder="Message…" enterKeyHint="send" autoComplete="off" aria-label="Message" />
        <button type="submit" disabled={!text.trim() || busy} aria-label="Envoyer"><Send size={16} /></button>
      </form>
    </div>
  );
}
