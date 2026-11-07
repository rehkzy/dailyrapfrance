import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * Classements issus des parties en ligne (room_results) :
 *  · Rivaux : pour une personne, ceux qu'elle a affrontés le plus, avec le face-à-face
 *    (victoires / défaites). Une partie compte quand les deux y jouaient ; on compare les
 *    scores individuels (ou les équipes en 2v2).
 *  · Duos : les équipes de 2 en 2v2 — victoires, parties, ratio. Global ou pour une personne.
 */
type ResultRow = { room_id: string; format: string | null; players: { user_id: string; name: string; score: number; team: number | null }[]; winner_ids: string[]; finished_at: string };

export type Rival = { id: string; name: string; games: number; wins: number; losses: number; draws: number; last: string };
export type Duo = { ids: [string, string]; names: [string, string]; games: number; wins: number; ratio: number; last: string };

async function resultsOf(db: SupabaseClient, userId: string, limit = 400): Promise<ResultRow[]> {
  const { data } = await db
    .from("room_results")
    .select("room_id, format, players, winner_ids, finished_at")
    .contains("players", JSON.stringify([{ user_id: userId }]))
    .order("finished_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ResultRow[];
}

function teamOf(p: { team: number | null }) { return p.team === 2 ? 2 : 1; }

export async function rivalsOf(db: SupabaseClient, userId: string): Promise<Rival[]> {
  const rows = await resultsOf(db, userId);
  const map = new Map<string, Rival>();
  for (const r of rows) {
    const me = r.players.find((p) => p.user_id === userId);
    if (!me) continue;
    for (const p of r.players) {
      if (p.user_id === userId) continue;
      if (r.format === "2v2" && teamOf(p) === teamOf(me)) continue; // coéquipier, pas rival
      const cur = map.get(p.user_id) ?? { id: p.user_id, name: p.name, games: 0, wins: 0, losses: 0, draws: 0, last: r.finished_at };
      cur.games++;
      cur.name = p.name;
      let mine = me.score, theirs = p.score;
      if (r.format === "2v2") {
        mine = r.players.filter((x) => teamOf(x) === teamOf(me)).reduce((a, x) => a + x.score, 0);
        theirs = r.players.filter((x) => teamOf(x) === teamOf(p)).reduce((a, x) => a + x.score, 0);
      }
      if (mine > theirs) cur.wins++; else if (mine < theirs) cur.losses++; else cur.draws++;
      map.set(p.user_id, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.games - a.games || b.wins - a.wins || a.name.localeCompare(b.name));
}

function duoKey(a: string, b: string): [string, string] { return a < b ? [a, b] : [b, a]; }

function foldDuos(rows: ResultRow[], only?: string): Duo[] {
  const map = new Map<string, Duo>();
  for (const r of rows) {
    if (r.format !== "2v2") continue;
    for (const t of [1, 2]) {
      const team = r.players.filter((p) => teamOf(p) === t);
      if (team.length !== 2) continue;
      if (only && !team.some((p) => p.user_id === only)) continue;
      const [a, b] = duoKey(team[0].user_id, team[1].user_id);
      const pa = team.find((p) => p.user_id === a)!, pb = team.find((p) => p.user_id === b)!;
      const k = `${a}|${b}`;
      const cur = map.get(k) ?? { ids: [a, b], names: [pa.name, pb.name], games: 0, wins: 0, ratio: 0, last: r.finished_at };
      cur.games++;
      if (r.winner_ids.includes(a) && r.winner_ids.includes(b)) cur.wins++;
      cur.names = [pa.name, pb.name];
      map.set(k, cur);
    }
  }
  return [...map.values()].map((d) => ({ ...d, ratio: d.games ? d.wins / d.games : 0 })).sort((x, y) => y.wins - x.wins || y.ratio - x.ratio || y.games - x.games);
}

export async function duosOf(db: SupabaseClient, userId: string): Promise<Duo[]> {
  return foldDuos(await resultsOf(db, userId), userId);
}

export async function topDuos(db: SupabaseClient, limit = 20): Promise<Duo[]> {
  const { data } = await db
    .from("room_results")
    .select("room_id, format, players, winner_ids, finished_at")
    .eq("format", "2v2")
    .order("finished_at", { ascending: false })
    .limit(2000);
  return foldDuos((data ?? []) as ResultRow[]).slice(0, limit);
}
