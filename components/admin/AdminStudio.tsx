"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutGrid, Users, BadgeCheck, Gift, Sparkles, Clapperboard, Newspaper, Radio, Flame,
  TrendingUp, Globe, Mail, Settings as SettingsIcon, Search, Menu, X, ExternalLink, ShieldCheck,
} from "lucide-react";
import { BrandTile } from "@/components/BrandMark";
import { OverviewTab, VisitsTab, RoomsTab, EmailTab, SettingsTab } from "@/components/AdminDashboard";
import AdminClipsTab from "@/components/AdminClipsTab";
import AdminReferralsTab from "@/components/AdminReferralsTab";
import UsersTab from "@/components/admin/UsersTab";
import CertificationTab from "@/components/admin/CertificationTab";
import BlindTestsTab from "@/components/admin/BlindTestsTab";
import PostsTab from "@/components/admin/PostsTab";
import DefiTab from "@/components/admin/DefiTab";
import SiteAnalyticsTab from "@/components/admin/SiteAnalyticsTab";
import { Kpi } from "@/components/admin/ui";

/*
 * Le studio — la coquille du back-office, façon Shopify / YouTube Studio :
 *  - sidebar à gauche, sections groupées (Communauté, Contenu, Jeu, Audience, Communication,
 *    Réglages), badge sur ce qui demande une action (demandes de certification)
 *  - barre du haut : section courante, recherche globale d'un joueur, lien vers le site
 *  - la section est dans l'URL (?s=…) : on peut la mettre en favori ou la partager
 */
type SectionId = "overview" | "users" | "certification" | "referrals" | "blindtests" | "clips" | "posts" | "rooms" | "defi" | "audience" | "visits" | "email" | "settings";
const GROUPS: { label: string; items: { id: SectionId; label: string; Icon: typeof Users; hint?: string }[] }[] = [
  { label: "", items: [{ id: "overview", label: "Vue d'ensemble", Icon: LayoutGrid }] },
  { label: "Communauté", items: [
    { id: "users", label: "Joueurs", Icon: Users, hint: "Tous les comptes, recherche, fiche" },
    { id: "certification", label: "Certification", Icon: BadgeCheck, hint: "Demandes et comptes certifiés" },
    { id: "referrals", label: "Parrainage", Icon: Gift, hint: "Filleuls et tirage" },
  ] },
  { label: "Contenu", items: [
    { id: "blindtests", label: "Blind tests des joueurs", Icon: Sparkles, hint: "Modération, mise en avant" },
    { id: "clips", label: "Clips", Icon: Clapperboard, hint: "Catalogue « Devine le clip »" },
    { id: "posts", label: "Posts DailyRap", Icon: Newspaper, hint: "Ton actu dans /actu" },
  ] },
  { label: "Jeu", items: [
    { id: "rooms", label: "Salons en ligne", Icon: Radio, hint: "Parties en cours" },
    { id: "defi", label: "Défi de la semaine", Icon: Flame, hint: "Participants, calendrier" },
  ] },
  { label: "Audience", items: [
    { id: "audience", label: "Analytics", Icon: TrendingUp, hint: "Trafic, jeu, joueurs — par période" },
    { id: "visits", label: "Visites", Icon: Globe, hint: "Journal des visites" },
  ] },
  { label: "Communication", items: [{ id: "email", label: "Mails", Icon: Mail, hint: "Envoi ciblé" }] },
  { label: "Réglages", items: [{ id: "settings", label: "Pilotage du site", Icon: SettingsIcon, hint: "Annonce, maintenance, interrupteurs" }] },
];
const ALL = GROUPS.flatMap((g) => g.items);

