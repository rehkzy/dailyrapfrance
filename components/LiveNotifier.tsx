"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, Share, PlusSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { useUnreadNotifications, type Notif } from "@/lib/useNotifications";
import { enablePush, pushEnabled, pushSupport } from "@/lib/pushClient";
import { pushSnoozed, snoozePush, requestPushNudge } from "@/lib/pushNudge";
import { sfx } from "@/lib/sfx";
import BrandMark from "@/components/BrandMark";
import { ensureDeviceKey, flushOutbox, readOutbox } from "@/lib/dmTransport";

/*
 * Ce qui marche SANS autorisation, tant que le site est ouvert (même en arrière-plan) :
 *  · un toast en haut dès qu'une notification arrive (temps réel) + petit son ;
 *  · le titre de l'onglet « (2) DailyRap » quand on n'est pas sur la page ;
 *  · la pastille sur l'icône de l'app installée (Badging API).
 * Ce qui demande l'autorisation : les notifications quand le site est FERMÉ (push). On la
 * propose au bon moment via <PushNudge>, jamais à froid.
 */
export default function LiveNotifier() {
  const { user } = useUser();
  const unread = useUnreadNotifications(user?.id);
  const [toast, setToast] = useState<Notif | null>(null);
  const [nudge, setNudge] = useState<null | "ask" | "ios">(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseTitle = useRef<string>("");

  // Clé de messagerie publiée dès qu'on est connecté, sur n'importe quelle page ; et les messages
  // en attente partent dès que la clé de l'ami apparaît (ou au chargement).
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    let me: Awaited<ReturnType<typeof ensureDeviceKey>> = null;
    ensureDeviceKey(supabase, user.id).then((id) => { me = id; if (id && readOutbox().length) void flushOutbox(supabase, id, user.id); });
    const ch = supabase.channel(`keys-watch:${user.id}:${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "user_keys" }, (p) => {
      const uid = (p.new as { user_id?: string }).user_id;
      if (me && uid && readOutbox().some((o) => o.to === uid)) void flushOutbox(supabase, me, user.id, uid);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Toast temps réel
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const ch = supabase.channel(`notif-live:${user.id}:${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (p) => {
      const n = p.new as Notif;
      // Dans un fil de messagerie, on ne double pas le message par un toast.
      if (n.kind === "message" && location.pathname.startsWith("/messages/")) return;
      if (location.pathname === "/notifications") return;
      setToast(n);
      sfx.click();
      try { navigator.vibrate?.(30); } catch {}
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), 6500);
      // Onglet en arrière-plan + autorisation déjà donnée : vraie notification système, sans push.
      if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
        navigator.serviceWorker?.getRegistration("/sw.js").then((reg) => reg?.showNotification(n.title, { body: n.body ?? undefined, icon: "/icon-192.png", badge: "/icon-192.png", data: { url: n.url ?? "/notifications" }, tag: `n-${n.id}` })).catch(() => {});
      }
      requestPushNudge("notif");
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Titre d'onglet + pastille d'icône
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title;
    const apply = () => {
      const t = baseTitle.current || document.title.replace(/^\(\d+\+?\) /, "");
      document.title = unread > 0 && document.visibilityState === "hidden" ? `(${unread > 9 ? "9+" : unread}) ${t}` : t;
    };
    apply();
    document.addEventListener("visibilitychange", apply);
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (unread > 0) nav.setAppBadge?.(unread).catch(() => {}); else nav.clearAppBadge?.().catch(() => {});
    return () => document.removeEventListener("visibilitychange", apply);
  }, [unread]);

  // Proposer les notifications au bon moment
  useEffect(() => {
    if (!user) return;
    const onNudge = () => {
      if (pushEnabled() || pushSnoozed()) return;
      const s = pushSupport();
      if (s === "ok") setNudge("ask");
      else if (s === "ios-needs-install") setNudge("ios");
    };
    window.addEventListener("drf:push-nudge", onNudge);
    return () => window.removeEventListener("drf:push-nudge", onNudge);
  }, [user]);

  async function accept() {
    const ok = await enablePush();
    if (!ok) snoozePush(3);
    setNudge(null);
  }
  function later() { snoozePush(7); setNudge(null); }

  return (
    <>
      {toast && (
        <a href={toast.url ?? "/notifications"} onClick={() => setToast(null)} className="live-toast" role="status">
          <span className="live-toast-ic"><BrandMark size={16} className="text-white" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[13px] font-extrabold truncate">{toast.title}</span>{toast.body && <span className="block text-[12px] text-ink-muted truncate">{toast.body}</span>}</span>
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setToast(null); }} className="w-8 h-8 rounded-full grid place-items-center text-ink-faint" aria-label="Fermer"><X size={14} /></button>
        </a>
      )}
      {nudge && (
        <>
          <div className="sheet-backdrop" onClick={later} />
          <div className="sheet push-nudge" role="dialog" aria-label="Notifications">
            <span className="w-14 h-14 rounded-2xl bg-gold text-white grid place-items-center mb-3 shadow-brand"><Bell size={26} /></span>
            {nudge === "ask" ? (
              <>
                <p className="font-display text-2xl font-bold leading-tight mb-1">Sois prévenu même site fermé</p>
                <p className="text-sm text-ink-muted mb-5">Demandes d&apos;amis, invitations en salon, potes qui battent ton score, messages. Rien d&apos;autre, et ça se coupe dans les réglages.</p>
                <button type="button" onClick={() => void accept()} className="sticker w-full justify-center">Activer les notifications</button>
                <button type="button" onClick={later} className="w-full text-center text-sm text-ink-faint py-3">Plus tard</button>
              </>
            ) : (
              <>
                <p className="font-display text-2xl font-bold leading-tight mb-1">Mets DailyRap sur ton écran d&apos;accueil</p>
                <p className="text-sm text-ink-muted mb-4">Sur iPhone, les notifications ne marchent que pour les sites installés. Ça prend 5 secondes et tu as une vraie app.</p>
                <ol className="space-y-2 text-sm mb-5">
                  <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-xl bg-white/8 grid place-items-center shrink-0"><Share size={16} /></span>Appuie sur <b>Partager</b> en bas de Safari</li>
                  <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-xl bg-white/8 grid place-items-center shrink-0"><PlusSquare size={16} /></span>Puis <b>Sur l&apos;écran d&apos;accueil</b></li>
                  <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-xl bg-white/8 grid place-items-center shrink-0"><Bell size={16} /></span>Ouvre l&apos;app, on te propose les notifs</li>
                </ol>
                <button type="button" onClick={later} className="sticker w-full justify-center">Compris</button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
