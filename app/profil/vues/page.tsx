import { redirect } from "next/navigation";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AddFriendButton from "@/components/AddFriendButton";
import VerifiedBadge from "@/components/VerifiedBadge";

export const metadata = { title: "Qui a vu mon profil — DailyRapFrance", robots: { index: false } };

function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
}

/*
 * « Qui a vu mon profil » — les 30 derniers jours, les plus récents d'abord. Visible
 * seulement si l'option est activée (sinon on explique et on renvoie aux réglages).
 */
export default async function ProfileViewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/vues");
  const { data: me } = await supabase.from("profiles").select("username,profile_views_on").eq("id", user.id).maybeSingle();
  const on = me?.profile_views_on !== false;
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: rows } = on
    ? await supabase.from("profile_views").select("viewed_at,viewer:profiles!profile_views_viewer_id_fkey(id,username,display_name,avatar_url,verified)").eq("profile_id", user.id).gte("viewed_at", since).order("viewed_at", { ascending: false }).limit(100)
    : { data: [] };
  type Row = { viewed_at: string; viewer: { id: string; username: string | null; display_name: string | null; avatar_url: string | null; verified: boolean | null } | null };
  const list = ((rows ?? []) as unknown as Row[]).filter((r) => r.viewer);
  const { data: fr } = list.length ? await supabase.from("friendships").select("requester_id,addressee_id,status").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`) : { data: [] };
  const linked = new Set((fr ?? []).map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id)));

  return (
    <section className="max-w-2xl mx-auto px-5 sm:px-6 pt-8 sm:pt-12 pb-32">
      <a href={me?.username ? `/profil/${me.username}` : "/"} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4"><ChevronLeft size={16} /> Mon profil</a>
      <p className="stage-kicker mb-1 inline-flex items-center gap-1.5"><Eye size={13} /> 30 derniers jours</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-1">Qui a vu mon profil</h1>
      <p className="text-sm text-ink-muted mb-6">{on ? `${list.length} visite${list.length > 1 ? "s" : ""}. Les gens voient aussi que tu as regardé leur profil.` : "Option désactivée."}</p>

      {!on ? (
        <div className="ticket p-5 flex items-center gap-4">
          <span className="w-11 h-11 rounded-xl bg-white/6 grid place-items-center shrink-0"><EyeOff size={20} /></span>
          <span className="min-w-0 flex-1 text-sm">Tu as coupé les vues de profil : tu ne vois plus qui te visite, et tes visites ne sont plus enregistrées.</span>
          <a href="/parametres#vues" className="sticker sticker-sm !h-9 !px-3 text-xs shrink-0">Activer</a>
        </div>
      ) : list.length === 0 ? (
        <div className="ticket p-6 text-center">
          <p className="font-semibold">Personne pour l&apos;instant.</p>
          <p className="text-sm text-ink-muted mt-1">Partage ton profil à tes potes, ou joue en ligne : ceux qui te croisent viendront voir.</p>
        </div>
      ) : (
        <div className="ticket divide-y divide-white/6">
          {list.map((r) => {
            const v = r.viewer!;
            const name = v.display_name ?? "Joueur";
            return (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                <a href={v.username ? `/profil/${v.username}` : "#"} className="shrink-0">
                  {v.avatar_url ? <img src={v.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" /> : <span className="w-11 h-11 rounded-full text-white grid place-items-center font-extrabold" style={{ background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{name.slice(0, 1).toUpperCase()}</span>}
                </a>
                <div className="min-w-0 flex-1">
                  <a href={v.username ? `/profil/${v.username}` : "#"} className="font-semibold text-sm inline-flex items-center gap-1 truncate">{name}{v.verified && <VerifiedBadge size={13} />}</a>
                  <p className="text-[11px] text-ink-faint">{v.username && <>@{v.username} · </>}{ago(r.viewed_at)}</p>
                </div>
                {!linked.has(v.id) && <AddFriendButton targetId={v.id} size="sm" />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
