"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users, Gamepad2, Radio, TrendingUp, Trophy, Search, Trash2, RefreshCcw,
  Megaphone, Wrench, ShieldCheck, Crown, UserPlus, Heart, Mail, Send,
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
    roomsActive: number; friendships: number; avgPoints14d: number;
  };
  days: { day: string; games: number }[];
  topThemes: { theme: string; games: number }[];
  recentUsers: { id: string; display_name: string | null; username: string | null; created_at: string }[];
  topScores: {
    points: number; theme: string; rounds: number; created_at: string;
    profiles: { display_name: string | null; username: string | null } | null;
  }[];
};

type AdminUser = {
  id: string; email: string; provider: string; createdAt: string; lastSignInAt: string | null;
  displayName: string | null; username: string | null; games: number;
};

type AdminRoom = {
  id: string; code: string; theme: string; rounds: number; status: string; current_round: number;
  answer_mode: string; gages_enabled: boolean; created_at: string; players: string[];
};

type Settings = {
  announcement?: { enabled: boolean; text: string };
  maintenance?: { enabled: boolean; message: string };
};

const TABS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "users", label: "Utilisateurs" },
  { id: "rooms", label: "Salons" },
  { id: "email", label: "Mails" },
  { id: "settings", label: "Pilotage" },
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2.5">
            <ShieldCheck size={26} className="text-gold" /> Back-office
          </h1>
          <p className="text-xs text-ink-faint mt-1 font-mono">{adminEmail}</p>
        </div>
        <div className="flex gap-1 p-1 rounded-full glass">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                tab === t.id ? "bg-gold text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "users" && <UsersTab />}
      {tab === "rooms" && <RoomsTab />}
      {tab === "email" && <EmailTab />}
      {tab === "settings" && <SettingsTab />}
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
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard Icon={Users} label="Comptes" value={t.users} sub={`+${t.users7d} sur 7 j · +${t.users30d} sur 30 j`} />
        <StatCard Icon={Gamepad2} label="Parties jouées" value={t.games} sub={`+${t.games7d} sur 7 j`} />
        <StatCard Icon={Radio} label="Salons en cours" value={t.roomsActive} sub="lobby + en partie" />
        <StatCard Icon={Heart} label="Amitiés" value={t.friendships} sub={`moy. ${t.avgPoints14d} pts / partie (14 j)`} />
      </div>

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

      <div className="card p-5">
        <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-4 flex items-center gap-2">
          <UserPlus size={13} /> Dernières inscriptions
        </p>
        <div className="flex flex-wrap gap-2">
          {stats.recentUsers.map((u) => (
            <span key={u.id} className="glass rounded-full px-3 py-1.5 text-xs flex items-center gap-2">
              {u.display_name ?? u.username ?? "Sans nom"}
              <span className="text-ink-faint font-mono">{fmtDate(u.created_at).slice(0, 8)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Utilisateurs ──────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

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

      {loading ? (
        <Loading />
      ) : (
        <div className="card overflow-x-auto" data-lenis-prevent>
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-wide text-ink-faint border-b border-white/8">
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
                <tr key={u.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <span className="font-medium">{u.displayName ?? "—"}</span>
                    {u.username && <span className="text-ink-faint text-xs"> @{u.username}</span>}
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
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-faint text-sm">
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          {rooms.length} salon{rooms.length > 1 ? "s" : ""} en cours
        </p>
        <button onClick={load} className="glass rounded-full px-4 py-2 text-xs font-mono inline-flex items-center gap-1.5 hover:text-ink text-ink-muted transition-colors">
          <RefreshCcw size={12} /> Actualiser
        </button>
      </div>

      {rooms.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink-faint">Aucun salon actif en ce moment.</div>
      )}

      {rooms.map((r) => (
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
      ))}
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

function EmailTab() {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [audience, setAudience] = useState<"all" | "active30d">("all");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  async function send(test: boolean) {
    setBusy(true);
    setError(null);
    setResult(null);
    setConfirmSend(false);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, audience, test }),
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
      }
    } catch {
      setError("Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
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
          ]).map((o) => (
            <button
              key={o.id}
              onClick={() => setAudience(o.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                audience === o.id ? "bg-gold text-white" : "glass text-ink-muted hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

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
              disabled={busy}
              className="bg-gold hover:bg-glow text-white rounded-full px-5 py-2.5 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              <Send size={12} /> Envoyer la campagne
            </button>
          )}
        </div>

        {busy && <p className="text-xs text-ink-faint mt-3">Envoi en cours...</p>}
        {result && <p className="text-xs text-gold mt-3 leading-relaxed">{result}</p>}
        {error && <p className="text-xs text-riseNeg mt-3">{error}</p>}
      </div>

      <div className="card p-5">
        <p className="font-semibold text-sm mb-1.5">🤖 Mail automatique de feedback</p>
        <p className="text-xs text-ink-faint leading-relaxed">
          Chaque jour à 18h (heure FR), les joueurs inscrits depuis 3 jours reçoivent automatiquement un mail
          leur demandant leur avis et les incitant à défier un pote — une seule fois par joueur, géré par le
          cron Vercel. Rien à faire de ton côté une fois configuré.
        </p>
      </div>
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
    <div className="space-y-5 max-w-2xl">
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
