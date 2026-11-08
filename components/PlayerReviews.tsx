import { Star } from "lucide-react";
import { adminClient } from "@/lib/adminAuth";

/* Accueil : les derniers avis approuvés, avec pseudo et avatar. Rien si aucun. */
export const revalidate = 600;

export default async function PlayerReviews() {
  let rows: { id: number; rating: number; text: string; created_at: string; profiles: { display_name: string | null; username: string | null; avatar_url: string | null } | null }[] = [];
  try {
    const { data } = await adminClient().from("player_reviews").select("id, rating, text, created_at, profiles:user_id(display_name, username, avatar_url)").eq("approved", true).order("created_at", { ascending: false }).limit(6);
    rows = (data ?? []) as unknown as typeof rows;
  } catch { return null; }
  if (!rows.length) return null;
  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-6 pt-4 pb-10" aria-labelledby="reviews-title">
      <p className="stage-kicker mb-1">Ils y jouent</p>
      <h2 id="reviews-title" className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-5">Ce qu&apos;en disent les joueurs</h2>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => {
          const p = r.profiles;
          const name = p?.display_name ?? p?.username ?? "Un joueur";
          return (
            <li key={r.id} className="ticket p-4">
              <div className="flex items-center gap-2 mb-2">
                {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" /> : <span className="w-8 h-8 rounded-full grid place-items-center text-white text-xs font-extrabold" style={{ background: "linear-gradient(135deg,#ff3b4e,#780101)" }}>{name.slice(0, 1).toUpperCase()}</span>}
                <span className="text-sm font-bold truncate">{name}</span>
                <span className="ml-auto flex gap-0.5" aria-label={`${r.rating} sur 5`}>{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < r.rating ? "text-gold fill-gold" : "text-ink-faint"} />)}</span>
              </div>
              <p className="text-sm text-ink-muted leading-snug">« {r.text} »</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
