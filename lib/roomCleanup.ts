import "server-only";
import { adminClient } from "@/lib/adminAuth";

/*
 * Nettoyage des salons — inutile de garder ce qui ne sert plus :
 *   - lobby sans aucun joueur depuis 10 min (hôte parti sans fermer)
 *   - lobby jamais lancé depuis 2 h
 *   - partie « en cours » dont la dernière manche a plus de 3 h (abandonnée)
 *   - partie terminée depuis plus de 24 h
 * Appelé par le cron quotidien ET à l'ouverture du menu des salons (au plus une fois
 * toutes les 10 min par instance), pour que ça reste propre sans attendre le soir.
 */
let lastRun = 0;

export async function cleanupRooms(force = false): Promise<{ deleted: number } | { skipped: true }> {
  if (!force && Date.now() - lastRun < 10 * 60_000) return { skipped: true };
  lastRun = Date.now();
  const db = adminClient();
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
  const H = 3_600_000;
  const ids = new Set<string>();

  const [{ data: staleLobby }, { data: abandoned }, { data: finished }, { data: recentLobby }] = await Promise.all([
    db.from("rooms").select("id").eq("status", "lobby").lt("created_at", ago(2 * H)),
    db.from("rooms").select("id").eq("status", "playing").lt("round_started_at", ago(3 * H)),
    db.from("rooms").select("id").eq("status", "finished").lt("created_at", ago(24 * H)),
    db.from("rooms").select("id, room_players(user_id)").eq("status", "lobby").lt("created_at", ago(10 * 60_000)),
  ]);
  for (const r of [...(staleLobby ?? []), ...(abandoned ?? []), ...(finished ?? [])]) ids.add(r.id);
  for (const r of recentLobby ?? []) if (((r.room_players as unknown[] | null)?.length ?? 0) === 0) ids.add(r.id);

  if (ids.size === 0) return { deleted: 0 };
  const { error } = await db.from("rooms").delete().in("id", [...ids]);
  if (error) throw new Error(error.message);
  return { deleted: ids.size };
}
