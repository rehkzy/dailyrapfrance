"use client";

import { useEffect, useState } from "react";
import { Send, Check, Users, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type FriendLite = { id: string; name: string; avatar: string | null };

/*
 * Lobby d'un salon privé : tes amis, et un bouton pour inviter chacun.
 *  · « Inviter » envoie une notification push avec le lien direct (s'il a activé les
 *    notifications), et garde toujours le partage natif en secours (WhatsApp, iMessage…).
 *  · Les amis déjà dans le salon sont cochés.
 */
export default function RoomFriendInvites({ userId, roomCode, inRoomIds = [] }: { userId: string; roomCode: string; inRoomIds?: string[] }) {
  const [friends, setFriends] = useState<FriendLite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<Record<string, "sent" | "copied" | "busy">>({});

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("friendships")
      .select("status,requester_id,addressee_id,requester:requester_id(id,username,display_name,avatar_url),addressee:addressee_id(id,username,display_name,avatar_url)")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .then(({ data }) => {
        const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
        const list: FriendLite[] = [];
        for (const r of (data ?? []) as unknown as { requester_id: string; addressee_id: string; requester: unknown; addressee: unknown }[]) {
          const other = one(r.requester_id === userId ? r.addressee : r.requester) as { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null;
          if (other) list.push({ id: other.id, name: other.display_name ?? other.username ?? "Joueur", avatar: other.avatar_url ?? null });
        }
        setFriends(list.sort((a, b) => a.name.localeCompare(b.name)));
        setLoaded(true);
      });
  }, [userId]);

  const url = typeof window !== "undefined" ? `${window.location.origin}/jouer?mode=online&room=${roomCode}` : `/jouer?mode=online&room=${roomCode}`;

  async function invite(friend: FriendLite) {
    setState((s) => ({ ...s, [friend.id]: "busy" }));
    let pushed = false;
    try {
      const r = await fetch("/api/rooms/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendId: friend.id, code: roomCode }) });
      pushed = r.ok && !!((await r.json()) as { pushed?: boolean }).pushed;
    } catch {}
    if (pushed) { setState((s) => ({ ...s, [friend.id]: "sent" })); return; }
    // Pas de notification chez lui : on envoie le lien par le partage natif, sinon copie.
    await shareLink(friend);
  }

  async function shareLink(friend: FriendLite) {
    const text = `${friend.name}, rejoins mon salon blind test rap FR ! Code : ${roomCode}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Blind Test DailyRapFrance", text, url }); setState((s) => ({ ...s, [friend.id]: "sent" })); return; } catch { setState((s) => { const n = { ...s }; delete n[friend.id]; return n; }); return; }
    }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); setState((s) => ({ ...s, [friend.id]: "copied" })); setTimeout(() => setState((s) => { const n = { ...s }; delete n[friend.id]; return n; }), 2000); } catch {}
  }

  if (!loaded) return null;
  if (friends.length === 0) {
    return (
      <div className="ticket p-4 mb-5 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0"><Users size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Pas encore d&apos;amis sur DailyRap</span>
          <span className="block text-xs text-ink-faint">Partage le lien : ceux qui entrent avec deviennent tes amis automatiquement.</span>
        </span>
      </div>
    );
  }

  return (
    <div className="ticket mb-5">
      <p className="px-4 pt-4 pb-2 text-xs font-semibold text-ink-faint flex items-center gap-1.5"><Users size={13} /> Tes amis</p>
      <ul className="divide-y divide-white/6 max-h-56 overflow-y-auto overscroll-contain" data-lenis-prevent>
        {friends.map((f) => {
          const here = inRoomIds.includes(f.id);
          const st = state[f.id];
          return (
            <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
              {f.avatar ? <img src={f.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" /> : <span className="w-9 h-9 rounded-full bg-gold/20 text-gold grid place-items-center text-xs font-bold shrink-0">{f.name.slice(0, 1).toUpperCase()}</span>}
              <span className="text-sm font-semibold flex-1 truncate">{f.name}</span>
              {here ? (
                <span className="text-xs font-semibold text-gold inline-flex items-center gap-1"><Check size={13} strokeWidth={3} /> Dans le salon</span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <button type="button" onClick={() => invite(f)} disabled={st === "busy"} className="sticker sticker-sm !min-h-[36px] !px-3 !text-xs">
                    {st === "sent" ? <><Check size={12} strokeWidth={3} /> Invité</> : st === "copied" ? <><Check size={12} /> Copié</> : <><Send size={12} /> Inviter</>}
                  </button>
                  <button type="button" onClick={() => shareLink(f)} aria-label={`Envoyer le lien à ${f.name}`} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 grid place-items-center text-ink-muted"><Link2 size={14} /></button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
