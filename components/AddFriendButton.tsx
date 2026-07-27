"use client";

import { useEffect, useState } from "react";
import { UserPlus, Check, X, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";

type Status = "loading" | "self" | "none" | "outgoing" | "incoming" | "friends";

export default function AddFriendButton({
  targetId,
  onChange,
  size = "md",
}: {
  targetId: string;
  onChange?: () => void;
  size?: "sm" | "md";
}) {
  const { user } = useUser();
  const [status, setStatus] = useState<Status>("loading");
  const [rowId, setRowId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    if (user.id === targetId) {
      setStatus("self");
      return;
    }
    let cancelled = false;
    supabase
      .from("friendships")
      .select("id,status,requester_id,addressee_id")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) {
          setStatus("none");
          setRowId(null);
        } else if (data.status === "accepted") {
          setStatus("friends");
          setRowId(data.id);
        } else if (data.requester_id === user.id) {
          setStatus("outgoing");
          setRowId(data.id);
        } else {
          setStatus("incoming");
          setRowId(data.id);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, targetId]);

  async function sendRequest() {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: targetId, status: "pending" })
      .select("id")
      .single();
    setBusy(false);
    if (!error && data) {
      setRowId(data.id);
      setStatus("outgoing");
      onChange?.();
    }
  }

  async function acceptRequest() {
    if (!rowId) return;
    setBusy(true);
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", rowId);
    setBusy(false);
    if (!error) {
      setStatus("friends");
      onChange?.();
    }
  }

  async function removeRelation() {
    if (!rowId) return;
    setBusy(true);
    const { error } = await supabase.from("friendships").delete().eq("id", rowId);
    setBusy(false);
    if (!error) {
      setStatus("none");
      setRowId(null);
      onChange?.();
    }
  }

  const h = size === "sm" ? "h-8 text-xs px-3" : "h-9 text-sm px-4";

  if (!user || status === "self" || status === "loading") return null;

  if (status === "none") {
    return (
      <button
        onClick={sendRequest}
        disabled={busy}
        className={`tap-press inline-flex items-center gap-1.5 ${h} rounded-full bg-gold hover:bg-glow disabled:opacity-50 text-white font-medium transition-colors`}
      >
        <UserPlus size={14} />
        Ajouter
      </button>
    );
  }

  if (status === "outgoing") {
    return (
      <button
        onClick={removeRelation}
        disabled={busy}
        className={`tap-press inline-flex items-center gap-1.5 ${h} rounded-full glass text-ink-muted hover:text-riseNeg disabled:opacity-50 font-medium transition-colors`}
      >
        <Clock size={13} />
        Envoyée — annuler
      </button>
    );
  }

  if (status === "incoming") {
    return (
      <div className="inline-flex items-center gap-2">
        <button
          onClick={acceptRequest}
          disabled={busy}
          className={`tap-press inline-flex items-center gap-1.5 ${h} rounded-full bg-gold hover:bg-glow disabled:opacity-50 text-white font-medium transition-colors`}
        >
          <Check size={14} />
          Accepter
        </button>
        <button
          onClick={removeRelation}
          disabled={busy}
          aria-label="Refuser la demande"
          className={`tap-press inline-flex items-center justify-center w-9 ${h.replace(/px-\d/, "")} rounded-full glass text-ink-faint hover:text-riseNeg disabled:opacity-50 transition-colors`}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // status === "friends"
  return (
    <button
      onClick={removeRelation}
      disabled={busy}
      className={`tap-press inline-flex items-center gap-1.5 ${h} rounded-full bg-gold/10 border border-gold/30 text-gold hover:bg-riseNeg/10 hover:border-riseNeg/30 hover:text-riseNeg disabled:opacity-50 font-medium transition-colors`}
    >
      <Check size={14} />
      Amis
    </button>
  );
}
