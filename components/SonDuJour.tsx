"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square, Share2, SkipForward, Check, X, Lock } from "lucide-react";
import { useUser } from "@/lib/useUser";
import { sfx } from "@/lib/sfx";
import { markPlayedToday } from "@/lib/dailyStreak";
import BrandLoader from "@/components/BrandLoader";
import AdSlot from "@/components/AdSlot";

/*
 * Le son du jour — façon Wordle : un seul morceau pour tout le monde, 6 essais, l'extrait
 * s'allonge à chaque raté. Jouable sans compte. Résultat partageable en grille.
 */
const STEPS = [1, 2, 4, 7, 11, 16]; // secondes d'extrait par essai
type Day = { date: string; number: number; previewUrl: string; cover: string | null; attempts: number };
type Saved = { date: string; tries: ("ok" | "ko" | "skip")[]; done: boolean; won: boolean; title?: string; artistName?: string; cover?: string };
type Suggestion = { id: string; title: string; artistName: string; coverUrl: string | null };

const KEY = "drf-son-du-jour";
function load(date: string): Saved { try { const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null; if (s && s.date === date) return s; } catch {} return { date, tries: [], done: false, won: false }; }
function save(s: Saved) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
function stats(): { played: number; won: number; streak: number } { try { return JSON.parse(localStorage.getItem(`${KEY}-stats`) ?? '{"played":0,"won":0,"streak":0}'); } catch { return { played: 0, won: 0, streak: 0 }; } }
function bumpStats(won: boolean) { const s = stats(); s.played++; if (won) { s.won++; s.streak++; } else s.streak = 0; try { localStorage.setItem(`${KEY}-stats`, JSON.stringify(s)); } catch {} return s; }

