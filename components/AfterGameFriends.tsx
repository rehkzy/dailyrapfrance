"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AddFriendButton from "@/components/AddFriendButton";

/*
 * Fin de partie en ligne : les joueurs qui ne sont pas (encore) tes amis, avec le bouton
 * Ajouter. Une partie ensemble est le meilleur moment pour se suivre.
 */
export default function AfterGameFriends({ userId, players, excludeIds }: { userId: string; players: { user_id: string; display_name: string }[]; excludeIds?: Set<string> }) {
  const [friendIds, setFriendIds] = useState<Set<string> | null>(null);
  const [profiles, setProfiles] = useState<Record<string, { username: string | null; avatar_url: string | null }>>({});
  const others = players.filter((p) => p.user_id !== userId && !excludeIds?.has(p.user_id));

  useEffect(() => {
    if (others.length === 0) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("friendships").select("requester_id,addressee_id,status").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      supabase.from("profiles").select("id,username,avatar_url").in("id", others.map((o) => o.user_id)),
    ]).then(([fr, pr]) => {
      const ids = new Set<string>();
      for (const r of fr.data ?? []) ids.add(r.requester_id === userId ? r.addressee_id : r.requester_id); // en attente compris : pas de relance
      setFriendIds(ids);
      const map: Record<string, { username: string | null; avatar_url: string | null }> = {};
      for (const p of pr.data ?? []) map[p.id] = { username: p.username, avatar_url: p.avatar_url };
      setProfiles(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, others.map((o) => o.user_id).join(",")]);

  if (!friendIds) return null;
  const candidates = others.filter((o) => !friendIds.has(o.user_id));
  if (candidates.length === 0) return null;

  return (
    <section className="ticket mb-5" aria-label="Ajouter en ami">
      <p className="px-5 pt-4 pb-2 font-display text-base font-bold inline-flex items-center gap-1.5"><UserPlus size={15} className="text-gold" /> {candidates.length > 1 ? "Vous avez joué ensemble" : "Vous avez joué ensemble"}</p>
      <ul className="divide-y divide-white/6">
        {candidates.map((c) => {
          const p = profiles[c.user_id];
          return (
            <li key={c.user_id} className="flex items-center gap-3 px-5 py-2.5">
              {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" /> : <span className="w-9 h-9 rounded-full bg-gold/20 text-gold grid place-items-center text-xs font-bold shrink-0">{c.display_name.slice(0, 1).toUpperCase()}</span>}
              <a href={p?.username ? `/profil/${p.username}` : "#"} className="min-w-0 flex-1 text-sm font-semibold truncate">{c.display_name}</a>
              <AddFriendButton targetId={c.user_id} size="sm" />
            </li>
          );
        })}
      </ul>
      <p className="px-5 py-3 text-[11px] text-ink-faint">En amis : revanche en un tap, classement entre vous, et la messagerie.</p>
    </section>
  );
}
