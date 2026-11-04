"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Search, Users, Inbox, Send, LogIn, Gift, ChevronRight, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import AddFriendButton from "@/components/AddFriendButton";
import BrandLoader from "@/components/BrandLoader";
import BackToGame from "@/components/BackToGame";
import GameTabBar from "@/components/GameTabBar";
import SignInCta from "@/components/SignInCta";
import VerifiedBadge from "@/components/VerifiedBadge";

import FriendPlayButtons from "@/components/FriendPlayButtons";

type ProfileLite = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  verified?: boolean | null;
};

type FriendshipRow = {
  id: string;
  status: "pending" | "accepted";
  requester_id: string;
  addressee_id: string;
  requester: ProfileLite | ProfileLite[] | null;
  addressee: ProfileLite | ProfileLite[] | null;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

function ProfileRow({ profile, right }: { profile: ProfileLite; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <a href={profile.username ? `/profil/${profile.username}` : "#"} className="flex items-center gap-3 min-w-0 flex-1">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-gold/40 ring-offset-2 ring-offset-[#0f0809]" />
        ) : (
          <div className="w-11 h-11 rounded-full text-white flex items-center justify-center text-sm font-extrabold shrink-0 ring-2 ring-gold/40 ring-offset-2 ring-offset-[#0f0809]" style={{ background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>
            {(profile.display_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-sm font-semibold min-w-0"><span className="truncate">{profile.display_name ?? "Joueur"}</span>{profile.verified && <VerifiedBadge size={14} />}</span>
          {profile.username && <span className="block text-xs text-ink-faint truncate">@{profile.username}</span>}
        </span>
      </a>
      {right}
    </div>
  );
}

export default function AmisPage() {
  const { user, loading: userLoading } = useUser();
  const supabase = createClient();

  const [rows, setRows] = useState<FriendshipRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    setLoadingRows(true);
    const { data } = await supabase
      .from("friendships")
      .select(
        "id,status,requester_id,addressee_id,requester:requester_id(id,username,display_name,avatar_url,verified),addressee:addressee_id(id,username,display_name,avatar_url,verified)"
      )
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setRows((data as unknown as FriendshipRow[]) ?? []);
    setLoadingRows(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    fetchFriendships();
  }, [fetchFriendships]);

  useEffect(() => {
    if (!user || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,verified")
        .ilike("username", `%${query.trim()}%`)
        .neq("id", user.id)
        .limit(8)
        .then(({ data }) => {
          setResults(data ?? []);
          setSearching(false);
        });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, user]);

  if (userLoading) {
    return (
      <>
      <section className="max-w-2xl mx-auto px-6 pt-16 pb-24 flex justify-center">
        <BrandLoader size="md" />
      </section>
      <GameTabBar />
      </>
    );
  }

  if (!user) {
    return (
      <>
      <section className="max-w-2xl mx-auto px-6 pt-16 pb-24">
        <BackToGame fallback="/profil" />
        <div className="max-w-sm mx-auto ticket p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto mb-4">
            <LogIn size={20} />
          </div>
          <p className="font-display text-xl font-bold mb-2">Connecte-toi</p>
          <p className="text-sm text-ink-muted mb-6">
            Il te faut un compte pour ajouter des amis et comparer vos scores.
          </p>
          <SignInCta />
          <p className="text-[11px] text-ink-faint mt-3">Gratuit, en 10 secondes — tes scores sont sauvegardés.</p>
        </div>
      </section>
      <GameTabBar />
      </>
    );
  }

  const friends = rows.filter((r) => r.status === "accepted");
  const incoming = rows.filter((r) => r.status === "pending" && r.addressee_id === user.id);
  const outgoing = rows.filter((r) => r.status === "pending" && r.requester_id === user.id);

  function otherOf(r: FriendshipRow): ProfileLite | null {
    const req = one(r.requester);
    const add = one(r.addressee);
    return r.requester_id === user!.id ? add : req;
  }

  return (
    <>
    <section className="max-w-2xl mx-auto px-6 pt-16 pb-32">
      <BackToGame fallback="/profil" />
      <p className="stage-kicker mb-2 inline-flex items-center gap-1.5"><Users size={13} /> Amis</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-2">Tes potes, ton classement.</h1>
      <p className="text-ink-muted mb-6">Ajoute-les, défie-les sur le défi de la semaine, ouvre-leur un salon.</p>

      {/* Inviter : le vrai moyen d'avoir des amis ici, c'est de les faire venir */}
      <a href="/parrainage" className="action-row mb-5" data-primary="true">
        <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0 bg-white/15 text-white"><Gift size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Inviter un pote avec mon lien</span>
          <span className="block text-xs text-white/80">Il arrive direct dans tes amis — et ça compte pour les 2 places Kaaris.</span>
        </span>
        <ChevronRight size={18} className="shrink-0" />
      </a>

      {/* Recherche */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un pseudo"
          className="answer-input !min-h-[52px] !pl-11"
          autoComplete="off"
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="ticket divide-y divide-white/6 overflow-hidden mb-8">
          {searching ? (
            <div className="py-6 flex justify-center">
              <BrandLoader size="sm" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-ink-faint text-center py-6">Aucun pseudo ne correspond.</p>
          ) : (
            results.map((p) => (
              <ProfileRow key={p.id} profile={p} right={<AddFriendButton targetId={p.id} size="sm" onChange={fetchFriendships} />} />
            ))
          )}
        </div>
      )}

      {loadingRows ? (
        <div className="flex justify-center py-10">
          <BrandLoader size="md" />
        </div>
      ) : (
        <div className="space-y-8">
          {incoming.length > 0 && (
            <div>
              <p className="flex items-center gap-2 stage-kicker mb-3">
                <Inbox size={13} />
                Demandes reçues
              </p>
              <div className="ticket divide-y divide-white/6 overflow-hidden">
                {incoming.map((r) => {
                  const p = otherOf(r);
                  if (!p) return null;
                  return <ProfileRow key={r.id} profile={p} right={<AddFriendButton targetId={p.id} size="sm" onChange={fetchFriendships} />} />;
                })}
              </div>
            </div>
          )}

          {outgoing.length > 0 && (
            <div>
              <p className="flex items-center gap-2 stage-kicker mb-3">
                <Send size={13} />
                Demandes envoyées
              </p>
              <div className="ticket divide-y divide-white/6 overflow-hidden">
                {outgoing.map((r) => {
                  const p = otherOf(r);
                  if (!p) return null;
                  return <ProfileRow key={r.id} profile={p} right={<AddFriendButton targetId={p.id} size="sm" onChange={fetchFriendships} />} />;
                })}
              </div>
            </div>
          )}

          <div>
            <p className="flex items-center gap-2 stage-kicker mb-3">
              <Users size={13} />
              Tes amis {friends.length > 0 && `(${friends.length})`}
            </p>
            {friends.length === 0 ? (
              <div className="ticket p-8 text-center">
                <span className="w-14 h-14 rounded-2xl bg-gold/15 text-gold grid place-items-center mx-auto mb-3"><Swords size={24} /></span>
                <p className="font-display text-lg font-bold mb-1">Personne à défier pour l&apos;instant</p>
                <p className="text-sm text-ink-muted">Cherche un pseudo au-dessus, ou envoie ton lien : tes potes arrivent ici tout seuls.</p>
              </div>
            ) : (
              <div className="ticket divide-y divide-white/6 overflow-hidden">
                {friends.map((r) => {
                  const p = otherOf(r);
                  if (!p) return null;
                  return (
                    <ProfileRow
                      key={r.id}
                      profile={p}
                      right={<FriendPlayButtons friendName={p.display_name ?? p.username ?? "Toi"} />}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
    <GameTabBar />
    </>
  );
}
