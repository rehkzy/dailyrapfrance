"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sfx } from "@/lib/sfx";

/*
 * Chat de salon — même salon, deux habillages :
 *  · "lobby" : panneau inline sous la liste des joueurs, pour patienter ;
 *  · "live"  : superposition façon TikTok Live pendant la partie — les derniers messages
 *    défilent en bas à gauche, en léger, sans jamais gêner les réponses ; un bouton 💬 dans
 *    le rail ouvre la saisie (feuille en bas, compatible clavier).
 * Les messages passent par la table room_messages (RLS : membres du salon) + Realtime.
 */
export type ChatMessage = { id: number; user_id: string; name: string; avatar_url: string | null; text: string; created_at: string };

const MAX_LEN = 200;
const MIN_INTERVAL_MS = 1200;

export function useRoomChat(roomId: string | undefined) {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const seenRef = useRef(0);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;
    setMessages([]);
    supabase
      .from("room_messages")
      .select("id, user_id, name, avatar_url, text, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        if (!alive || !data) return;
        const list = [...data].reverse() as ChatMessage[];
        setMessages(list);
        seenRef.current = list.length;
      });
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` }, (payload) => {
        const m = payload.new as ChatMessage;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev.slice(-199), m]));
        setUnread((u) => u + 1);
      })
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { messages, unread, clearUnread: () => setUnread(0) };
}

async function sendMessage(roomId: string, userId: string, name: string, avatarUrl: string | null, text: string): Promise<boolean> {
  const supabase = createClient();
  const clean = text.replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
  if (!clean) return false;
  const { error } = await supabase.from("room_messages").insert({ room_id: roomId, user_id: userId, name, avatar_url: avatarUrl, text: clean });
  return !error;
}

function Avatar({ m, size = 22 }: { m: ChatMessage; size?: number }) {
  return m.avatar_url ? (
    <img src={m.avatar_url} alt="" width={size} height={size} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-full bg-gold/25 text-gold grid place-items-center font-bold shrink-0" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {m.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function ChatInput({ onSend, autoFocus, placeholder = "Écrire un message…" }: { onSend: (t: string) => Promise<boolean>; autoFocus?: boolean; placeholder?: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const lastRef = useRef(0);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const now = Date.now();
    if (!text.trim() || busy || now - lastRef.current < MIN_INTERVAL_MS) return;
    setBusy(true);
    const ok = await onSend(text);
    setBusy(false);
    if (ok) { lastRef.current = now; setText(""); sfx.click(); }
  }
  return (
    <form onSubmit={submit} className="chat-input">
      <input
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
        placeholder={placeholder}
        maxLength={MAX_LEN}
        autoFocus={autoFocus}
        enterKeyHint="send"
        autoComplete="off"
        aria-label="Message"
      />
      <button type="submit" disabled={!text.trim() || busy} aria-label="Envoyer"><Send size={16} /></button>
    </form>
  );
}

/* ── Lobby : panneau inline ─────────────────────────────────────────────── */
export function LobbyChat({ roomId, userId, name, avatarUrl }: { roomId: string; userId: string; name: string; avatarUrl: string | null }) {
  const { messages } = useRoomChat(roomId);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);
  return (
    <section className="ticket p-4 mb-4 text-left" aria-label="Chat du salon">
      <p className="text-xs font-semibold text-ink-faint mb-3 flex items-center gap-1.5"><MessageCircle size={13} /> Chat du salon</p>
      <div ref={listRef} className="chat-list chat-list-lobby">
        {messages.length === 0 && <p className="text-xs text-ink-faint text-center py-6">Dis bonjour en attendant les autres 👋</p>}
        {messages.map((m) => (
          <div key={m.id} className="chat-msg" data-mine={m.user_id === userId}>
            <Avatar m={m} />
            <span className="chat-bubble"><b>{m.name}</b> {m.text}</span>
          </div>
        ))}
      </div>
      <ChatInput onSend={(t) => sendMessage(roomId, userId, name, avatarUrl, t)} />
    </section>
  );
}

/* ── Partie : superposition TikTok Live + feuille de saisie ───────────────── */
export function LiveChat({ roomId, userId, name, avatarUrl, open, onOpenChange, hidden = false }: { roomId: string; userId: string; name: string; avatarUrl: string | null; open: boolean; onOpenChange: (o: boolean) => void; hidden?: boolean }) {
  const { messages, clearUnread } = useRoomChat(roomId);
  const listRef = useRef<HTMLDivElement>(null);
  // Fil discret : seulement les 3 derniers messages, et chacun ne reste que 6 s à l'écran
  // (comme un toast). Entre deux messages, rien ne traîne sur le jeu.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const recent = messages.slice(-3).filter((m) => now - new Date(m.created_at).getTime() < 6000);
  useEffect(() => {
    if (open) clearUnread();
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Fil discret, bas gauche — tap pour ouvrir. Jamais pendant la révélation. */}
      {!open && !hidden && recent.length > 0 && (
        <button type="button" onClick={() => onOpenChange(true)} className="chat-live" aria-label="Ouvrir le chat">
          {recent.map((m, i) => (
            <span key={m.id} className="chat-live-row" style={{ opacity: 0.45 + (i / Math.max(recent.length - 1, 1)) * 0.55 }}>
              <Avatar m={m} size={20} />
              <span className="chat-bubble chat-bubble-live"><b>{m.name}</b> {m.text}</span>
            </span>
          ))}
        </button>
      )}

      {/* Feuille de saisie */}
      {open && (
        <div className="chat-sheet" role="dialog" aria-label="Chat du salon">
          <div className="chat-sheet-head">
            <span className="text-xs font-semibold text-ink-muted inline-flex items-center gap-1.5"><MessageCircle size={13} /> Chat du salon</span>
            <button type="button" onClick={() => onOpenChange(false)} className="feed-icon !w-8 !h-8" aria-label="Fermer le chat"><X size={14} /></button>
          </div>
          <div ref={listRef} className="chat-list chat-list-sheet">
            {messages.length === 0 && <p className="text-xs text-ink-faint text-center py-6">Personne n&apos;a encore parlé.</p>}
            {messages.map((m) => (
              <div key={m.id} className="chat-msg" data-mine={m.user_id === userId}>
                <Avatar m={m} />
                <span className="chat-bubble"><b>{m.name}</b> {m.text}</span>
              </div>
            ))}
          </div>
          <ChatInput autoFocus onSend={(t) => sendMessage(roomId, userId, name, avatarUrl, t)} placeholder="Chambre les autres…" />
        </div>
      )}
    </>
  );
}
