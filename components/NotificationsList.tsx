"use client";

import { useEffect, useState } from "react";
import { Bell, UserPlus, UserCheck, Swords, Trophy, MessageCircle, Gift, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { useNotifications, type Notif } from "@/lib/useNotifications";
import AddFriendButton from "@/components/AddFriendButton";
import BrandLoader from "@/components/BrandLoader";
import SignInCta from "@/components/SignInCta";

type Lite = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

const ICON: Record<string, { Icon: typeof Bell; bg: string; fg: string }> = {
  friend_request: { Icon: UserPlus, bg: "rgba(240,0,28,.18)", fg: "#ff5a6a" },
  friend_accepted: { Icon: UserCheck, bg: "rgba(240,0,28,.18)", fg: "#ff5a6a" },
  room_invite: { Icon: Swords, bg: "rgba(240,0,28,.32)", fg: "#fff" },
  beaten: { Icon: Trophy, bg: "rgba(255,255,255,.08)", fg: "#f5e8e8" },
  message: { Icon: MessageCircle, bg: "rgba(255,255,255,.08)", fg: "#f5e8e8" },
  referral: { Icon: Gift, bg: "rgba(240,0,28,.18)", fg: "#ff5a6a" },
  system: { Icon: Bell, bg: "rgba(255,255,255,.08)", fg: "#f5e8e8" },
};

function when(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function section(iso: string) {
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
  if (Date.now() - d.getTime() < 7 * 86400000) return "Cette semaine";
  return "Plus tôt";
}

export default function NotificationsList() {
  const { user, loading } = useUser();
  const { items, markAllRead, remove, reload } = useNotifications(user?.id);
  const [actors, setActors] = useState<Record<string, Lite>>({});

  // On marque tout lu quand la page est ouverte (le badge retombe) — l'état non-lu reste visible le temps de la visite.
  const [seenUnread, setSeenUnread] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (!items) return;
    const unread = items.filter((n) => !n.read_at).map((n) => n.id);
    if (unread.length) { setSeenUnread((s) => new Set([...s, ...unread])); void markAllRead(); }
    const ids = [...new Set(items.map((n) => n.actor_id).filter((x): x is string => !!x))].filter((id) => !actors[id]);
    if (ids.length) createClient().from("profiles").select("id,username,display_name,avatar_url").in("id", ids).then(({ data }) => setActors((a) => ({ ...a, ...Object.fromEntries((data ?? []).map((p) => [p.id, p])) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  if (loading) return <div className="py-20 grid place-items-center"><BrandLoader size="md" /></div>;
  if (!user) return <div className="max-w-sm mx-auto ticket p-8 text-center"><p className="font-display text-xl font-bold mb-2">Connecte-toi</p><p className="text-sm text-ink-muted mb-5">Tes notifications t&apos;attendent ici.</p><SignInCta /></div>;
  if (items === null) return <div className="py-10 grid place-items-center"><BrandLoader size="md" /></div>;

  if (items.length === 0) {
    return (
      <div className="ticket p-8 text-center">
        <span className="w-14 h-14 rounded-2xl bg-gold/15 text-gold grid place-items-center mx-auto mb-3"><Bell size={24} /></span>
        <p className="font-display text-lg font-bold mb-1">Rien pour l&apos;instant</p>
        <p className="text-sm text-ink-muted">Demandes d&apos;amis, invitations en salon, scores battus, messages : tout arrivera ici.</p>
        <a href="/amis" className="sticker sticker-sm mt-4">Trouver des potes</a>
      </div>
    );
  }

  const groups: { label: string; list: Notif[] }[] = [];
  for (const n of items) {
    const label = section(n.created_at);
    const g = groups.find((x) => x.label === label);
    if (g) g.list.push(n); else groups.push({ label, list: [n] });
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.label}>
          <p className="stage-kicker mb-2">{g.label}</p>
          <div className="dm-list">
            {g.list.map((n) => {
              const { Icon, bg, fg } = ICON[n.kind] ?? ICON.system;
              const actor = n.actor_id ? actors[n.actor_id] : undefined;
              const fresh = seenUnread.has(n.id);
              const Wrap = n.url ? "a" : "div";
              return (
                <div key={n.id} className="dm-row items-start" data-unread={fresh}>
                  <span className="relative shrink-0">
                    {actor?.avatar_url ? <img src={actor.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" /> : <span className="w-11 h-11 rounded-full grid place-items-center text-white font-extrabold" style={{ background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{(actor?.display_name ?? "D").slice(0, 1).toUpperCase()}</span>}
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full grid place-items-center ring-2 ring-[#0a0707]" style={{ background: bg, color: fg }}><Icon size={12} /></span>
                  </span>
                  <Wrap {...(n.url ? { href: n.url } : {})} className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className={`text-[14px] leading-snug ${fresh ? "font-extrabold" : "font-semibold"}`}>{n.title}</span>
                      <span className="text-[11px] text-ink-faint shrink-0 mt-0.5">{when(n.created_at)}</span>
                    </span>
                    {n.body && <span className="block text-[12px] text-ink-muted mt-0.5">{n.body}</span>}
                    {n.kind === "friend_request" && n.actor_id && <span className="block mt-2" onClick={(e) => e.preventDefault()}><AddFriendButton targetId={n.actor_id} size="sm" onChange={reload} /></span>}
                  </Wrap>
                  <button type="button" onClick={() => void remove(n.id)} className="w-8 h-8 -mr-2 rounded-full grid place-items-center text-ink-faint hover:text-ink shrink-0" aria-label="Effacer"><X size={14} /></button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
