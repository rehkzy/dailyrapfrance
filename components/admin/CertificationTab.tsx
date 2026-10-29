"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Search, X } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import type { AdminUser } from "@/components/AdminDashboard";
import { Avatar, Btn, Empty, Input, Panel, rel } from "@/components/admin/ui";

/*
 * Certification — la file d'attente (demandes), les comptes certifiés, et une recherche
 * pour certifier n'importe qui directement. Chaque action met à jour le badge partout.
 */
export default function CertificationTab() {
  const [pending, setPending] = useState<AdminUser[] | null>(null);
  const [verified, setVerified] = useState<AdminUser[] | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/admin/users?filter=verification").then((r) => r.json()),
      fetch("/api/admin/users?filter=verified&sort=name").then((r) => r.json()),
    ]).then(([a, b]) => { if (a.error || b.error) setError(a.error ?? b.error); else { setPending(a.users); setVerified(b.users); } }).catch(() => setError("Chargement impossible."));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    if (!q.trim()) { setFound([]); return; }
    const t = setTimeout(() => fetch(`/api/admin/users?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d) => setFound((d.users ?? []).slice(0, 8))), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function set(u: AdminUser, value: boolean) {
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, verified: value }) });
    const d = await res.json();
    if (d.error) { setError(d.error); return; }
    load();
    setFound((prev) => prev.map((x) => (x.id === u.id ? { ...x, verified: value } : x)));
  }

  const Row = ({ u, actions }: { u: AdminUser; actions: React.ReactNode }) => (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar url={u.avatarUrl} name={u.displayName ?? u.email} size={36} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold"><span className="truncate">{u.displayName ?? "—"}</span>{u.verified && <VerifiedBadge size={14} />}</span>
        <span className="block text-xs text-ink-faint truncate">{u.username ? `@${u.username} · ` : ""}{u.games} partie{u.games > 1 ? "s" : ""} · inscrit {rel(u.createdAt)}{u.verificationRequestedAt && !u.verified ? ` · demande ${rel(u.verificationRequestedAt)}` : ""}</span>
      </span>
      {u.username && <Btn small href={`/profil/${u.username}`}>Profil</Btn>}
      {actions}
    </li>
  );

  return (
    <div className="space-y-5">
      {error && <div className="card p-4 text-sm text-riseNeg">{error}</div>}
      <Panel title={<span className="inline-flex items-center gap-2">Demandes en attente {pending && pending.length > 0 && <span className="rounded-full bg-gold text-white px-2 py-0.5 text-[10px] font-bold">{pending.length}</span>}</span>}>
        {!pending ? <p className="text-sm text-ink-faint">Chargement…</p> : pending.length === 0 ? <p className="text-sm text-ink-faint">Aucune demande — tout est traité.</p> : (
          <ul className="divide-y divide-white/6">
            {pending.map((u) => (
              <Row key={u.id} u={u} actions={<><Btn small tone="primary" onClick={() => set(u, true)}><BadgeCheck size={13} /> Accepter</Btn><Btn small onClick={() => set(u, false)} title="Refuser (efface la demande)"><X size={13} /></Btn></>} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Certifier un compte directement">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pseudo, nom ou e-mail…" className="!pl-10" />
        </div>
        {found.length > 0 && (
          <ul className="divide-y divide-white/6 mt-2">
            {found.map((u) => <Row key={u.id} u={u} actions={u.verified ? <Btn small onClick={() => set(u, false)}>Retirer</Btn> : <Btn small tone="primary" onClick={() => set(u, true)}><BadgeCheck size={13} /> Certifier</Btn>} />)}
          </ul>
        )}
      </Panel>

      <Panel title={`Comptes certifiés${verified ? ` (${verified.length})` : ""}`}>
        {!verified ? <p className="text-sm text-ink-faint">Chargement…</p> : verified.length === 0 ? <Empty>Personne n&apos;est encore certifié. Commence par toi : cherche ton pseudo ci-dessus.</Empty> : (
          <ul className="divide-y divide-white/6">
            {verified.map((u) => <Row key={u.id} u={u} actions={<Btn small onClick={() => set(u, false)}>Retirer</Btn>} />)}
          </ul>
        )}
      </Panel>
    </div>
  );
}
