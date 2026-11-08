import { adminClient } from "@/lib/adminAuth";
import { Users, Play, Disc3 } from "lucide-react";

/* Preuve sociale, chiffres réels (cache 10 min) : joueurs inscrits, parties sur 7 jours, blind tests créés. */
export const revalidate = 600;

async function count(table: string, since?: string): Promise<number> {
  try {
    const db = adminClient();
    const base = db.from(table).select("id", { count: "exact", head: true });
    const { count: c } = await (since ? base.gte("created_at", since) : base);
    return c ?? 0;
  } catch { return 0; }
}

export default async function LiveCounters() {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const [players, games, customs] = await Promise.all([
    count("profiles"),
    count("blindtest_scores", since),
    count("custom_blindtests"),
  ]);
  if (!players && !games) return null;
  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const items = [
    { Icon: Users, n: fmt(players), l: "joueurs inscrits" },
    { Icon: Play, n: fmt(games), l: "parties cette semaine" },
    { Icon: Disc3, n: fmt(customs), l: "blind tests créés par les joueurs" },
  ].filter((i) => i.n !== "0");
  return (
    <ul className="live-counters" aria-label="DailyRapFrance en chiffres">
      {items.map((i) => (
        <li key={i.l}><i.Icon size={16} className="text-gold" /><span className="live-counters-n">{i.n}</span><span className="live-counters-l">{i.l}</span></li>
      ))}
    </ul>
  );
}
