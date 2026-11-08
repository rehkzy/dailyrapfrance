import { adminClient } from "@/lib/adminAuth";
import { Trophy } from "lucide-react";

/* Les 3 meilleurs scores sur ce thème artiste (preuve qu'il y a des joueurs, et un score à battre). */
export default async function ArtistTop({ themeId, artistName }: { themeId: string; artistName: string }) {
  let rows: { points: number; rounds: number | null; profiles: { display_name: string | null; username: string | null; avatar_url: string | null } | null }[] = [];
  try {
    const { data } = await adminClient().from("blindtest_scores").select("points, rounds, profiles:user_id(display_name, username, avatar_url)").eq("theme", themeId).gt("points", 0).order("points", { ascending: false }).limit(3);
    rows = (data ?? []) as unknown as typeof rows;
  } catch { return null; }
  if (!rows.length) return (
    <div className="artist-top">
      <span className="artist-top-ic"><Trophy size={16} /></span>
      <span className="text-sm"><b>Personne n&apos;a encore de record sur {artistName}.</b> <span className="text-ink-muted">Le premier score inscrit, c&apos;est le tien.</span></span>
    </div>
  );
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="artist-top">
      <span className="artist-top-ic"><Trophy size={16} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] uppercase tracking-wider font-bold text-gold mb-1">À battre sur {artistName}</span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          {rows.map((r, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-sm">
              <span>{medals[i]}</span>
              {r.profiles?.avatar_url ? <img src={r.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" /> : null}
              <span className="font-semibold truncate max-w-[110px]">{r.profiles?.display_name ?? r.profiles?.username ?? "Joueur"}</span>
              <b className="text-gold tabular-nums">{r.points}</b>
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}
