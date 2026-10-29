"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Trash2, Mail, ExternalLink, Activity, BadgeCheck, ShieldCheck } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { UserActivityModal, type AdminUser } from "@/components/AdminDashboard";
import { Avatar, Btn, Chip, Empty, Input, rel } from "@/components/admin/ui";

/*
 * Joueurs — tout le monde, recherche sur tous les comptes, filtres, tri, et un panneau de
 * détail à droite (façon Shopify : la liste reste visible, la fiche s'ouvre à côté).
 */
const FILTERS = [
  { id: "", label: "Tous" },
  { id: "online", label: "En ligne" },
  { id: "new7d", label: "Nouveaux (7 j)" },
  { id: "verification", label: "Demandes de certif" },
  { id: "verified", label: "Certifiés" },
  { id: "admins", label: "Admins" },
];
const SORTS = [
  { id: "created", label: "Inscription" },
  { id: "lastSeen", label: "Dernière activité" },
  { id: "games", label: "Parties" },
  { id: "name", label: "Nom" },
];

export default function UsersTab({ initialQuery = "", initialFilter = "", recipients, onToggleRecipient }: { initialQuery?: string; initialFilter?: string; recipients: string[]; onToggleRecipient: (email: string) => void }) {
  const [q, setQ] = useState(initialQuery);
  const [filter, setFilter] = useState(initialFilter);
  const [sort, setSort] = useState("created");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [activityFor, setActivityFor] = useState<AdminUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/users?q=${encodeURIComponent(q)}&filter=${filter}&sort=${sort}&page=${page}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else { setUsers(d.users); setTotal(d.total); } })
      .catch(() => setError("Chargement impossible."))
      .finally(() => setLoading(false));
  }, [q, filter, sort, page]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  async function setVerified(u: AdminUser, verified: boolean) {
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, verified }) });
    const d = await res.json();
    if (d.error) { setError(d.error); return; }
    const patch = (x: AdminUser) => (x.id === u.id ? { ...x, verified, verificationRequestedAt: verified ? x.verificationRequestedAt : null } : x);
    setUsers((prev) => prev.map(patch));
    setSelected((s) => (s && s.id === u.id ? patch(s) : s));
  }
  async function remove(u: AdminUser) {
    const res = await fetch(`/api/admin/users?id=${u.id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.error) { setError(d.error); return; }
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
    setSelected(null); setConfirmDelete(false);
  }

  return (
    <div className="xl:flex xl:items-start xl:gap-5">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Chercher un joueur — pseudo, nom ou e-mail (tous les comptes)" className="!pl-10" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => <Chip key={f.id} on={filter === f.id} onClick={() => { setFilter(f.id); setPage(1); }}>{f.label}</Chip>)}
          <span className="ml-auto text-xs text-ink-faint">Trier :</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs">
            {SORTS.map((s) => <option key={s.id} value={s.id} className="bg-[#120b0c]">{s.label}</option>)}
          </select>
        </div>
        {error && <div className="card p-4 text-sm text-riseNeg">{error}</div>}

        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/8 text-xs text-ink-faint flex items-center justify-between">
            <span>{loading ? "Chargement…" : `${total.toLocaleString("fr-FR")} compte${total > 1 ? "s" : ""}`}</span>
            {recipients.length > 0 && <span className="text-gold font-semibold">{recipients.length} sélectionné{recipients.length > 1 ? "s" : ""} pour un mail</span>}
          </div>
          {!loading && users.length === 0 ? <Empty>Aucun compte ne correspond.</Empty> : (
            <ul className="divide-y divide-white/5">
              {users.map((u) => (
                <li key={u.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] cursor-pointer ${selected?.id === u.id ? "bg-gold/5" : ""}`} onClick={() => { setSelected(u); setConfirmDelete(false); }}>
                  <input type="checkbox" checked={recipients.includes(u.email)} onChange={() => onToggleRecipient(u.email)} onClick={(e) => e.stopPropagation()} className="accent-gold w-4 h-4" aria-label={`Sélectionner ${u.email} pour un mail`} />
                  <span className="relative shrink-0">
                    <Avatar url={u.avatarUrl} name={u.displayName ?? u.email} size={34} />
                    <span className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-[#0f0809] ${u.isOnline ? "bg-emerald-400" : "bg-white/20"}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold min-w-0">
                      <span className="truncate">{u.displayName ?? "—"}</span>
                      {u.verified && <VerifiedBadge size={14} />}
                      {u.isAdmin && <ShieldCheck size={13} className="text-gold" />}
                      {!u.verified && u.verificationRequestedAt && <span className="rounded-full bg-gold/15 text-gold px-2 py-0.5 text-[10px] font-bold">Demande certif</span>}
                    </span>
                    <span className="block text-xs text-ink-faint truncate">{u.username ? `@${u.username} · ` : ""}{u.email}</span>
                  </span>
                  <span className="hidden sm:block text-xs text-ink-faint w-20 text-right shrink-0">{u.games} partie{u.games > 1 ? "s" : ""}</span>
                  <span className="hidden md:block text-xs text-ink-faint w-24 text-right shrink-0">{rel(u.lastSeenAt)}</span>
                </li>
              ))}
            </ul>
          )}
          {total > 50 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/8 text-xs">
              <Btn small onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Précédent</Btn>
              <span className="text-ink-faint">Page {page} / {Math.ceil(total / 50)}</span>
              <Btn small onClick={() => setPage((p) => p + 1)} disabled={page * 50 >= total}>Suivant →</Btn>
            </div>
          )}
        </div>
      </div>

      {/* Fiche joueur */}
      {selected && (
        <aside className="xl:w-[340px] xl:shrink-0 xl:sticky xl:top-20 mt-4 xl:mt-0 card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar url={selected.avatarUrl} name={selected.displayName ?? selected.email} size={48} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold flex items-center gap-1.5 min-w-0"><span className="truncate">{selected.displayName ?? "—"}</span>{selected.verified && <VerifiedBadge size={15} />}</p>
              <p className="text-xs text-ink-faint truncate">{selected.username ? `@${selected.username}` : "pas de pseudo"} · {selected.provider}</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="text-ink-faint hover:text-ink text-xl leading-none" aria-label="Fermer">×</button>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <dt className="text-ink-faint">E-mail</dt><dd className="truncate" title={selected.email}>{selected.email}</dd>
            <dt className="text-ink-faint">Inscrit</dt><dd>{new Date(selected.createdAt).toLocaleDateString("fr-FR")}</dd>
            <dt className="text-ink-faint">Dernière activité</dt><dd>{rel(selected.lastSeenAt)}</dd>
            <dt className="text-ink-faint">Parties</dt><dd>{selected.games}</dd>
            <dt className="text-ink-faint">Filleuls</dt><dd>{selected.referrals ?? 0}</dd>
            <dt className="text-ink-faint">Blind tests créés</dt><dd>{selected.customs ?? 0}</dd>
          </dl>

          <div className={`rounded-xl p-3 border ${selected.verified ? "border-gold/40 bg-gold/8" : "border-white/10 bg-white/[0.03]"}`}>
            <p className="text-xs font-semibold flex items-center gap-1.5 mb-1"><BadgeCheck size={14} className="text-gold" /> Certification</p>
            <p className="text-[11px] text-ink-faint mb-2.5">
              {selected.verified ? "Compte certifié — le badge est affiché partout." : selected.verificationRequestedAt ? `Demande envoyée le ${new Date(selected.verificationRequestedAt).toLocaleDateString("fr-FR")}.` : "Aucune demande. Tu peux certifier directement."}
            </p>
            {selected.verified ? <Btn small onClick={() => setVerified(selected, false)}>Retirer la certification</Btn> : <Btn small tone="primary" onClick={() => setVerified(selected, true)}><BadgeCheck size={13} /> Certifier ce compte</Btn>}
          </div>

          <div className="flex flex-wrap gap-2">
            {selected.username && <Btn small href={`/profil/${selected.username}`}><ExternalLink size={12} /> Profil public</Btn>}
            <Btn small onClick={() => setActivityFor(selected)}><Activity size={12} /> Activité</Btn>
            <Btn small onClick={() => onToggleRecipient(selected.email)}><Mail size={12} /> {recipients.includes(selected.email) ? "Retirer du mail" : "Ajouter au mail"}</Btn>
          </div>
          {!selected.isAdmin && (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-xs"><span className="text-ink-muted">Supprimer définitivement ?</span><Btn small tone="danger" onClick={() => remove(selected)}>Confirmer</Btn><Btn small onClick={() => setConfirmDelete(false)}>Annuler</Btn></div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs text-ink-faint hover:text-riseNeg inline-flex items-center gap-1"><Trash2 size={12} /> Supprimer le compte</button>
            )
          )}
        </aside>
      )}
      {activityFor && <UserActivityModal user={activityFor} onClose={() => setActivityFor(null)} />}
    </div>
  );
}
