"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pin, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Btn, Empty, Input, Panel, rel } from "@/components/admin/ui";
import type { MediaPost } from "@/app/api/admin/posts/route";

const KINDS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X" },
  { id: "article", label: "Article / autre" },
];

/* Posts DailyRap : ce que tu publies toi — affiché dans /actu, onglet DailyRap. */
export default function PostsTab() {
  const [items, setItems] = useState<MediaPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", url: "", image: "", kind: "instagram", body: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/posts").then((r) => r.json()).then((d) => (d.error ? setError(d.error) : setItems(d.items))).catch(() => setError("Chargement impossible."));
  }, []);
  useEffect(load, [load]);

  async function create() {
    setBusy(true);
    const res = await fetch("/api/admin/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, image: form.image || null, body: form.body || null }) });
    const d = await res.json();
    setBusy(false);
    if (d.error) { setError(d.error); return; }
    setItems((prev) => [d.item, ...(prev ?? [])]);
    setForm({ title: "", url: "", image: "", kind: "instagram", body: "" });
  }
  async function patch(it: MediaPost, body: Partial<MediaPost>) {
    const res = await fetch("/api/admin/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: it.id, ...body }) });
    const d = await res.json();
    if (d.error) { setError(d.error); return; }
    setItems((prev) => (prev ?? []).map((x) => (x.id === it.id ? { ...x, ...body } : x)));
  }
  async function remove(it: MediaPost) {
    const res = await fetch(`/api/admin/posts?id=${it.id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.error) { setError(d.error); return; }
    setItems((prev) => (prev ?? []).filter((x) => x.id !== it.id));
  }

  return (
    <div className="space-y-5">
      {error && <div className="card p-4 text-sm text-riseNeg">{error}</div>}
      <Panel title="Nouveau post">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre — ex. « Interview Werenoi : 10 min dans son studio »" className="sm:col-span-2" />
          <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="Lien du post (Instagram, TikTok, YouTube, article…)" />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm">
            {KINDS.map((k) => <option key={k.id} value={k.id} className="bg-[#120b0c]">{k.label}</option>)}
          </select>
          <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Image (URL) — optionnel" />
          <Input value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Une phrase d'accroche — optionnel" />
        </div>
        <div className="flex justify-end mt-3"><Btn tone="primary" onClick={create} disabled={busy || !form.title.trim() || !form.url.trim()}><Plus size={14} /> Publier</Btn></div>
        <p className="text-[11px] text-ink-faint mt-2">Visible dans Actu → onglet DailyRap. Épingle un post pour le garder en tête.</p>
      </Panel>

      {!items ? <Empty>Chargement…</Empty> : items.length === 0 ? <Empty>Aucun post pour l&apos;instant.</Empty> : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-white/5">
            {items.map((it) => (
              <li key={it.id} className={`flex items-center gap-3 px-4 py-3 ${!it.published ? "opacity-60" : ""}`}>
                {it.image ? <img src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" /> : <span className="w-12 h-12 rounded-lg bg-white/6 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold"><span className="truncate">{it.title}</span>{it.pinned && <Pin size={12} className="text-gold" />}</span>
                  <span className="block text-xs text-ink-faint truncate">{KINDS.find((k) => k.id === it.kind)?.label ?? it.kind} · {rel(it.created_at)} · {it.published ? "publié" : "brouillon"}</span>
                </span>
                <Btn small href={it.url}><ExternalLink size={12} /></Btn>
                <Btn small onClick={() => patch(it, { pinned: !it.pinned })} title="Épingler"><Pin size={12} /></Btn>
                <Btn small onClick={() => patch(it, { published: !it.published })} title={it.published ? "Dépublier" : "Publier"}>{it.published ? <EyeOff size={12} /> : <Eye size={12} />}</Btn>
                <button type="button" onClick={() => remove(it)} className="text-ink-faint hover:text-riseNeg" aria-label="Supprimer"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
