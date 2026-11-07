"use client";

import { Bell } from "lucide-react";
import { useUser } from "@/lib/useUser";
import { useUnreadNotifications } from "@/lib/useNotifications";

/** La cloche du header : badge rouge = notifications non lues. */
export default function NotifBell({ className = "" }: { className?: string }) {
  const { user } = useUser();
  const n = useUnreadNotifications(user?.id);
  if (!user) return null;
  return (
    <a href="/notifications" className={`relative w-10 h-10 grid place-items-center text-ink active:scale-90 transition-transform ${className}`} aria-label={n ? `${n} notifications non lues` : "Notifications"}>
      <Bell size={21} />
      {n > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-gold text-white text-[10px] font-extrabold grid place-items-center ring-2 ring-[#0A0707]">{n > 9 ? "9+" : n}</span>}
    </a>
  );
}
