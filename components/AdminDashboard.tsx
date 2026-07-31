"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users, Gamepad2, Radio, TrendingUp, Trophy, Search, Trash2, RefreshCcw,
  Megaphone, Wrench, ShieldCheck, Crown, UserPlus, Heart, Mail, Send, Globe,
  X, Eye, Instagram, Share2, Music2, Twitter, Gamepad, Calendar, Clock,
  LayoutGrid, Settings as SettingsIcon,
} from "lucide-react";
import { THEME_OPTIONS } from "@/lib/themes";

/*
 * Back-office DailyRapFrance — 4 onglets :
 *  - Vue d'ensemble : compteurs clés, courbe des parties (14 j), thèmes les plus joués,
 *    meilleurs scores, dernières inscriptions.
 *  - Utilisateurs : liste complète (e-mail, provider, dernière connexion, nb de parties),
 *    recherche, suppression de compte.
 *  - Salons : parties en cours en direct, fermeture à distance.
 *  - Pilotage : bannière d'annonce et mode maintenance, appliqués sur tout le site.
 */

type Stats = {
  totals: {
    users: number; users7d: number; users30d: number; games: number; games7d: number;
    roomsActive: number; friendships: number; avgPoints14d: number; onlineNow: number;
  };
  days: { day: string; games: number }[];
  topThemes: { theme: string; games: number }[];
  recentUsers: { id: string; display_name: string | null; username: string | null; created_at: string }[];
  topScores: {
    points: number; theme: string; rounds: number; created_at: string;
    profiles: { display_name: string | null; username: string | null } | null;
  }[];
  recentlyOnline: {
    id: string; display_name: string | null; username: string | null;
    last_seen_at: string | null; isOnline: boolean;
  }[];
};

type AdminUser = {
  id: string; email: string; provider: string; createdAt: string; lastSignInAt: string | null;
  displayName: string | null; username: string | null; games: number; isOnline: boolean;
};

type UserActivity = {
  isOnline: boolean;
  lastSeenAt: string | null;
  currentRoom: { code: string; theme: string; players: string[] } | null;
  events: { event_type: string; path: string | null; meta: Record<string, unknown> | null; created_at: string }[];
  counts: { pageViews: number; instagramClicks: number; shares: number };
};

type AdminRoom = {
  id: string; code: string; theme: string; rounds: number; status: string; current_round: number;
  answer_mode: string; gages_enabled: boolean; created_at: string; players: string[];
};

type Settings = {
  announcement?: { enabled: boolean; text: string };
  maintenance?: { enabled: boolean; message: string };
};

type AnalyticsData = {
  ga4: import("@/lib/googleReporting").GA4Report | null;
  search: import("@/lib/googleReporting").SearchConsoleReport | null;
};

const TABS = [
  { id: "overview", label: "Vue d'ensemble", Icon: LayoutGrid },
  { id: "audience", label: "Audience", Icon: TrendingUp },
  { id: "visits", label: "Visites (IP)", Icon: Globe },
  { id: "users", label: "Utilisateurs", Icon: Users },
  { id: "rooms", label: "Salons", Icon: Radio },
  { id: "email", label: "Mails", Icon: Mail },
  { id: "settings", label: "Pilotage", Icon: SettingsIcon },
] as const;

