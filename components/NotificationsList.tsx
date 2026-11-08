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
  const [filter, setFilter] = useState("all");

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

  const FILTERS: { id: string; label: string; kinds: string[] }[] = [
    { id: "all", label: "Tout", kinds: [] },
    { id: "friends", label: "Amis", kinds: ["friend_request", "friend_accepted", "referral"] },
    { id: "games", label: "Parties", kinds: ["room_invite", "beaten"] },
    { id: "messages", label: "Messages", kinds: ["message"] },
  ];
  const shown = items.filter((n) => filter === "all" || (FILTERS.find((f) => f.id === filter)?.kinds ?? []).includes(n.kind));
  const pendingRequests = items.filter((n) => n.kind === "friend_request").length;

  if (items.length === 0) {
    return (
      <div className="notif-empty">
        <span className="notif-empty-ic"><Bell size={26} /></span>
        <p className="font-display text-xl font-bold mb-1">Rien pour l&apos;instant</p>
        <p className="text-sm text-ink-muted max-w-xs mx-auto">Demandes d&apos;amis, invitations en salon, scores battus, messages : tout arrivera ici, en direct.</p>
        <a href="/amis" className="sticker sticker-sm mt-5">Trouver des potes</a>
      </div>
    );
  }

  const groups: { label: string; list: Notif[] }[] = [];
  for (const n of shown) {
    const label = section(n.created_at);
    const g = groups.find((x) => x.label === label);
    if (g) g.list.push(n); else groups.push({ label, list: [n] });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} className="notif-chip" data-active={filter === f.id}>
            {f.label}{f.id === "friends" && pendingRequests > 0 && <span className="notif-chip-n">{pendingRequests}</span>}
          </button>
        ))}
        <button type="button" onClick={() => { for (const n of shown) void remove(n.id); }} className="ml-auto text-xs text-ink-faint hover:text-ink whitespace-nowrap px-2">Tout effacer</button>
      </div>

      {shown.length === 0 && <p className="text-sm text-ink-faint py-10 text-center">Rien dans cette catégorie.</p>}

      {groups.map((g) => (
        <section key={g.label}>
          <p className="stage-kicker mb-2">{g.label}</p>
          <div className="notif-list">
            {g.list.map((n) => {
              const { Icon, bg, fg } = ICON[n.kind] ?? ICON.system;
              const actor = n.actor_id ? actors[n.actor_id] : undefined;
              const fresh = seenUnread.has(n.id);
              const name = actor?.display_name ?? actor?.username ?? null;
              const rest = name && n.title.startsWith(name) ? n.title.slice(name.length) : n.title;
              const peerHref = actor ? `/messages/${actor.username ?? actor.id}` : "/messages";
              return (
                <article key={n.id} className="notif-row" data-unread={fresh}>
                  <a href={actor?.username ? `/profil/${actor.username}` : n.url ?? "#"} className="relative shrink-0">
                    {actor?.avatar_url ? <img src={actor.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" /> : <span className="w-12 h-12 rounded-full grid place-items-center text-white font-extrabold text-lg" style={{ background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{(name ?? "D").slice(0, 1).toUpperCase()}</span>}
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full grid place-items-center ring-2 ring-[#0a0707]" style={{ background: bg, color: fg }}><Icon size={12} /></span>
                  </a>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] leading-snug">
                      {name && n.title.startsWith(name) ? <><a href={actor?.username ? `/profil/${actor.username}` : "#"} className="font-extrabold">{name}</a><span className={fresh ? "font-semibold" : ""}>{rest}</span></> : <span className={fresh ? "font-extrabold" : "font-semibold"}>{n.title}</span>}
                    </p>
                    {n.body && <p className="text-[12.5px] text-ink-muted mt-0.5 leading-snug">{n.body}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {n.kind === "friend_request" && n.actor_id && <AddFriendButton targetId={n.actor_id} size="sm" onChange={reload} />}
                      {n.kind === "friend_accepted" && <><a href={peerHref} className="notif-cta">Écrire</a><a href="/jouer?mode=online" className="notif-cta ghost">Défier</a></>}
                      {n.kind === "room_invite" && n.url && <a href={n.url} className="notif-cta">Rejoindre le salon</a>}
                      {n.kind === "beaten" && n.url && <a href={n.url} className="notif-cta">Prendre ma revanche</a>}
                      {n.kind === "message" && <a href={n.url ?? peerHref} className="notif-cta">Répondre</a>}
                      {n.kind === "referral" && <a href={peerHref} className="notif-cta">Lui écrire</a>}
                      <span className="text-[11px] text-ink-faint ml-auto">{when(n.created_at)}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => void remove(n.id)} className="notif-x" aria-label="Effacer"><X size={14} /></button>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
