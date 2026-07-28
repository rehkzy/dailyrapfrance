"use client";

import { useEffect, useState } from "react";
import { Send, Check, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type FriendLite = { id: string; name: string };

/*
 * Liste d'amis dans le lobby d'un salon en ligne — inviter chacun en un tap.
 * "Inviter" ouvre le partage natif (WhatsApp, iMessage…) avec un message personnalisé
 * au nom de l'ami + le lien du salon (rejoint automatiquement via ?room=CODE) ;
 * sans partage natif, copie le message + lien avec confirmation.
 */
export default function RoomFriendInvites({ userId, roomCode }: { userId: string; roomCode: string }) {
  const [friends, setFriends] = useState<FriendLite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("friendships")
      .select(
        "status,requester_id,addressee_id,requester:requester_id(id,username,display_name),addressee:addressee_id(id,username,display_name)"
      )
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .then(({ data }) => {
        const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
        const list: FriendLite[] = [];
        for (const r of (data ?? []) as unknown as {
          requester_id: string;
          addressee_id: string;
          requester: unknown;
          addressee: unknown;
        }[]) {
          const other = one(r.requester_id === userId ? r.addressee : r.requester) as {
            id: string;
            username: string | null;
            display_name: string | null;
          } | null;
          if (other) list.push({ id: other.id, name: other.display_name ?? other.username ?? "Joueur" });
        }
        setFriends(list);
        setLoaded(true);
      });
  }, [userId]);

  async function invite(friend: FriendLite) {
    const url = `${window.location.origin}/blindtest?room=${roomCode}`;
    const text = `${friend.name}, rejoins mon salon blind test rap FR sur DailyRapFrance ! Code : ${roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Blind Test Rap Français", text, url });
        return;
      } catch {
        return; // annulé
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopiedId(friend.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* rien */
    }
  }

  // Pas d'amis (ou pas encore chargé) : on n'ajoute pas de bloc vide au lobby,
  // le bouton "Partager l'invitation" générique est déjà là.
  if (!loaded || friends.length === 0) return null;

  return (
    <div className="glass rounded-xl p-4 mb-6 text-left">
      <p className="font-mono text-xs text-ink-faint uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Users size={13} /> Invite tes amis
      </p>
      <ul className="space-y-1 max-h-44 overflow-y-auto overscroll-contain">
        {friends.map((f) => (
          <li key={f.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5">
            <span className="w-8 h-8 shrink-0 rounded-full bg-gold/15 text-gold flex items-center justify-center text-xs font-semibold">
              {f.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-sm font-medium flex-1 truncate">{f.name}</span>
            <button
              onClick={() => invite(f)}
              className="press inline-flex items-center gap-1.5 rounded-full bg-gold hover:bg-glow text-white text-xs font-semibold px-3 py-1.5 transition-colors"
            >
              {copiedId === f.id ? <Check size={12} /> : <Send size={12} />}
              {copiedId === f.id ? "Copié !" : "Inviter"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