export default function AdminStudio({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const section = (ALL.find((i) => i.id === sp.get("s"))?.id ?? "overview") as SectionId;
  const initialQ = sp.get("q") ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(0);
  const [recipients, setRecipients] = useState<string[]>([]);

  const go = useCallback((id: SectionId, extra?: Record<string, string>) => {
    const p = new URLSearchParams();
    p.set("s", id);
    if (extra) for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    router.replace(`/admin?${p.toString()}`);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [router]);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then((d) => setPending(d?.totals?.pendingVerification ?? 0)).catch(() => {});
  }, [section]);

  const toggleRecipient = useCallback((email: string) => setRecipients((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email])), []);
  const addRecipients = useCallback((emails: string[]) => setRecipients((prev) => Array.from(new Set([...prev, ...emails]))), []);
  const removeRecipient = useCallback((email: string) => setRecipients((prev) => prev.filter((e) => e !== email)), []);

  const current = ALL.find((i) => i.id === section)!;

  const Nav = () => (
    <nav className="space-y-5">
      {GROUPS.map((g) => (
        <div key={g.label}>
          {g.label && <p className="px-2.5 mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">{g.label}</p>}
          <div className="space-y-0.5">
            {g.items.map((it) => (
              <button key={it.id} type="button" onClick={() => go(it.id)} className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-left transition-colors ${section === it.id ? "bg-white text-black font-semibold" : "text-ink-muted hover:text-ink hover:bg-white/5"}`}>
                <it.Icon size={16} className="shrink-0" />
                <span className="flex-1 truncate">{it.label}</span>
                {it.id === "certification" && pending > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${section === it.id ? "bg-black text-white" : "bg-gold text-white"}`}>{pending}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:flex-col border-r border-white/8 bg-[#0b0607] px-3 py-4 sticky top-0 h-screen overflow-y-auto">
        <a href="/" className="flex items-center gap-2.5 px-2 mb-6">
          <BrandTile size={32} />
          <span className="min-w-0"><span className="block text-sm font-semibold leading-tight">Studio</span><span className="block text-[11px] text-ink-faint truncate">{adminEmail}</span></span>
        </a>
        <Nav />
        <a href="/" className="mt-auto flex items-center gap-2 px-2.5 py-2 text-xs text-ink-faint hover:text-ink"><ExternalLink size={13} /> Voir le site</a>
      </aside>

      {/* Contenu */}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 bg-[#070404]/90 backdrop-blur border-b border-white/8 px-4 sm:px-6 h-14 flex items-center gap-3">
          <button type="button" onClick={() => setMenuOpen(true)} className="lg:hidden w-9 h-9 grid place-items-center -ml-2" aria-label="Sections"><Menu size={20} /></button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold truncate flex items-center gap-2"><current.Icon size={15} className="text-gold" /> {current.label}</h1>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (search.trim()) { go("users", { q: search.trim() }); setSearch(""); } }} className="relative w-40 sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Trouver un joueur…" className="w-full bg-white/5 border border-white/10 rounded-full pl-8 pr-3 h-9 text-sm focus:outline-none focus:border-gold/50" />
          </form>
        </header>

        <main className="px-4 sm:px-6 py-6 max-w-6xl">
          {section === "overview" && (
            <div className="space-y-5">
              {pending > 0 && (
                <button type="button" onClick={() => go("certification")} className="w-full card p-4 flex items-center gap-3 text-left border-gold/40 hover:border-gold">
                  <span className="w-10 h-10 rounded-full bg-gold text-white grid place-items-center shrink-0"><BadgeCheck size={18} /></span>
                  <span className="flex-1"><span className="block text-sm font-semibold">{pending} demande{pending > 1 ? "s" : ""} de certification à traiter</span><span className="block text-xs text-ink-faint">Accepte ou refuse en un clic.</span></span>
                </button>
              )}
              <OverviewTab />
              <QuickLinks go={go} />
            </div>
          )}
          {section === "users" && <UsersTab key={initialQ} initialQuery={initialQ} recipients={recipients} onToggleRecipient={toggleRecipient} />}
          {section === "certification" && <CertificationTab />}
          {section === "referrals" && <AdminReferralsTab />}
          {section === "blindtests" && <BlindTestsTab />}
          {section === "clips" && <AdminClipsTab />}
          {section === "posts" && <PostsTab />}
          {section === "rooms" && <RoomsTab />}
          {section === "defi" && <DefiTab />}
          {section === "audience" && <SiteAnalyticsTab />}
          {section === "visits" && <VisitsTab />}
          {section === "email" && <EmailTab recipients={recipients} onAdd={addRecipients} onRemove={removeRecipient} onClear={() => setRecipients([])} />}
          {section === "settings" && <SettingsTab />}
        </main>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Fermer" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#0b0607] border-r border-white/10 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-5"><span className="inline-flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-gold" /> Studio</span><button type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer"><X size={18} /></button></div>
            <Nav />
          </div>
        </div>
      )}
    </div>
  );
}

function QuickLinks({ go }: { go: (id: SectionId) => void }) {
  const items = ALL.filter((i) => i.id !== "overview");
  return (
    <section>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint mb-2">Accès rapide</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {items.map((it) => (
          <button key={it.id} type="button" onClick={() => go(it.id)} className="card p-3.5 flex items-center gap-3 text-left hover:border-white/25">
            <span className="w-9 h-9 rounded-lg bg-white/6 grid place-items-center text-gold shrink-0"><it.Icon size={16} /></span>
            <span className="min-w-0"><span className="block text-sm font-semibold truncate">{it.label}</span>{it.hint && <span className="block text-[11px] text-ink-faint truncate">{it.hint}</span>}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
