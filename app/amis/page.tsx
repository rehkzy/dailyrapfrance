"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Search, Users, Inbox, Send, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import AddFriendButton from "@/components/AddFriendButton";
import BrandLoader from "@/components/BrandLoader";
import BackToGame from "@/components/BackToGame";
import GameTabBar from "@/components/GameTabBar";
import SignInCta from "@/components/SignInCta";
import FriendPlayButtons from "@/components/FriendPlayButtons";

type ProfileLite = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
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
          <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-medium shrink-0">
            {(profile.display_name ?? "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <span className="min-w-0">
          <span className="block text-sm font-medium truncate">{profile.display_name ?? "Joueur"}</span>
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
        "id,status,requester_id,addressee_id,requester:requester_id(id,username,display_name,avatar_url),addressee:addressee_id(id,username,display_name,avatar_url)"
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
        .select("id,username,display_name,avatar_url")
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
        <BackToGame />
        <div className="max-w-sm mx-auto card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto mb-4">
            <LogIn size={20} />
          </div>
          <p className="font-display text-xl font-medium mb-2">Connecte-toi</p>
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
      <BackToGame />
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-4">Blind Test</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Amis</h1>
      <p className="text-ink-muted mb-10">
        Ajoute tes potes, défie-les sur le défi du jour ou invite-les dans un salon privé.
      </p>

      {/* Recherche */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un pseudo (@...)"
          className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-gold/50"
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="card divide-y divide-white/8 overflow-hidden mb-10">
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
        <div className="space-y-10">
          {incoming.length > 0 && (
            <div>
              <p className="flex items-center gap-2 font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">
                <Inbox size={13} />
                Demandes reçues
              </p>
              <div className="card divide-y divide-white/8 overflow-hidden">
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
              <p className="flex items-center gap-2 font-mono text-xs text-ink-faint uppercase tracking-[0.16em] mb-3">
                <Send size={13} />
                Demandes envoyées
              </p>
              <div className="card divide-y divide-white/8 overflow-hidden">
                {outgoing.map((r) => {
                  const p = otherOf(r);
                  if (!p) return null;
                  return <ProfileRow key={r.id} profile={p} right={<AddFriendButton targetId={p.id} size="sm" onChange={fetchFriendships} />} />;
                })}
              </div>
            </div>
          )}

          <div>
            <p className="flex items-center gap-2 font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">
              <Users size={13} />
              Tes amis {friends.length > 0 && `(${friends.length})`}
            </p>
            {friends.length === 0 ? (
              <div className="card p-8 text-center text-sm text-ink-muted">
                Pas encore d'amis ajoutés — cherche un pseudo ci-dessus pour commencer.
              </div>
            ) : (
              <div className="card divide-y divide-white/8 overflow-hidden">
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
