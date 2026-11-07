"use client";

import { MessageCircle } from "lucide-react";
import { useUser } from "@/lib/useUser";
import { useUnreadMessages } from "@/lib/useUnreadMessages";

/** Messagerie dans le header, avec le nombre de messages non lus. */
export default function MsgIcon({ className = "" }: { className?: string }) {
  const { user } = useUser();
  const n = useUnreadMessages(user?.id);
  if (!user) return null;
  return (
    <a href="/messages" className={`relative w-10 h-10 grid place-items-center text-ink active:scale-90 transition-transform ${className}`} aria-label={n ? `${n} messages non lus` : "Messages"}>
      <MessageCircle size={21} />
      {n > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-gold text-white text-[10px] font-extrabold grid place-items-center ring-2 ring-[#0A0707]">{n > 9 ? "9+" : n}</span>}
    </a>
  );
}