function themeLabel(id: string) {
  return THEME_OPTIONS.find((t) => t.id === id)?.label ?? id;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  // Sélection de destinataires partagée entre "Utilisateurs" (cases à cocher) et "Mails"
  // (ajout manuel + envoi ciblé) — vit ici pour survivre au changement d'onglet.
  const [recipients, setRecipients] = useState<string[]>([]);

  const addRecipients = useCallback((emails: string[]) => {
    setRecipients((prev) => Array.from(new Set([...prev, ...emails])));
  }, []);
  const removeRecipient = useCallback((email: string) => {
    setRecipients((prev) => prev.filter((e) => e !== email));
  }, []);
  const removeRecipients = useCallback((emails: string[]) => {
    const drop = new Set(emails);
    setRecipients((prev) => prev.filter((e) => !drop.has(e)));
  }, []);
  const toggleRecipient = useCallback((email: string) => {
    setRecipients((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]));
  }, []);

  const activeTab = TABS.find((t) => t.id === tab)!;

  return (
    <div className="lg:flex lg:items-start lg:gap-8">
      {/* Sidebar — desktop uniquement (façon Resend : liste verticale, icône + libellé,
          organisation/compte en haut, pas de barre d'onglets horizontale qui déborde). */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-6">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <span className="w-8 h-8 rounded-lg bg-gold/15 text-gold flex items-center justify-center shrink-0">
            <ShieldCheck size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Back-office</p>
            <p className="text-[11px] text-ink-faint font-mono truncate">{adminEmail}</p>
          </div>
        </div>

        <nav className="space-y-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-left transition-colors ${
                tab === t.id ? "bg-gold/15 text-gold font-medium" : "text-ink-muted hover:text-ink hover:bg-white/5"
              }`}
            >
              <t.Icon size={16} className="shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Contenu principal */}
      <div className="min-w-0 flex-1">
        {/* En-tête mobile + barre d'onglets horizontale — seulement en dessous de lg,
            pour ne rien casser sur téléphone où une sidebar verticale n'a pas de sens. */}
        <div className="lg:hidden mb-6">
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2.5 mb-1">
            <ShieldCheck size={26} className="text-gold" /> Back-office
          </h1>
          <p className="text-xs text-ink-faint font-mono mb-4">{adminEmail}</p>
          <div className="flex gap-1 p-1 rounded-full glass overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  tab === t.id ? "bg-gold text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Titre de section — desktop uniquement, la sidebar remplace déjà la navigation
            mobile ci-dessus donc pas besoin d'y dupliquer un titre. */}
        <div className="hidden lg:flex items-center gap-2.5 mb-6">
          <activeTab.Icon size={20} className="text-gold" />
          <h1 className="font-display text-2xl font-semibold">{activeTab.label}</h1>
        </div>

        {tab === "overview" && <OverviewTab />}
        {tab === "audience" && <AudienceTab />}
        {tab === "visits" && <VisitsTab />}
        {tab === "users" && (
          <UsersTab
            recipients={recipients}
            onToggle={toggleRecipient}
            onAddRecipients={addRecipients}
            onRemoveRecipients={removeRecipients}
            onGoToEmail={() => setTab("email")}
          />
        )}
        {tab === "rooms" && <RoomsTab />}
        {tab === "email" && (
          <EmailTab recipients={recipients} onAdd={addRecipients} onRemove={removeRecipient} onClear={() => setRecipients([])} />
        )}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

// ── Vue d'ensemble ────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setStats(d)))
      .catch(() => setError("Impossible de charger les stats."));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorCard message={error} />;
  if (!stats) return <Loading />;

  const t = stats.totals;
  const maxGames = Math.max(1, ...stats.days.map((d) => d.games));
  const maxTheme = Math.max(1, ...stats.topThemes.map((x) => x.games));

  return (
    <div className="space-y-7">
      {/* ── Vue d'ensemble ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Vue d&apos;ensemble</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard Icon={Users} label="Comptes" value={t.users} sub={`+${t.users7d} sur 7 j · +${t.users30d} sur 30 j`} />
          <StatCard Icon={Radio} label="En ligne maintenant" value={t.onlineNow} sub="activité < 1 min" />
          <StatCard Icon={Gamepad2} label="Parties jouées" value={t.games} sub={`+${t.games7d} sur 7 j`} />
          <StatCard Icon={Radio} label="Salons en cours" value={t.roomsActive} sub="lobby + en partie" />
          <StatCard Icon={Heart} label="Amitiés" value={t.friendships} sub={`moy. ${t.avgPoints14d} pts / partie (14 j)`} />
        </div>
      </section>

      {/* ── Activité ───────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Activité</p>
        <div className="card p-5">
          <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4 flex items-center gap-2">
            <TrendingUp size={13} /> Parties par jour — 14 derniers jours
          </p>
          <div className="flex items-end gap-1.5 h-32">
            {stats.days.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 min-w-0" title={`${d.day} — ${d.games} parties`}>
                <span className="text-[10px] font-mono text-ink-faint">{d.games || ""}</span>
                <div
                  className="w-full rounded-t bg-gold/70 hover:bg-gold transition-colors"
                  style={{ height: `${Math.max(3, (d.games / maxGames) * 100)}%` }}
                />
                <span className="text-[9px] font-mono text-ink-faint truncate w-full text-center">{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contenu ────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Contenu</p>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="card p-5">
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">Thèmes les plus joués (14 j)</p>
            <div className="space-y-2.5">
              {stats.topThemes.length === 0 && <p className="text-xs text-ink-faint">Aucune partie sur la période.</p>}
              {stats.topThemes.map((x) => (
                <div key={x.theme} className="flex items-center gap-3">
                  <span className="text-xs w-40 truncate shrink-0">{themeLabel(x.theme)}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gold/70 rounded-full" style={{ width: `${(x.games / maxTheme) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-ink-faint w-8 text-right shrink-0">{x.games}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4 flex items-center gap-2">
              <Trophy size={13} /> Meilleurs scores (all-time)
            </p>
            <div className="space-y-2">
              {stats.topScores.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <span className="font-mono text-ink-faint w-5">{i + 1}</span>
                  {i === 0 && <Crown size={13} className="text-gold shrink-0" />}
                  <span className="truncate flex-1">
                    {s.profiles?.display_name ?? s.profiles?.username ?? "Anonyme"}
                    <span className="text-ink-faint text-xs"> · {themeLabel(s.theme)}</span>
                  </span>
                  <span className="font-mono font-bold text-gold shrink-0">{s.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dernières inscriptions et joueurs actifs récemment sont désormais dans
          l'onglet "Utilisateurs" — plus logique puisque ça concerne les comptes. */}
    </div>
  );
}

// ── Audience (Google Analytics 4 + Search Console) ─────────────────────────

function BarList({ items, valueSuffix }: { items: { label: string; value: number }[]; valueSuffix?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="text-xs text-ink-faint">Pas encore de données.</p>;
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-3">
          <span className="text-xs w-28 truncate shrink-0">{i.label}</span>
          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-gold/70 rounded-full" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
          <span className="text-xs font-mono text-ink-faint w-10 text-right shrink-0">
            {i.value}
            {valueSuffix ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function AudienceTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Chargement impossible."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  // Le nombre d'utilisateurs "en ce moment" bouge vite — on le rafraîchit tout seul.
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return <Loading />;
  if (error) return <ErrorCard message={error} />;
  if (!data) return <Loading />;

  const { ga4, search } = data;
  const maxUsers = Math.max(1, ...(ga4?.days.map((d) => d.users) ?? [1]));
  const maxTrendClicks = Math.max(1, ...(search?.trend.map((d) => d.clicks) ?? [1]));

  return (
    <div className="space-y-5">
      <p className="text-[11px] text-ink-faint leading-relaxed">
        Note : l&apos;adresse IP des visiteurs n&apos;est jamais exposée par Google (RGPD) — la localisation
        ci-dessous est une estimation par pays/ville, pas un traçage IP.
      </p>

      {ga4 && (
        <>
          <section className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Temps réel</p>
          <div className="card p-5">
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
              </span>
              En ce moment sur le site
            </p>
            <p className="font-display text-4xl font-bold mb-4">{ga4.activeUsersNow}</p>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <p className="text-[11px] text-ink-faint mb-2">Par pays</p>
                <BarList items={ga4.realtimeByCountry.map((c) => ({ label: c.country, value: c.users }))} />
              </div>
              <div>
                <p className="text-[11px] text-ink-faint mb-2">Par appareil</p>
                <BarList items={ga4.realtimeByDevice.map((d) => ({ label: d.device, value: d.users }))} />
              </div>
            </div>
          </div>
          </section>

          <section className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Performance (28 derniers jours)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard Icon={Users} label="Utilisateurs" value={ga4.activeUsers28d} sub="28 derniers jours" />
            <StatCard Icon={UserPlus} label="Nouveaux" value={ga4.newUsers28d} sub="28 derniers jours" />
            <StatCard Icon={Radio} label="Sessions" value={ga4.sessions28d} sub="28 derniers jours" />
            <StatCard Icon={Globe} label="Pages vues" value={ga4.pageViews28d} sub="28 derniers jours" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-xs text-ink-faint mb-1.5">Durée moyenne / session</p>
              <p className="font-display text-2xl font-bold">{ga4.avgSessionDuration}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-faint mb-1.5">Taux d&apos;engagement</p>
              <p className="font-display text-2xl font-bold">{ga4.engagementRate}%</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-faint mb-1.5">Taux de rebond</p>
              <p className="font-display text-2xl font-bold">{ga4.bounceRate}%</p>
            </div>
          </div>

          <div className="card p-5">
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4 flex items-center gap-2">
              <TrendingUp size={13} /> Utilisateurs actifs par jour — 14 derniers jours
            </p>
            <div className="flex items-end gap-1.5 h-32">
              {ga4.days.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 min-w-0" title={`${d.day} — ${d.users} utilisateurs, ${d.sessions} sessions`}>
                  <span className="text-[10px] font-mono text-ink-faint">{d.users || ""}</span>
                  <div
                    className="w-full rounded-t bg-gold/70 hover:bg-gold transition-colors"
                    style={{ height: `${Math.max(3, (d.users / maxUsers) * 100)}%` }}
                  />
                  <span className="text-[9px] font-mono text-ink-faint truncate w-full text-center">{d.day.slice(4)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">Pages les plus vues (28 j)</p>
            <div className="space-y-2.5">
              {ga4.topPages.length === 0 && <p className="text-xs text-ink-faint">Pas encore de données.</p>}
              {ga4.topPages.map((p) => {
                const maxViews = Math.max(1, ...ga4.topPages.map((x) => x.views));
                return (
                  <div key={p.path} className="flex items-center gap-3">
                    <span className="text-xs w-40 truncate shrink-0 font-mono">{p.path}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-gold/70 rounded-full" style={{ width: `${(p.views / maxViews) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono text-ink-faint w-12 text-right shrink-0">{p.views}</span>
                    <span className="text-[10px] font-mono text-ink-faint w-14 text-right shrink-0">{p.avgDuration}</span>
                  </div>
                );
              })}
            </div>
          </div>
          </section>

          <section className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Géographie</p>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card p-5">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">Pays (28 j)</p>
              <BarList items={ga4.topCountries.map((c) => ({ label: c.country, value: c.users }))} />
            </div>
            <div className="card p-5">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">Villes (28 j)</p>
              <BarList items={ga4.topCities.map((c) => ({ label: c.city, value: c.users }))} />
            </div>
          </div>
          </section>

          <section className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Appareils &amp; techno</p>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="card p-5">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">Appareil</p>
              <BarList items={ga4.byDeviceCategory.map((d) => ({ label: d.device, value: d.users }))} />
            </div>
            <div className="card p-5">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">Navigateur</p>
              <BarList items={ga4.byBrowser.map((b) => ({ label: b.browser, value: b.users }))} />
            </div>
            <div className="card p-5">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">Système</p>
              <BarList items={ga4.byOS.map((o) => ({ label: o.os, value: o.users }))} />
            </div>
          </div>
          </section>

          <section className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Acquisition</p>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card p-5">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">Sources de trafic</p>
              <BarList items={ga4.bySource.map((s) => ({ label: s.source, value: s.users }))} />
            </div>
            <div className="card p-5">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">Nouveaux vs. récurrents</p>
              <BarList items={ga4.newVsReturning.map((n) => ({ label: n.type, value: n.users }))} />
            </div>
          </div>
          </section>
        </>
      )}

      {search && (
        <section className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Référencement Google (SEO)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard Icon={Search} label="Clics Google" value={search.clicks28d} sub="28 derniers jours" />
            <StatCard Icon={TrendingUp} label="Impressions" value={search.impressions28d} sub="28 derniers jours" />
            <StatCard Icon={Radio} label="CTR moyen" value={search.ctr28d} sub="% de clics / impressions" />
            <StatCard Icon={Globe} label="Position moyenne" value={search.avgPosition28d} sub="dans les résultats Google" />
          </div>

          <div className="card p-5">
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4 flex items-center gap-2">
              <TrendingUp size={13} /> Clics Google par jour — 28 derniers jours
            </p>
            <div className="flex items-end gap-1 h-28">
              {search.trend.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.day} — ${d.clicks} clics, ${d.impressions} impressions`}>
                  <div
                    className="w-full rounded-t bg-gold/70 hover:bg-gold transition-colors"
                    style={{ height: `${Math.max(3, (d.clicks / maxTrendClicks) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">
              Recherches qui amènent du trafic (28 j)
            </p>
            <div className="space-y-2.5">
              {search.topQueries.length === 0 && <p className="text-xs text-ink-faint">Pas encore de données.</p>}
              {search.topQueries.map((q) => {
                const maxClicks = Math.max(1, ...search.topQueries.map((x) => x.clicks));
                return (
                  <div key={q.query} className="flex items-center gap-3">
                    <span className="text-xs w-40 truncate shrink-0">{q.query}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-gold/70 rounded-full" style={{ width: `${(q.clicks / maxClicks) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono text-ink-faint w-24 text-right shrink-0">
                      {q.clicks} clics · {q.impressions} vues
                    </span>
                    <span className="text-[10px] font-mono text-ink-faint w-14 text-right shrink-0">pos. {q.position}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">Pages les mieux référencées (28 j)</p>
            <div className="space-y-2.5">
              {search.topPages.length === 0 && <p className="text-xs text-ink-faint">Pas encore de données.</p>}
              {search.topPages.map((p) => {
                const maxClicks = Math.max(1, ...search.topPages.map((x) => x.clicks));
                return (
                  <div key={p.page} className="flex items-center gap-3">
                    <span className="text-xs w-40 truncate shrink-0 font-mono">{p.page}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-gold/70 rounded-full" style={{ width: `${(p.clicks / maxClicks) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono text-ink-faint w-24 text-right shrink-0">
                      {p.clicks} clics · {p.impressions} vues
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="card p-5">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">Pays d&apos;origine des recherches</p>
              <BarList items={search.byCountry.map((c) => ({ label: c.country, value: c.clicks }))} valueSuffix=" clics" />
            </div>
            <div className="card p-5">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4">Appareil de recherche</p>
              <BarList items={search.byDevice.map((d) => ({ label: d.device, value: d.clicks }))} valueSuffix=" clics" />
            </div>
          </div>
        </section>
      )}

      {!ga4 && !search && (
        <div className="card p-6 text-sm text-ink-faint">
          Aucune donnée renvoyée par Google — vérifie que le compte de service a bien accès à la propriété GA4 et à
          Search Console.
        </div>
      )}
    </div>
  );
}

// ── Visites (IP) ─────────────────────────────────────────────────────────

type VisitLog = {
  id: number;
  ip: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  path: string | null;
  referer: string | null;
  user_agent: string | null;
  created_at: string;
};

function VisitsTab() {
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/admin/visits?page=${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setVisits(d.visits);
          setHasMore(d.hasMore);
          setTotal(d.total);
        }
      })
      .catch(() => setError("Chargement impossible."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => load(page), [page, load]);

  if (error) return <ErrorCard message={error} />;

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Journal des visites (anonyme)</p>
        <p className="text-[11px] text-ink-faint leading-relaxed">
          {total} visite{total > 1 ? "s" : ""} journalisée{total > 1 ? "s" : ""} — IP et géolocalisation fournies par
          Vercel, capturées côté serveur à chaque page vue (hors admin, API et fichiers statiques).
        </p>
      </section>

      {loading ? (
        <Loading />
      ) : (
        <div className="card overflow-x-auto" data-lenis-prevent>
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-wide text-ink-faint border-b border-white/8">
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Localisation</th>
                <th className="px-4 py-3">Page</th>
                <th className="px-4 py-3">Référent</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visits.map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-xs">{v.ip ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted text-xs">
                    {[v.city, v.region, v.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs truncate max-w-[220px]">{v.path ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-faint text-xs truncate max-w-[180px]">{v.referer ?? "direct"}</td>
                  <td className="px-4 py-3 text-ink-faint text-xs font-mono">{fmtDate(v.created_at)}</td>
                </tr>
              ))}
              {visits.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-faint text-sm">
                    Aucune visite journalisée pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-xs font-mono text-ink-faint">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="glass rounded-full px-4 py-2 disabled:opacity-30 hover:text-ink transition-colors"
        >
          Page précédente
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          className="glass rounded-full px-4 py-2 disabled:opacity-30 hover:text-ink transition-colors"
        >
          Page suivante
        </button>
      </div>
    </div>
  );
}

// ── Utilisateurs ──────────────────────────────────────────────────────────

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    page_view: "Page vue",
    click_instagram: "Instagram",
    click_tiktok: "TikTok",
    click_x: "X",
    share: "Partage",
    heartbeat: "Actif",
  };
  return labels[type] ?? type;
}

function EventIcon({ type }: { type: string }) {
  const props = { size: 13, className: "shrink-0" };
  switch (type) {
    case "page_view":
      return <Eye {...props} className="shrink-0 text-ink-faint" />;
    case "click_instagram":
      return <Instagram {...props} className="shrink-0 text-pink-400" />;
    case "click_tiktok":
      return <Music2 {...props} className="shrink-0 text-ink" />;
    case "click_x":
      return <Twitter {...props} className="shrink-0 text-ink" />;
    case "share":
      return <Share2 {...props} className="shrink-0 text-gold" />;
    case "heartbeat":
      return <Radio {...props} className="shrink-0 text-emerald-400" />;
    default:
      return <Clock {...props} className="shrink-0 text-ink-faint" />;
  }
}

function dayGroupLabel(iso: string) {
  const day = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(day, today)) return "Aujourd'hui";
  if (sameDay(day, yesterday)) return "Hier";
  return day.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
}

function UserActivityModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${user.id}/activity`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setActivity(d)))
      .catch(() => setError("Chargement impossible."));
  }, [user.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Regroupe les événements par jour pour une timeline plus lisible.
  const groups: { label: string; items: UserActivity["events"] }[] = [];
  if (activity) {
    for (const e of activity.events) {
      const label = dayGroupLabel(e.created_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(e);
      else groups.push({ label, items: [e] });
    }
  }

  const initial = (user.displayName ?? user.username ?? user.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-[#150d0d] w-full sm:max-w-2xl sm:rounded-3xl border border-white/10 max-h-full sm:max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="p-5 sm:p-6 border-b border-white/8 flex items-start gap-4 shrink-0">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full bg-gold/15 text-gold font-display font-bold text-lg flex items-center justify-center">
              {initial}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#150d0d] ${
                user.isOnline ? "bg-emerald-400" : "bg-white/20"
              }`}
              title={user.isOnline ? "En ligne" : "Hors ligne"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg font-bold truncate">{user.displayName ?? "Sans nom"}</p>
            <p className="text-xs text-ink-faint truncate">
              {user.username && <span>@{user.username} · </span>}
              {user.email}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="glass rounded-full px-2 py-0.5 text-[10px] font-mono">{user.provider}</span>
              <span className="glass rounded-full px-2 py-0.5 text-[10px] font-mono">
                Inscrit le {fmtDate(user.createdAt).slice(0, 8)}
              </span>
              {user.isOnline && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-mono bg-emerald-400/15 text-emerald-400">
                  En ligne
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors shrink-0" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6" data-lenis-prevent>
          {error && <p className="text-xs text-riseNeg">{error}</p>}
          {!activity && !error && <p className="text-xs text-ink-faint">Chargement...</p>}

          {activity && (
            <>
              {/* Compteurs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="card p-3">
                  <p className="text-[10px] text-ink-faint flex items-center gap-1 mb-1"><Gamepad size={11} /> Parties</p>
                  <p className="font-display text-xl font-bold">{user.games}</p>
                </div>
                <div className="card p-3">
                  <p className="text-[10px] text-ink-faint flex items-center gap-1 mb-1"><Eye size={11} /> Pages vues</p>
                  <p className="font-display text-xl font-bold">{activity.counts.pageViews}</p>
                </div>
                <div className="card p-3">
                  <p className="text-[10px] text-ink-faint flex items-center gap-1 mb-1"><Instagram size={11} /> Instagram</p>
                  <p className="font-display text-xl font-bold">{activity.counts.instagramClicks}</p>
                </div>
                <div className="card p-3">
                  <p className="text-[10px] text-ink-faint flex items-center gap-1 mb-1"><Share2 size={11} /> Partages</p>
                  <p className="font-display text-xl font-bold">{activity.counts.shares}</p>
                </div>
              </div>

              {/* Salon en cours */}
              {activity.currentRoom ? (
                <div className="glass rounded-2xl p-4 border border-gold/20">
                  <p className="text-xs text-gold font-semibold mb-1 flex items-center gap-1.5">
                    <Radio size={13} /> En train de jouer — salon {activity.currentRoom.code}
                  </p>
                  <p className="text-xs text-ink-faint">{themeLabel(activity.currentRoom.theme)}</p>
                  <p className="text-xs text-ink-muted mt-1.5">
                    Avec : {activity.currentRoom.players.filter((p) => p).join(", ") || "seul pour l'instant"}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-ink-faint">Ne joue pas en ce moment.</p>
              )}

              {/* Timeline */}
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint mb-3 flex items-center gap-1.5">
                  <Calendar size={12} /> Parcours récent
                </p>
                {groups.length === 0 ? (
                  <p className="text-xs text-ink-faint">Aucune activité enregistrée pour l&apos;instant.</p>
                ) : (
                  <div className="space-y-4">
                    {groups.map((g) => (
                      <div key={g.label}>
                        <p className="text-[10px] font-mono uppercase tracking-wide text-ink-faint mb-2">{g.label}</p>
                        <div className="space-y-1 border-l border-white/8 pl-3.5">
                          {g.items.map((e, i) => (
                            <div key={i} className="flex items-center gap-2.5 text-xs py-1">
                              <EventIcon type={e.event_type} />
                              <span className="font-medium shrink-0">{eventLabel(e.event_type)}</span>
                              {e.path && <span className="text-ink-faint font-mono truncate">{e.path}</span>}
                              <span className="text-ink-faint font-mono ml-auto shrink-0 pl-2">
                                {new Date(e.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTab({
  recipients,
  onToggle,
  onAddRecipients,
  onRemoveRecipients,
  onGoToEmail,
}: {
  recipients: string[];
  onToggle: (email: string) => void;
  onAddRecipients: (emails: string[]) => void;
  onRemoveRecipients: (emails: string[]) => void;
  onGoToEmail: () => void;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<AdminUser | null>(null);
  const [summary, setSummary] = useState<Pick<Stats, "recentUsers" | "recentlyOnline"> | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => !d.error && setSummary({ recentUsers: d.recentUsers, recentlyOnline: d.recentlyOnline }))
      .catch(() => {});
  }, []);

  const pageEmails = users.map((u) => u.email).filter(Boolean);
  const allPageSelected = pageEmails.length > 0 && pageEmails.every((e) => recipients.includes(e));

  const load = useCallback((query: string, p: number) => {
    setLoading(true);
    fetch(`/api/admin/users?q=${encodeURIComponent(query)}&page=${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setUsers(d.users);
          setHasMore(d.hasMore);
        }
      })
      .catch(() => setError("Chargement impossible."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q, page), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, page, load]);

  async function deleteUser(id: string) {
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.error) setError(d.error);
    else setUsers((prev) => prev.filter((u) => u.id !== id));
    setConfirming(null);
  }

  if (error) return <ErrorCard message={error} />;

  return (
    <div className="space-y-4">
      {recipients.length > 0 && (
        <div className="card p-3.5 flex flex-wrap items-center justify-between gap-3 border-gold/30">
          <span className="text-xs text-ink-muted">
            <span className="font-semibold text-ink">{recipients.length}</span> destinataire
            {recipients.length > 1 ? "s" : ""} sélectionné{recipients.length > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRemoveRecipients(recipients)}
              className="text-xs text-ink-faint hover:text-ink transition-colors"
            >
              Tout désélectionner
            </button>
            <button
              onClick={onGoToEmail}
              className="bg-gold hover:bg-glow text-white rounded-full px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <Send size={12} /> Envoyer un mail à la sélection
            </button>
          </div>
        </div>
      )}

      {summary && (
        <section className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Aperçu des comptes</p>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card p-5">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4 flex items-center gap-2">
                <UserPlus size={13} /> Dernières inscriptions
              </p>
              {summary.recentUsers.length === 0 ? (
                <p className="text-xs text-ink-faint">Aucune inscription pour l&apos;instant.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {summary.recentUsers.map((u) => (
                    <span key={u.id} className="glass rounded-full px-3 py-1.5 text-xs flex items-center gap-2">
                      {u.display_name ?? u.username ?? "Sans nom"}
                      <span className="text-ink-faint font-mono">{fmtDate(u.created_at).slice(0, 8)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4 flex items-center gap-2">
                <Radio size={13} /> Actifs récemment
              </p>
              {summary.recentlyOnline.length === 0 ? (
                <p className="text-xs text-ink-faint">
                  Personne n&apos;a encore été suivi — ça se remplira au fil des visites.
                </p>
              ) : (
                <div className="space-y-2">
                  {summary.recentlyOnline.map((u) => (
                    <div key={u.id} className="flex items-center gap-2.5 text-sm">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${u.isOnline ? "bg-emerald-400" : "bg-white/15"}`} />
                      <span className="truncate flex-1">{u.display_name ?? u.username ?? "Sans nom"}</span>
                      <span className="text-ink-faint text-xs font-mono shrink-0">
                        {u.isOnline ? "en ligne" : fmtDate(u.last_seen_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Tous les comptes</p>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher par e-mail, pseudo ou nom..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-gold/50"
          />
        </div>
      </section>

      {loading ? (
        <Loading />
      ) : (
        <div className="card overflow-x-auto" data-lenis-prevent>
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-wide text-ink-faint border-b border-white/8">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={() =>
                      allPageSelected ? onRemoveRecipients(pageEmails) : onAddRecipients(pageEmails)
                    }
                    className="accent-gold w-4 h-4 rounded cursor-pointer"
                    aria-label="Sélectionner tous les utilisateurs de la page"
                  />
                </th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Via</th>
                <th className="px-4 py-3">Parties</th>
                <th className="px-4 py-3">Inscrit le</th>
                <th className="px-4 py-3">Dern. connexion</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-white/[0.03] ${recipients.includes(u.email) ? "bg-gold/5" : ""}`}>
                  <td className="px-4 py-3">
                    {u.email && (
                      <input
                        type="checkbox"
                        checked={recipients.includes(u.email)}
                        onChange={() => onToggle(u.email)}
                        className="accent-gold w-4 h-4 rounded cursor-pointer"
                        aria-label={`Sélectionner ${u.email}`}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpanded(u)}
                      className="inline-flex items-center gap-2 hover:text-gold transition-colors text-left"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${u.isOnline ? "bg-emerald-400" : "bg-white/15"}`}
                        title={u.isOnline ? "En ligne" : "Hors ligne"}
                      />
                      <span className="font-medium">{u.displayName ?? "—"}</span>
                      {u.username && <span className="text-ink-faint text-xs"> @{u.username}</span>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="glass rounded-full px-2 py-0.5 text-[11px] font-mono">{u.provider}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{u.games}</td>
                  <td className="px-4 py-3 text-ink-faint text-xs font-mono">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-ink-faint text-xs font-mono">{fmtDate(u.lastSignInAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {confirming === u.id ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <button onClick={() => deleteUser(u.id)} className="text-riseNeg font-semibold hover:underline">
                          Confirmer
                        </button>
                        <button onClick={() => setConfirming(null)} className="text-ink-faint hover:text-ink">
                          Annuler
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirming(u.id)}
                        className="text-ink-faint hover:text-riseNeg transition-colors"
                        aria-label={`Supprimer ${u.email}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-ink-faint text-sm">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-xs font-mono text-ink-faint">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="glass rounded-full px-4 py-2 disabled:opacity-30 hover:text-ink transition-colors"
        >
          Page précédente
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          className="glass rounded-full px-4 py-2 disabled:opacity-30 hover:text-ink transition-colors"
        >
          Page suivante
        </button>
      </div>

      {expanded && <UserActivityModal user={expanded} onClose={() => setExpanded(null)} />}
    </div>
  );
}

// ── Salons ────────────────────────────────────────────────────────────────

function RoomsTab() {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/rooms")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setRooms(d.rooms)))
      .catch(() => setError("Chargement impossible."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  async function closeRoom(id: string) {
    const res = await fetch(`/api/admin/rooms?id=${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.error) setError(d.error);
    else setRooms((prev) => prev.filter((r) => r.id !== id));
    setConfirming(null);
  }

  if (error) return <ErrorCard message={error} />;
  if (loading) return <Loading />;

  const playing = rooms.filter((r) => r.status === "playing");
  const lobby = rooms.filter((r) => r.status !== "playing");

  const RoomRow = (r: AdminRoom) => (
    <div key={r.id} className="card p-4 flex flex-wrap items-center gap-4">
      <span className="font-display text-xl font-bold tracking-[0.15em] text-gold">{r.code}</span>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono ${r.status === "playing" ? "bg-gold/15 text-gold" : "glass text-ink-muted"}`}>
        {r.status === "playing" ? `manche ${r.current_round + 1}/${r.rounds}` : "lobby"}
      </span>
      <span className="text-xs text-ink-muted">{themeLabel(r.theme)}</span>
      <span className="text-xs text-ink-faint font-mono">{r.answer_mode === "qcm" ? "Facile" : "Difficile"}{r.gages_enabled ? " · gages" : ""}</span>
      <span className="text-xs text-ink-faint flex-1 min-w-[160px] truncate">
        {r.players.length ? r.players.join(", ") : "aucun joueur"}
      </span>
      {confirming === r.id ? (
        <span className="inline-flex items-center gap-2 text-xs">
          <button onClick={() => closeRoom(r.id)} className="text-riseNeg font-semibold hover:underline">Fermer le salon</button>
          <button onClick={() => setConfirming(null)} className="text-ink-faint hover:text-ink">Annuler</button>
        </span>
      ) : (
        <button onClick={() => setConfirming(r.id)} className="text-ink-faint hover:text-riseNeg transition-colors" aria-label={`Fermer ${r.code}`}>
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          {rooms.length} salon{rooms.length > 1 ? "s" : ""} en cours — {playing.length} en partie, {lobby.length} en attente
        </p>
        <button onClick={load} className="glass rounded-full px-4 py-2 text-xs font-mono inline-flex items-center gap-1.5 hover:text-ink text-ink-muted transition-colors">
          <RefreshCcw size={12} /> Actualiser
        </button>
      </div>

      {rooms.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink-faint">Aucun salon actif en ce moment.</div>
      )}

      {playing.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">En partie ({playing.length})</p>
          <div className="space-y-3">{playing.map(RoomRow)}</div>
        </section>
      )}

      {lobby.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">En attente — lobby ({lobby.length})</p>
          <div className="space-y-3">{lobby.map(RoomRow)}</div>
        </section>
      )}
    </div>
  );
}


// ── Mails ─────────────────────────────────────────────────────────────────

const DEFAULT_SUBJECT = "On évolue grâce à toi 🔴 — 2 minutes pour nous aider ?";
const DEFAULT_BODY = `Salut !

Petit mot de l'équipe DailyRapFrance. Si tu ne nous connais pas encore bien : on est un média indépendant du rap français depuis 2020 — né sur les réseaux, porté par la passion du rap FR. Le blind test, c'est notre nouveau terrain de jeu, et il grandit vite : mode Soirée sur ta TV, salons entre potes, nouveaux thèmes chaque semaine (Aya Nakamura vient d'arriver 🔥).

Et justement, on évolue — mais pas sans toi. Ton retour compte énormément : ce que tu kiffes, ce qui te frustre, le thème ou la feature que tu rêves de voir. Réponds simplement à ce mail, on lit tout et on répond.

Et si le jeu te plaît, le plus beau cadeau que tu puisses nous faire, c'est de le montrer : lance une partie avec tes potes ce week-end, partage ton score en story, ou envoie juste le lien à la personne qui se croit incollable en rap FR.

> Lancer une partie|https://dailyrapfrance.best/blindtest

Merci d'être là depuis le début. Le meilleur arrive.

L'équipe DailyRapFrance`;

function QuickSendCard() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setError("Destinataire, sujet et message requis.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      const d = await res.json();
      if (d.error) setError(d.error);
      else {
        setResult(`Envoyé à ${to} ✓`);
        setTo("");
      }
    } catch {
      setError("Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <p className="font-semibold text-sm flex items-center gap-2 mb-1">
        <Send size={15} className="text-gold" /> Envoi rapide
      </p>
      <p className="text-xs text-ink-faint mb-4">
        Un mail ponctuel à une adresse précise (joueur, partenaire...) — même habillage brandé que les campagnes.
      </p>
      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        type="email"
        placeholder="destinataire@exemple.com"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gold/50 mb-2.5"
      />
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Sujet"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gold/50 mb-2.5"
      />
      <textarea
        data-lenis-prevent
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        placeholder={"Ton message...\n\n> Libellé du bouton|https://... pour un bouton rouge"}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gold/50 leading-relaxed"
      />
      <div className="mt-3.5">
        <button
          onClick={() => void send()}
          disabled={busy}
          className="bg-gold hover:bg-glow text-white rounded-full px-5 py-2.5 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
        >
          <Send size={12} /> {busy ? "Envoi..." : "Envoyer"}
        </button>
      </div>
      {result && <p className="text-xs text-gold mt-3">{result}</p>}
      {error && <p className="text-xs text-riseNeg mt-3">{error}</p>}
    </div>
  );
}

function EmailTab({
  recipients,
  onAdd,
  onRemove,
  onClear,
}: {
  recipients: string[];
  onAdd: (emails: string[]) => void;
  onRemove: (email: string) => void;
  onClear: () => void;
}) {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [audience, setAudience] = useState<"all" | "active30d" | "manual">(recipients.length > 0 ? "manual" : "all");
  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  function addManualEmail() {
    const email = manualInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setManualError("Adresse e-mail invalide.");
      return;
    }
    onAdd([email]);
    setManualInput("");
    setManualError(null);
    setAudience("manual");
  }

  async function send(test: boolean) {
    if (!test && audience === "manual" && recipients.length === 0) {
      setError("Ajoute au moins un destinataire à la sélection.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    setConfirmSend(false);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          audience === "manual" && !test
            ? { subject, body, recipients, test }
            : { subject, body, audience: audience === "manual" ? "all" : audience, test }
        ),
      });
      const d = await res.json();
      if (d.error && !d.ok) setError(d.error);
      else if (test) setResult("Mail de test envoyé sur ta boîte — vérifie le rendu.");
      else {
        setResult(
          `${d.sent} mail${d.sent > 1 ? "s" : ""} envoyé${d.sent > 1 ? "s" : ""} sur ${d.total} destinataires.` +
            (d.remaining > 0
              ? ` Il en reste ${d.remaining} : limite quotidienne du plan gratuit — reclique "Envoyer" demain, personne ne recevra de doublon.`
              : " Campagne terminée ✓") +
            (d.error ? ` (dernière erreur : ${d.error})` : "")
        );
        if (audience === "manual") onClear();
      }
    } catch {
      setError("Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Envoi rapide</p>
        <QuickSendCard />
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Campagne</p>
        <div className="card p-5">
        <p className="font-semibold text-sm flex items-center gap-2 mb-1">
          <Mail size={15} className="text-gold" /> Campagne e-mail
        </p>
        <p className="text-xs text-ink-faint mb-4 leading-relaxed">
          Le modèle raconte l&apos;histoire du média, demande un retour (réponse directe au mail) et incite au
          partage — modifie-le librement. Astuce : une ligne <span className="font-mono">&gt; Libellé|https://...</span>{" "}
          devient un bouton rouge. Envoie-toi d&apos;abord un test.
        </p>

        <label className="text-[11px] font-mono uppercase tracking-wide text-ink-faint">Sujet</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gold/50 mt-1 mb-4"
        />

        <label className="text-[11px] font-mono uppercase tracking-wide text-ink-faint">Message</label>
        <textarea
          data-lenis-prevent
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gold/50 mt-1 leading-relaxed"
        />

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-[11px] font-mono uppercase tracking-wide text-ink-faint mr-1">Destinataires :</span>
          {([
            { id: "all" as const, label: "Tous les joueurs" },
            { id: "active30d" as const, label: "Actifs 30 derniers jours" },
            { id: "manual" as const, label: `Sélection (${recipients.length})` },
          ]).map((o) => (
            <button
              key={o.id}
              onClick={() => setAudience(o.id)}
              disabled={o.id === "manual" && recipients.length === 0}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                audience === o.id ? "bg-gold text-white" : "glass text-ink-muted hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {audience === "manual" && (
          <div className="mt-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/8">
            <div className="flex gap-2">
              <input
                value={manualInput}
                onChange={(e) => {
                  setManualInput(e.target.value);
                  setManualError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addManualEmail();
                  }
                }}
                type="email"
                placeholder="Ajouter une adresse à la main..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-gold/50"
              />
              <button
                onClick={addManualEmail}
                className="glass rounded-xl px-4 py-2 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
              >
                Ajouter
              </button>
            </div>
            {manualError && <p className="text-xs text-riseNeg mt-2">{manualError}</p>}

            {recipients.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {recipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full pl-3 pr-1.5 py-1 text-xs text-ink-muted"
                  >
                    {email}
                    <button
                      onClick={() => onRemove(email)}
                      aria-label={`Retirer ${email}`}
                      className="text-ink-faint hover:text-riseNeg transition-colors leading-none px-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  onClick={onClear}
                  className="text-xs text-ink-faint hover:text-ink transition-colors self-center ml-1"
                >
                  Tout retirer
                </button>
              </div>
            ) : (
              <p className="text-xs text-ink-faint mt-3">
                Coche des joueurs dans l&apos;onglet Utilisateurs, ou ajoute des adresses ici.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2.5 mt-5">
          <button
            onClick={() => void send(true)}
            disabled={busy}
            className="glass rounded-full px-5 py-2.5 text-xs font-semibold hover:text-ink text-ink-muted disabled:opacity-50 transition-colors"
          >
            M&apos;envoyer un test
          </button>
          {confirmSend ? (
            <span className="inline-flex items-center gap-2.5">
              <button
                onClick={() => void send(false)}
                disabled={busy}
                className="bg-gold hover:bg-glow text-white rounded-full px-5 py-2.5 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <Send size={12} /> Confirmer l&apos;envoi réel
              </button>
              <button onClick={() => setConfirmSend(false)} className="text-xs text-ink-faint hover:text-ink">
                Annuler
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmSend(true)}
              disabled={busy || (audience === "manual" && recipients.length === 0)}
              className="bg-gold hover:bg-glow text-white rounded-full px-5 py-2.5 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              <Send size={12} /> {audience === "manual" ? `Envoyer à la sélection (${recipients.length})` : "Envoyer la campagne"}
            </button>
          )}
        </div>

        {busy && <p className="text-xs text-ink-faint mt-3">Envoi en cours...</p>}
        {result && <p className="text-xs text-gold mt-3 leading-relaxed">{result}</p>}
        {error && <p className="text-xs text-riseNeg mt-3">{error}</p>}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Automatisation</p>
        <div className="card p-5">
          <p className="font-semibold text-sm mb-1.5">🤖 Mail automatique de feedback</p>
          <p className="text-xs text-ink-faint leading-relaxed">
            Chaque jour à 18h (heure FR), les joueurs inscrits depuis 3 jours reçoivent automatiquement un mail
            leur demandant leur avis et les incitant à défier un pote — une seule fois par joueur, géré par le
            cron Vercel. Rien à faire de ton côté une fois configuré.
          </p>
        </div>
      </section>
    </div>
  );
}

// ── Pilotage ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setSettings(d.settings)))
      .catch(() => setError("Chargement impossible."));
  }, []);

  async function save(key: "announcement" | "maintenance", value: object) {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    const d = await res.json();
    if (d.error) setError(d.error);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  if (error) return <ErrorCard message={error} />;
  if (!settings) return <Loading />;

  const ann = settings.announcement ?? { enabled: false, text: "" };
  const maint = settings.maintenance ?? { enabled: false, message: "" };

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Communication</p>
        <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm flex items-center gap-2">
            <Megaphone size={15} className="text-gold" /> Bannière d&apos;annonce
          </p>
          <Toggle
            on={ann.enabled}
            onChange={(v) => {
              const next = { ...ann, enabled: v };
              setSettings((s) => ({ ...s, announcement: next }));
              void save("announcement", next);
            }}
          />
        </div>
        <p className="text-xs text-ink-faint mb-3">
          Affichée en haut de toutes les pages du site — nouveautés, événements, lien vers un nouveau thème...
        </p>
        <textarea
          value={ann.text}
          onChange={(e) => setSettings((s) => ({ ...s, announcement: { ...ann, text: e.target.value } }))}
          onBlur={() => void save("announcement", { ...ann, text: (settings.announcement ?? ann).text })}
          rows={2}
          placeholder="Ex. 🔥 Nouveau : le Blind Test Aya Nakamura est dispo !"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gold/50 resize-none"
        />
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-faint">Disponibilité du site</p>
        <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm flex items-center gap-2">
            <Wrench size={15} className="text-gold" /> Mode maintenance
          </p>
          <Toggle
            on={maint.enabled}
            onChange={(v) => {
              const next = { ...maint, enabled: v };
              setSettings((s) => ({ ...s, maintenance: next }));
              void save("maintenance", next);
            }}
          />
        </div>
        <p className="text-xs text-ink-faint mb-3">
          Bloque le lancement de nouvelles parties (les parties en cours continuent) et affiche ce message.
        </p>
        <input
          value={maint.message}
          onChange={(e) => setSettings((s) => ({ ...s, maintenance: { ...maint, message: e.target.value } }))}
          onBlur={() => void save("maintenance", { ...maint, message: (settings.maintenance ?? maint).message })}
          placeholder="Le blind test revient dans quelques minutes."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gold/50"
        />
        </div>
      </section>

      {saved && <p className="text-xs text-gold font-mono">Enregistré ✓</p>}
    </div>
  );
}

// ── Petits composants ─────────────────────────────────────────────────────

function StatCard({ Icon, label, value, sub }: { Icon: typeof Users; label: string; value: number; sub: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-ink-faint flex items-center gap-1.5 mb-1.5">
        <Icon size={13} className="text-gold" /> {label}
      </p>
      <p className="font-display text-3xl font-bold">{value.toLocaleString("fr-FR")}</p>
      <p className="text-[11px] text-ink-faint mt-1">{sub}</p>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`shrink-0 w-12 h-7 rounded-full transition-colors relative ${on ? "bg-gold" : "bg-white/10"}`}
    >
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[26px]" : "translate-x-1"}`} />
    </button>
  );
}

function Loading() {
  return <div className="card p-10 text-center text-sm text-ink-faint">Chargement...</div>;
}

function ErrorCard({ message }: { message: string }) {
  return <div className="card p-6 text-sm text-riseNeg">{message}</div>;
}
