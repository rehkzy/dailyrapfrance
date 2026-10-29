"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Globe, Lock, Star, Trash2, ExternalLink } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Btn, Chip, Empty, Input, rel } from "@/components/admin/ui";

type Item = { id: string; slug: string; title: string; description: string | null; track_ids: number[]; is_public: boolean; featured: boolean; plays: number; created_at: string; user_id: string; profiles: { username: string | null; display_name: string | null; verified?: boolean } | { username: string | null; display_name: string | null; verified?: boolean }[] | null };

/* Blind tests des joueurs : modérer (public/privé), mettre en avant dans la communauté, supprimer. */
export default function BlindTestsTab() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"" | "public" | "featured">("");
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/admin/blindtests?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d) => (d.error ? setError(d.error) : setItems(d.items))).catch(() => setError("Chargement impossible."));
  }, [q]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  async function patch(it: Item, body: Partial<Pick<Item, "is_public" | "featured">>) {
    const res = await fetch("/api/admin/blindtests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: it.id, ...body }) });
    const d = await res.json();
    if (d.error) { setError(d.error); return; }
    setItems((prev) => (prev ?? []).map((x) => (x.id === it.id ? { ...x, ...body } : x)));
  }
  async function remove(it: Item) {
    const res = await fetch(`/api/admin/blindtests?id=${it.id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.error) { setError(d.error); return; }
    setItems((prev) => (prev ?? []).filter((x) => x.id !== it.id)); setConfirm(null);
  }
  const author = (it: Item) => (Array.isArray(it.profiles) ? it.profiles[0] : it.profiles);
  const shown = (items ?? []).filter((it) => (filter === "public" ? it.is_public : filter === "featured" ? it.featured : true));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un blind test par titre…" className="!pl-10" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip on={filter === ""} onClick={() => setFilter("")}>Tous</Chip>
        <Chip on={filter === "public"} onClick={() => setFilter("public")}>Publics</Chip>
        <Chip on={filter === "featured"} onClick={() => setFilter("featured")}>Mis en avant</Chip>
      </div>
      {error && <div className="card p-4 text-sm text-riseNeg">{error}</div>}
      {!items ? <Empty>Chargement…</Empty> : shown.length === 0 ? <Empty>Aucun blind test.</Empty> : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-white/5">
            {shown.map((it) => { const p = author(it); return (
              <li key={it.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${it.is_public ? "bg-gold/15 text-gold" : "bg-white/6 text-ink-muted"}`}>{it.is_public ? <Globe size={16} /> : <Lock size={16} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold"><span className="truncate">{it.title}</span>{it.featured && <Star size={13} className="text-gold" fill="currentColor" />}</span>
                  <span className="block text-xs text-ink-faint truncate">{it.track_ids.length} titres · {it.plays} partie{it.plays > 1 ? "s" : ""} · par {p?.display_name ?? p?.username ?? "?"}{p?.verified && <VerifiedBadge size={11} className="ml-1" />} · {rel(it.created_at)}</span>
                </span>
                <Btn small href={`/b/${it.slug}`}><ExternalLink size={12} /> Ouvrir</Btn>
                <Btn small onClick={() => patch(it, { is_public: !it.is_public })}>{it.is_public ? "Rendre privé" : "Rendre public"}</Btn>
                <Btn small tone={it.featured ? "primary" : "ghost"} onClick={() => patch(it, { featured: !it.featured })} title="Mis en avant dans la communauté"><Star size={12} /> {it.featured ? "En avant" : "Mettre en avant"}</Btn>
                {confirm === it.id ? <><Btn small tone="danger" onClick={() => remove(it)}>Confirmer</Btn><Btn small onClick={() => setConfirm(null)}>Annuler</Btn></> : <button type="button" onClick={() => setConfirm(it.id)} className="text-ink-faint hover:text-riseNeg" aria-label="Supprimer"><Trash2 size={15} /></button>}
              </li>
            ); })}
          </ul>
        </div>
      )}
    </div>
  );
}
