import "server-only";
import { adminClient } from "@/lib/adminAuth";
import { fieldsFor, type FieldKey } from "@/lib/fields";
import { speedBonus } from "@/lib/scoring";

/*
 * Joueurs IA pour le matchmaking : tant qu'il n'y a pas assez d'humains, des IA comblent le
 * salon pour que ça démarre quand même. Chaque IA a un niveau (vitesse et taux de réussite)
 * et joue une partition DÉTERMINISTE par manche (même salon + même manche + même IA = même
 * plan), ce qui permet à n'importe quel client de déclencher ses actions au bon moment et au
 * serveur de les vérifier. Les IA sont affichées avec « · IA » : on ne fait pas croire aux
 * joueurs qu'ils affrontent des humains.
 */
export type BotDef = { slug: string; name: string; level: 1 | 2 | 3 };
export const BOTS: BotDef[] = [
  { slug: "yanis", name: "Yanis · IA", level: 2 },
  { slug: "ines", name: "Inès · IA", level: 3 },
  { slug: "mehdi", name: "Mehdi · IA", level: 1 },
  { slug: "lea", name: "Léa · IA", level: 2 },
  { slug: "ibra", name: "Ibra · IA", level: 3 },
  { slug: "noa", name: "Noa · IA", level: 1 },
  { slug: "sofia", name: "Sofia · IA", level: 2 },
  { slug: "rayan", name: "Rayan · IA", level: 3 },
];
const USERNAME = (b: BotDef) => `ia-${b.slug}`;

let cache: { ids: Map<string, BotDef>; at: number } | null = null;

/** Crée les comptes IA s'ils n'existent pas, renvoie id → définition. Mis en cache 10 min. */
export async function botIds(): Promise<Map<string, BotDef>> {
  if (cache && Date.now() - cache.at < 600_000) return cache.ids;
  const db = adminClient();
  const ids = new Map<string, BotDef>();
  const { data: existing } = await db.from("profiles").select("id, username").in("username", BOTS.map(USERNAME));
  for (const b of BOTS) {
    const row = (existing ?? []).find((p) => p.username === USERNAME(b));
    if (row) { ids.set(row.id, b); continue; }
    try {
      const { data, error } = await db.auth.admin.createUser({ email: `${USERNAME(b)}@bots.dailyrapfrance.best`, email_confirm: true, user_metadata: { full_name: b.name, is_bot: true } });
      const uid = data?.user?.id;
      if (error || !uid) continue;
      const base = { id: uid, display_name: b.name, username: USERNAME(b), avatar_url: null as string | null };
      const { error: e1 } = await db.from("profiles").upsert({ ...base, is_bot: true });
      if (e1) await db.from("profiles").upsert(base); // colonne is_bot absente (migration pas encore passée)
      ids.set(uid, b);
    } catch { /* on réessaiera */ }
  }
  cache = { ids, at: Date.now() };
  return ids;
}

export function isBotId(ids: Map<string, BotDef>, userId: string) { return ids.has(userId); }

/* ── Partition d'une manche ──────────────────────────────────────────────────────────── */
function rng(seed: string) {
  let h = 2166136261; for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const P_FIND: Record<FieldKey, [number, number, number]> = { title: [0.42, 0.6, 0.78], artist: [0.6, 0.76, 0.9], feat: [0.3, 0.45, 0.62] };

export type BotStep = { field: FieldKey | null; atMs: number }; // field null = « j'ai fini » sans trouver

/** Ce que fait une IA sur une manche : pour chaque champ, trouvé ou non, et à quel moment. */
export function planFor(roomId: string, round: number, bot: { id: string; def: BotDef }, theme: string, track: { artistName: string; feats: string[] }, answerMode: string, roundSecs: number): BotStep[] {
  const r = rng(`${roomId}|${round}|${bot.id}`);
  const fields = fieldsFor(theme, track);
  const lvl = bot.def.level;
  const steps: BotStep[] = [];
  let t = 2500 + r() * 2500; // personne ne répond avant 2,5 s
  for (const f of fields) {
    let p = P_FIND[f][lvl - 1];
    if (answerMode === "qcm") p = Math.min(0.95, p + 0.12);
    const think = (3500 + r() * 9000) * (lvl === 3 ? 0.65 : lvl === 2 ? 0.85 : 1.05);
    t += think;
    if (t > roundSecs * 1000 - 1500) break;
    if (r() < p) steps.push({ field: f, atMs: Math.round(t) });
  }
  // « Fini » : un peu après sa dernière action, ou vers la fin si elle a séché
  const last = steps.length ? steps[steps.length - 1].atMs : 0;
  const doneAt = steps.length === fields.length ? last + 400 : Math.min(roundSecs * 1000 - 800, Math.max(last + 1500, 9000 + r() * (roundSecs * 1000 - 11000)));
  steps.push({ field: null, atMs: Math.round(doneAt) });
  return steps;
}

export function bonusAt(atMs: number) { return speedBonus(atMs / 1000); }
