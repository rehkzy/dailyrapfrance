import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { THEME_OPTIONS } from "@/lib/themes";
import { adminClient } from "@/lib/adminAuth";
import { friendsLeaderboard } from "@/lib/friends";
import { sendPushToUsers } from "@/lib/push";
import { notify } from "@/lib/notify";

const MAX_ROUNDS = 50;
const MAX_POINTS_PER_ROUND = 8; // titre 1 + artiste 1 + feat 2 + bonus de rapidité, large
const MIN_SECONDS_BETWEEN_SCORES = 15;
const KNOWN = new Set(THEME_OPTIONS.map((t) => t.id));
function themeOk(theme: string): boolean {
  if (theme.length > 60 || !/^[a-z0-9:_-]+$/i.test(theme)) return false;
  if (theme === "custom" || theme === "random" || theme.startsWith("jeu-")) return true;
  if (/^defi:\d{4}-\d{2}-\d{2}$/.test(theme)) return true;
  const base = theme.includes(":") ? theme.split(":")[1] : theme;
  const prefix = theme.includes(":") ? theme.split(":")[0] : null;
  if (prefix && !["survival", "sprint"].includes(prefix)) return false;
  return KNOWN.has(base);
}

// POST /api/blindtest/score — { theme: string, rounds: number, points: number }
// N'enregistre rien si personne n'est connecté (les scores anonymes ne sont pas persistés).
//
// Correctif audit : calcule maintenant un "top X %" sur le thème joué, pour afficher
// "Tu fais partie du top X% sur ce thème" côté client (demande UX : voir où on se situe,
// pas juste "score enregistré"). Calculé PAR THÈME plutôt que toutes parties confondues —
// mélanger un thème "Top 50" (facile, pool large) avec un thème mono-artiste (pool plus
// restreint, souvent plus dur) donnerait un percentile qui ne veut rien dire.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ saved: false, reason: "not_authenticated" }, { status: 200 });
  }

  const body = await req.json().catch(() => null);
  const theme = typeof body?.theme === "string" ? body.theme : "mix";
  // Anti-triche : le score vient du client, on borne donc tout à ce qui est atteignable
  // (manches, points par manche), on refuse les thèmes inconnus et on espace les envois.
  if (!themeOk(theme)) return NextResponse.json({ saved: false, reason: "bad_theme" }, { status: 400 });
  const rounds = Number.isFinite(body?.rounds) ? Math.min(MAX_ROUNDS, Math.max(0, Math.round(body.rounds))) : 0;
  const points = Number.isFinite(body?.points) ? Math.min(rounds * MAX_POINTS_PER_ROUND, Math.max(0, Math.round(body.points))) : 0;
  if (rounds === 0) return NextResponse.json({ saved: false, reason: "no_rounds" }, { status: 400 });
  const { data: last } = await supabase.from("blindtest_scores").select("created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < MIN_SECONDS_BETWEEN_SCORES * 1000) {
    return NextResponse.json({ saved: false, reason: "too_fast" }, { status: 429 });
  }

  // Insertion avec la clé service : la policy d'insertion côté client est retirée
  // (migration-securite.sql), un score ne peut donc entrer que par cette route, bornée.
  const insertedAt = new Date().toISOString();
  const { error } = await adminClient().from("blindtest_scores").insert({
    user_id: user.id,
    theme,
    rounds,
    points,
  });

  if (error) {
    console.error("[blindtest/score] erreur —", error.message);
    return NextResponse.json({ saved: false, reason: "db_error" }, { status: 200 });
  }

  // Percentile — "top X%" = (nombre de scores strictement meilleurs / nombre total de
  // scores sur ce thème) arrondi à l'entier supérieur, jamais 0 (même le meilleur score
  // affiche "top 1%", pas "top 0%" qui semblerait bugué).
  let topPercent: number | null = null;
  try {
    const { count: totalCount } = await supabase
      .from("blindtest_scores")
      .select("*", { count: "exact", head: true })
      .eq("theme", theme);

    if (totalCount && totalCount > 0) {
      const { count: betterCount } = await supabase
        .from("blindtest_scores")
        .select("*", { count: "exact", head: true })
        .eq("theme", theme)
        .gt("points", points);

      topPercent = Math.max(1, Math.ceil(((betterCount ?? 0) / totalCount) * 100));
    }
  } catch (e) {
    console.error("[blindtest/score] erreur calcul percentile —", e);
    // topPercent reste null — le client se contente d'afficher "score enregistré"
  }

  // Chez tes potes — où tu te places parmi tes amis sur ce thème, et qui tu viens de passer.
  // Avant l'insertion on connaît les meilleurs scores de chacun ; après, celui qu'on vient de
  // dépasser reçoit une notification « revanche » (une par pote et par thème et par jour,
  // dédupliquée par le tag côté appareil).
  let friends: { rank: number | null; total: number; above: { name: string; points: number } | null; beaten: { name: string; points: number }[] } | null = null;
  try {
    const db = adminClient();
    const board = await friendsLeaderboard(db, user.id, { theme });
    if (board.rows.length > 1) {
      const me = board.rows.find((r) => r.me);
      const myPrevBest = me ? Math.max(0, ...(await db.from("blindtest_scores").select("points").eq("user_id", user.id).eq("theme", theme).lt("created_at", insertedAt).limit(200).then((r) => (r.data ?? []).map((x) => x.points)))) : 0;
      const beaten = board.rows.filter((r) => !r.me && r.best > 0 && r.best < points && r.best >= myPrevBest);
      friends = {
        rank: board.myRank,
        total: board.rows.filter((r) => r.best > 0).length,
        above: board.above ? { name: board.above.name, points: board.above.best } : null,
        beaten: beaten.map((b) => ({ name: b.name, points: b.best })),
      };
      if (beaten.length) {
        const { data: meProfile } = await db.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
        const myName = meProfile?.display_name ?? "Un pote";
        const base = theme.includes(":") ? theme.split(":")[1] : theme;
        const isDefi = theme.startsWith("defi:");
        const themeLabel = isDefi ? "le défi de la semaine" : (THEME_OPTIONS.find((t) => t.id === base)?.label.replace(/^Blind Test /i, "") ?? "ce thème");
        const url = isDefi
          ? `/jouer?mode=solo&daily=1&autostart=1&from=${encodeURIComponent(myName)}&score=${points}`
          : `/jouer?mode=solo&theme=${encodeURIComponent(base)}&autostart=1&from=${encodeURIComponent(myName)}&score=${points}`;
        void notify(beaten.map((b) => b.id), { kind: "beaten", actorId: user.id, title: `${myName} vient de te passer`, body: `${points} pts sur ${themeLabel}. Revanche ?`, url, dedupe: `beat:${theme}:${user.id}:${new Date().toISOString().slice(0, 10)}` });
        void sendPushToUsers(beaten.map((b) => b.id), {
          title: `${myName} vient de te passer`,
          body: `${points} pts sur ${themeLabel}. Revanche ?`,
          url,
          tag: `beat-${theme}-${new Date().toISOString().slice(0, 10)}`,
        });
      }
    }
  } catch (e) {
    console.error("[blindtest/score] classement amis —", e);
  }

  return NextResponse.json({ saved: true, topPercent, friends });
}
