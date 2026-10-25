"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, Download, Plus, RefreshCw, ExternalLink } from "lucide-react";
import { THEME_OPTIONS } from "@/lib/themes";

/*
 * Onglet « Clips » du back-office — le catalogue du jeu « Devine le clip ».
 *  - Importer : pour un thème, récupère le pool Deezer puis ne garde que les clips publiés
 *    sur la chaîne officielle de l'artiste (lib/youtube.ts). Chaque clip importé reste à
 *    valider à l'œil : on peut le couper, régler le point de départ, ou le supprimer.
 *  - Ajouter : une URL YouTube + artiste + titre, pour les clips choisis à la main.
 */

type Clip = {
  id: number;
  video_id: string;
  artist: string;
  title: string;
  feats: string[];
  start_seconds: number;
  duration: number | null;
  tags: string[];
  enabled: boolean;
  source: string;
  created_at: string;
};

export default function AdminClipsTab() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState("");
  const [importTheme, setImportTheme] = useState("hits-2026");
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ url: "", artist: "", title: "", start: "45", tags: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/clips${tag ? `?tag=${encodeURIComponent(tag)}` : ""}`, { cache: "no-store" });
    const d = await r.json();
    setClips(d.clips ?? []);
    setLoading(false);
  }, [tag]);

  useEffect(() => {
    load();
  }, [load]);

  async function runImport() {
    setImporting(true);
    setMsg(null);
    const r = await fetch("/api/admin/clips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importTheme }) });
    const d = await r.json();
    setMsg(d.error ? `Erreur : ${d.error}` : `${d.added} clip(s) ajouté(s), ${d.skipped} morceau(x) sans clip officiel (sur ${d.total}).`);
    setImporting(false);
    load();
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch("/api/admin/clips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: form.url, artist: form.artist, title: form.title, start: Number(form.start), tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean) }),
    });
    const d = await r.json();
    setMsg(d.error ? `Erreur : ${d.error}` : "Clip ajouté.");
    if (!d.error) setForm({ url: "", artist: "", title: "", start: "45", tags: "" });
    load();
  }

  async function patch(id: number, body: Record<string, unknown>) {
    await fetch("/api/admin/clips", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...body } : c)));
  }

  async function remove(id: number) {
    if (!confirm("Supprimer ce clip du catalogue ?")) return;
    await fetch(`/api/admin/clips?id=${id}`, { method: "DELETE" });
    setClips((prev) => prev.filter((c) => c.id !== id));
  }

  const enabledCount = clips.filter((c) => c.enabled).length;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="font-semibold mb-1 flex items-center gap-2"><Download size={16} className="text-gold" /> Importer depuis un thème</p>
          <p className="text-xs text-ink-faint mb-3">Pool Deezer du thème → recherche YouTube → seuls les clips de la chaîne officielle de l&apos;artiste sont gardés. Nécessite YOUTUBE_API_KEY.</p>
          <div className="flex gap-2">
            <select value={importTheme} onChange={(e) => setImportTheme(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
              {THEME_OPTIONS.filter((t) => t.id !== "mix").map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <button type="button" onClick={runImport} disabled={importing} className="bg-gold hover:bg-glow text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2">
              {importing ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />} Importer
            </button>
          </div>
        </div>
        <form onSubmit={addManual} className="card p-5">
          <p className="font-semibold mb-1 flex items-center gap-2"><Plus size={16} className="text-gold" /> Ajouter un clip à la main</p>
          <p className="text-xs text-ink-faint mb-3">URL YouTube (ou ID), artiste exact, titre, point de départ en secondes, tags (ids de thèmes séparés par des virgules).</p>
          <div className="grid grid-cols-2 gap-2">
            <input required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://youtube.com/watch?v=…" className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            <input required value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} placeholder="Artiste" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            <input value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} placeholder="Départ (s)" type="number" min={0} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tags : 93, artist-jul" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="mt-3 bg-gold hover:bg-glow text-white rounded-lg px-4 py-2 text-sm font-semibold">Ajouter</button>
        </form>
      </div>

      {msg && <p className="text-sm text-ink-muted">{msg}</p>}

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-white/8">
          <p className="font-semibold flex-1">{clips.length} clip(s) · {enabledCount} actif(s)</p>
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm">
            <option value="">Tous les thèmes</option>
            {THEME_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <button type="button" onClick={load} aria-label="Rafraîchir" className="w-9 h-9 rounded-lg bg-white/5 grid place-items-center text-ink-muted"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button>
        </div>
        <div className="divide-y divide-white/8 max-h-[70vh] overflow-y-auto">
          {clips.map((c) => (
            <div key={c.id} className={`flex items-center gap-3 p-3 ${c.enabled ? "" : "opacity-50"}`}>
              <a href={`https://www.youtube.com/watch?v=${c.video_id}&t=${c.start_seconds}s`} target="_blank" rel="noopener noreferrer" className="shrink-0 relative">
                <img src={`https://i.ytimg.com/vi/${c.video_id}/mqdefault.jpg`} alt="" className="w-24 h-14 object-cover rounded-md" loading="lazy" />
                <ExternalLink size={12} className="absolute bottom-1 right-1 text-white drop-shadow" />
              </a>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{c.artist} — {c.title}</p>
                <p className="text-[11px] text-ink-faint truncate">{c.tags.join(", ") || "sans tag"} · {c.source} · {c.duration ? `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, "0")}` : "?"}</p>
              </div>
              <label className="text-[11px] text-ink-faint flex items-center gap-1">
                départ
                <input type="number" min={0} defaultValue={c.start_seconds} onBlur={(e) => patch(c.id, { start_seconds: Number(e.target.value) })} className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs" />
                s
              </label>
              <button type="button" role="switch" aria-checked={c.enabled} onClick={() => patch(c.id, { enabled: !c.enabled })} className={`relative w-11 h-6 rounded-full transition-colors ${c.enabled ? "bg-gold" : "bg-white/15"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${c.enabled ? "translate-x-5" : ""}`} />
              </button>
              <button type="button" onClick={() => remove(c.id)} aria-label="Supprimer" className="w-9 h-9 rounded-lg grid place-items-center text-ink-faint hover:text-riseNeg"><Trash2 size={15} /></button>
            </div>
          ))}
          {clips.length === 0 && !loading && <p className="p-6 text-sm text-ink-faint text-center">Aucun clip. Importe un thème ou ajoute une URL.</p>}
        </div>
      </div>
    </div>
  );
}
