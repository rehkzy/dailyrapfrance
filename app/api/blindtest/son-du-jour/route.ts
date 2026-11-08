import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { parisDateString } from "@/lib/dailyStreak";
import { isCloseMatch } from "@/lib/blindtest-match";
import { SITE } from "@/lib/seo";

/*
 * Le son du jour : UN morceau rap FR pour tout le monde, six essais, l'extrait s'allonge à chaque
 * raté (1, 2, 4, 7, 11, 16 s). Le même pour tous grâce à un tirage figé par date (cache 24 h).
 *  GET  → { date, number, previewUrl, cover (floutée côté client) } — jamais le titre
 *  POST { guess, attempt } → { correct, done, title?, artistName?, cover? }
 */
const THEMES = ["hits-2026", "2010s", "pop", "melodique", "93", "13", "trap", "2000s", "viral", "91", "drill", "92", "recent", "nouvelle-gen", "afro", "94", "90s", "classics-ninho", "classics-pnl", "boombap"];
const EPOCH = "2026-11-09";
const ATTEMPTS = 6;

type Track = { id: string; title: string; artistName: string; coverUrl: string | null; previewUrl: string };

function dayNumber(date: string): number { return Math.floor((Date.parse(date) - Date.parse(EPOCH)) / 86400000) + 1; }
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const pickOfDay = unstable_cache(async (date: string): Promise<Track | null> => {
  const theme = THEMES[hash(date) % THEMES.length];
  const res = await fetch(`${SITE}/api/blindtest/pool?theme=${theme}&count=30`, { cache: "no-store" }).catch(() => null);
  const data = res && res.ok ? ((await res.json()) as { tracks?: Track[] }) : null;
  const pool = (data?.tracks ?? []).filter((t) => t.previewUrl && t.title && t.artistName).sort((a, b) => a.id.localeCompare(b.id));
  if (!pool.length) return null;
  return pool[hash(`${date}:pick`) % pool.length];
}, ["son-du-jour-v1"], { revalidate: 86400 });

export async function GET() {
  const date = parisDateString();
  const t = await pickOfDay(date);
  if (!t) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  // L'URL d'extrait Deezer expire : on la re-signe à chaque appel.
  let previewUrl = t.previewUrl;
  try { const r = await fetch(`${SITE}/api/blindtest/preview?id=${t.id}`, { cache: "no-store" }); if (r.ok) { const d = (await r.json()) as { previewUrl?: string }; if (d.previewUrl) previewUrl = d.previewUrl; } } catch {}
  return NextResponse.json({ date, number: dayNumber(date), previewUrl, cover: t.coverUrl, attempts: ATTEMPTS }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const date = parisDateString();
  const t = await pickOfDay(date);
  if (!t) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { guess?: string; attempt?: number; reveal?: boolean };
  const attempt = Math.max(1, Math.min(ATTEMPTS, Math.round(Number(body.attempt) || 1)));
  const guess = String(body.guess ?? "").slice(0, 120);
  const correct = guess.trim() ? isCloseMatch(guess, t.title) || isCloseMatch(guess, `${t.artistName} ${t.title}`) : false;
  const done = correct || attempt >= ATTEMPTS || body.reveal === true;
  return NextResponse.json(done ? { correct, done, title: t.title, artistName: t.artistName, cover: t.coverUrl, id: t.id } : { correct, done });
}