export default function SonDuJour() {
  const { user } = useUser();
  const [day, setDay] = useState<Day | null>(null);
  const [state, setState] = useState<Saved | null>(null);
  const [guess, setGuess] = useState("");
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const stopAt = useRef<number>(0);
  const raf = useRef(0);

  useEffect(() => {
    fetch("/api/blindtest/son-du-jour", { cache: "no-store" }).then((r) => r.json()).then((d: Day) => { setDay(d); setState(load(d.date)); }).catch(() => {});
  }, []);

  // Suggestions de titres pendant la frappe (rap FR via Deezer)
  useEffect(() => {
    if (guess.trim().length < 2) { setSugs([]); return; }
    const t = setTimeout(async () => {
      const j = await fetch(`/api/blindtest/search?q=${encodeURIComponent(guess.trim())}`).then((r) => r.json()).catch(() => ({ tracks: [] }));
      setSugs(((j.tracks ?? []) as Suggestion[]).slice(0, 6));
    }, 220);
    return () => clearTimeout(t);
  }, [guess]);

  const attempt = (state?.tries.length ?? 0) + 1;
  const allowed = STEPS[Math.min(STEPS.length, attempt) - 1];

  function play() {
    const a = audio.current; if (!a || !day) return;
    if (playing) { a.pause(); return; }
    a.currentTime = 0; stopAt.current = state?.done ? 30 : allowed;
    void a.play();
    sfx.click();
  }
  useEffect(() => {
    const a = audio.current; if (!a) return;
    const tick = () => { setPos(a.currentTime); if (a.currentTime >= stopAt.current) { a.pause(); } else raf.current = requestAnimationFrame(tick); };
    const onPlay = () => { setPlaying(true); raf.current = requestAnimationFrame(tick); };
    const onPause = () => { setPlaying(false); cancelAnimationFrame(raf.current); };
    a.addEventListener("play", onPlay); a.addEventListener("pause", onPause); a.addEventListener("ended", onPause);
    return () => { a.removeEventListener("play", onPlay); a.removeEventListener("pause", onPause); a.removeEventListener("ended", onPause); cancelAnimationFrame(raf.current); };
  }, [day]);

  async function submit(text: string, skip = false) {
    if (!day || !state || state.done || busy) return;
    setBusy(true);
    audio.current?.pause();
    try {
      const r = await fetch("/api/blindtest/son-du-jour", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guess: skip ? "" : text, attempt }) }).then((x) => x.json()) as { correct: boolean; done: boolean; title?: string; artistName?: string; cover?: string | null };
      const tries = [...state.tries, (r.correct ? "ok" : skip ? "skip" : "ko") as "ok" | "ko" | "skip"];
      const next: Saved = { ...state, tries, done: r.done, won: r.correct, title: r.title, artistName: r.artistName, cover: r.cover ?? undefined };
      setState(next); save(next); setGuess(""); setSugs([]);
      if (r.correct) { sfx.correct(); markPlayedToday(); } else if (r.done) sfx.wrong(); else sfx.wrong();
      if (r.done) {
        bumpStats(r.correct);
        if (user) void fetch("/api/blindtest/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: "jeu-son-du-jour", rounds: 1, points: r.correct ? Math.max(1, 7 - tries.length) : 0 }) }).catch(() => {});
      }
    } finally { setBusy(false); }
  }

  function shareText(): string {
    if (!state || !day) return "";
    const grid = state.tries.map((t) => (t === "ok" ? "🟥" : t === "skip" ? "⬜" : "⬛")).join("") + "⬜".repeat(Math.max(0, STEPS.length - state.tries.length));
    const score = state.won ? `${state.tries.length}/${STEPS.length}` : `X/${STEPS.length}`;
    return `Son du jour DailyRap #${day.number} ${score}\n${grid}\n${state.won ? `Trouvé en ${STEPS[state.tries.length - 1]} s d'extrait.` : "Pas trouvé…"} À toi.\nhttps://dailyrapfrance.best/son-du-jour`;
  }
  async function share() {
    const text = shareText();
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch {}
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }

  if (!day || !state) return <div className="py-16 grid place-items-center"><BrandLoader size="md" /></div>;
  const st = stats();

  return (
    <div className="sdj">
      <audio ref={audio} src={day.previewUrl} preload="auto" />
      <div className="sdj-cover" style={{ backgroundImage: day.cover ? `url(${day.cover})` : undefined }} data-revealed={state.done}>
        {!state.done && <span className="sdj-cover-lock"><Lock size={18} /></span>}
      </div>

      {/* Barre d'extrait : segments par essai */}
      <div className="sdj-bar" aria-hidden="true">
        {STEPS.map((s, i) => {
          const start = i === 0 ? 0 : STEPS[i - 1];
          const w = ((s - start) / STEPS[STEPS.length - 1]) * 100;
          const unlocked = state.done || i < attempt;
          const fill = Math.max(0, Math.min(1, (pos - start) / (s - start)));
          return <span key={s} className="sdj-seg" data-unlocked={unlocked} style={{ width: `${w}%` }}><span style={{ width: `${unlocked ? fill * 100 : 0}%` }} /></span>;
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-ink-faint -mt-1 mb-4"><span>0 s</span><span>{state.done ? "30 s" : `${allowed} s débloquées`}</span></div>

      {!state.done && state.tries.length === 0 && (
        <ol className="sdj-how">
          <li><b>1</b> Appuie sur lecture : tu entends <b>1 seconde</b> du morceau.</li>
          <li><b>2</b> Tape le titre (ou choisis-le dans la liste) et valide.</li>
          <li><b>3</b> Raté ou passé ? L&apos;extrait s&apos;allonge. Six essais maximum.</li>
        </ol>
      )}
      <button type="button" onClick={play} className="sdj-play" aria-label={playing ? "Stop" : "Écouter"}>{playing ? <Square size={22} /> : <Play size={24} className="ml-1" />}</button>
      <p className="text-center text-xs text-ink-faint -mt-3 mb-4">{state.done ? "Écouter l'extrait complet" : playing ? "Ça joue…" : `Écouter ${allowed} s`}</p>

      {/* Essais */}
      <ol className="sdj-tries">
        {STEPS.map((s, i) => {
          const t = state.tries[i];
          return (
            <li key={s} data-state={t ?? (i === attempt - 1 && !state.done ? "current" : "")}>
              <span className="sdj-try-n">{i + 1}</span>
              <span className="flex-1 text-sm">{t === "ok" ? "Trouvé" : t === "skip" ? "Passé" : t === "ko" ? "Raté" : i === attempt - 1 && !state.done ? `Essai en cours · ${s} s` : `${s} s`}</span>
              {t === "ok" && <Check size={16} className="text-gold" />}{t === "ko" && <X size={16} className="text-ink-faint" />}
            </li>
          );
        })}
      </ol>

      {!state.done ? (
        <div className="relative mt-4">
          <input value={guess} onChange={(e) => setGuess(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void submit(guess); }} placeholder="Titre du morceau (ou artiste + titre)" className="answer-input w-full" aria-label="Ta réponse" enterKeyHint="send" />
          {sugs.length > 0 && (
            <ul className="sdj-sugs">
              {sugs.map((s) => <li key={s.id}><button type="button" onClick={() => void submit(`${s.artistName} ${s.title}`)} className="flex items-center gap-3 w-full px-3 py-2 text-left">{s.coverUrl ? <img src={s.coverUrl} alt="" className="w-8 h-8 rounded-md object-cover" /> : <span className="w-8 h-8 rounded-md bg-white/6" />}<span className="min-w-0"><span className="block text-sm font-semibold truncate">{s.title}</span><span className="block text-xs text-ink-faint truncate">{s.artistName}</span></span></button></li>)}
            </ul>
          )}
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => void submit("", true)} disabled={busy} className="sticker sticker-ghost flex-1 justify-center"><SkipForward size={16} /> Passer (+{STEPS[Math.min(attempt, STEPS.length - 1)] - allowed} s)</button>
            <button type="button" onClick={() => void submit(guess)} disabled={busy || !guess.trim()} className="sticker flex-1 justify-center">Valider</button>
          </div>
        </div>
      ) : (
        <div className="mt-5 ticket p-5 text-center solved-pop">
          <p className="stage-kicker mb-1">{state.won ? `Trouvé en ${state.tries.length} essai${state.tries.length > 1 ? "s" : ""}` : "Pas cette fois"}</p>
          <p className="font-display text-2xl font-extrabold leading-tight">{state.title}</p>
          <p className="text-sm text-ink-muted">{state.artistName}</p>
          <p className="text-2xl mt-3 tracking-widest">{state.tries.map((t) => (t === "ok" ? "🟥" : t === "skip" ? "⬜" : "⬛")).join("")}</p>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => void share()} className="sticker flex-1 justify-center"><Share2 size={16} /> {copied ? "Copié !" : "Partager"}</button>
            <a href={`/jouer?mode=solo&theme=${encodeURIComponent("artist-" + (state.artistName ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))}`} className="sticker sticker-ghost flex-1 justify-center">Blind test {state.artistName?.split(" ")[0]}</a>
          </div>
          <p className="text-xs text-ink-faint mt-4">{st.played} joué{st.played > 1 ? "s" : ""} · {st.won} trouvé{st.won > 1 ? "s" : ""} · série {st.streak}</p>
          <p className="note mt-3">Nouveau son demain à minuit</p>
          {!user && <AdSlot slot="final" className="mt-4" />}
        </div>
      )}
    </div>
  );
}
