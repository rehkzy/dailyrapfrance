"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Play, ChevronDown, Check } from "lucide-react";
import ClipPlayer, { type ClipHandle } from "@/components/ClipPlayer";
import ResultTicket from "@/components/ResultTicket";
import BrandLoader from "@/components/BrandLoader";
import { sfx } from "@/lib/sfx";
import { speedBonus } from "@/lib/scoring";
import { qcmStageOrder, qcmStageOptions, qcmIsCorrect, QCM_STAGE_PROMPTS, type QcmField } from "@/lib/qcmStages";
import { bumpGamesPlayed } from "@/lib/dailyStreak";
import { DEFAULT_CONFIG } from "@/lib/presets";
import type { RoundOutcome } from "@/lib/share";

/*
 * « Devine le clip » — un jeu à part, façon Reels : un clip plein écran par "slide", on
 * swipe vers le haut pour passer au suivant. Le clip est lancé après l'intro (point de
 * départ réglé dans le catalogue), trois propositions d'artiste en bas, le chrono part à
 * la première image réellement lue. Le catalogue est sélectionné à la main (/admin), donc
 * chaque slide a toujours un clip.
 */

type FeedClip = {
  id: number;
  videoId: string;
  artist: string;
  title: string;
  feats: string[];
  start: number;
  duration: number | null;
  choices: string[];
};

// Même grammaire que le blind test audio : on devine dans l'ordre l'artiste, le titre, puis
// le feat s'il y en a un — chaque étape en QCM, une seule tentative, points et bonus de
// rapidité identiques. La vidéo montre souvent l'artiste : l'étape « Qui chante ? » est
// donc facile, mais le titre et le feat font la différence.
type SlideState = {
  stage: number;                    // index de l'étape en cours dans `stages`
  stages: QcmField[];
  solved: Partial<Record<QcmField, boolean>>;
  options: string[];                // options de l'étape en cours
  points: number;
  elapsed: number;                  // temps au dernier champ trouvé (pour « rapide »)
  done: boolean;
  wrong: string | null;             // dernier mauvais choix (flash)
};

const POINTS: Record<QcmField, number> = { title: 1, artist: 1, feat: 2 };
const ROUND_SECONDS = 25;

function toStageTrack(c: FeedClip) {
  return { id: String(c.id), title: c.title, artistName: c.artist, feats: c.feats };
}

export default function ClipFeed({ tag, count = 10 }: { tag?: string; count?: number }) {
  const [clips, setClips] = useState<FeedClip[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [states, setStates] = useState<Record<number, SlideState>>({});
  const [playing, setPlaying] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const playersRef = useRef<Record<number, ClipHandle | null>>({});
  const slidesRef = useRef<Record<number, HTMLElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ count: String(count) });
    if (tag) params.set("tag", tag);
    fetch(`/api/clips/feed?${params}`)
      .then((r) => r.json())
      .then((d: { clips?: FeedClip[]; total?: number }) => {
        if (!d.clips || d.clips.length < 3) {
          setLoadError(d.total === 0 ? "Le catalogue de clips est vide pour le moment — il se remplit depuis l'admin." : "Pas assez de clips pour lancer une partie.");
          setClips([]);
        } else setClips(d.clips);
      })
      .catch(() => setLoadError("Impossible de charger les clips. Réessaie."));
  }, [tag, count]);

  const score = useMemo(() => Object.values(states).reduce((s, x) => s + x.points, 0), [states]);
  const outcomes: RoundOutcome[] = useMemo(
    () => (clips ?? []).map((c) => {
      const st = states[c.id];
      if (!st) return { found: 0, total: 1 };
      const found = Object.values(st.solved).filter(Boolean).length;
      return { found, total: st.stages.length, fast: found === st.stages.length && st.elapsed <= 5 };
    }),
    [clips, states]
  );

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // Slide visible = clip actif : les autres sont mis en pause.
  useEffect(() => {
    if (!clips || !containerRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const idx = Number((e.target as HTMLElement).dataset.index);
            setActive(idx);
          }
        }
      },
      { root: containerRef.current, threshold: [0.6] }
    );
    Object.values(slidesRef.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [clips]);

  // Changement de slide : pause des autres, lecture de l'actif (si la partie a démarré).
  useEffect(() => {
    if (!clips) return;
    stopTimer();
    setTimeLeft(ROUND_SECONDS);
    startedAtRef.current = null;
    clips.forEach((c, i) => {
      if (i !== active) playersRef.current[c.id]?.pause();
    });
    const current = clips[active];
    if (current && started && !states[current.id]?.done) playersRef.current[current.id]?.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, clips, started]);

  function onPlaying(clipId: number) {
    setPlaying((p) => ({ ...p, [clipId]: true }));
    const current = clips?.[active];
    if (!current || current.id !== clipId || states[clipId]?.done || startedAtRef.current) return;
    startedAtRef.current = Date.now();
    if (!states[clipId]) setStates((s) => ({ ...s, [clipId]: initState(current) }));
    setTimeLeft(ROUND_SECONDS);
    stopTimer();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - (startedAtRef.current ?? Date.now())) / 1000;
      const left = Math.max(0, Math.ceil(ROUND_SECONDS - elapsed));
      setTimeLeft(left);
      if (left <= 6) sfx.tick();
      if (left <= 0) timeUp(clipId);
    }, 500);
  }

  function initState(clip: FeedClip): SlideState {
    const stages = qcmStageOrder(["artist", "title", ...(clip.feats.length ? (["feat"] as QcmField[]) : [])]);
    const pool = (clips ?? []).map(toStageTrack);
    return { stage: 0, stages, solved: {}, options: qcmStageOptions(stages[0], toStageTrack(clip), pool), points: 0, elapsed: 0, done: false, wrong: null };
  }

  function advance(clipId: number) {
    setTimeout(() => {
      const idx = clips!.findIndex((c) => c.id === clipId);
      if (idx >= clips!.length - 1) finish();
      else slidesRef.current[idx + 1]?.scrollIntoView({ behavior: "smooth" });
    }, 2600);
  }

  function timeUp(clipId: number) {
    const clip = clips?.find((c) => c.id === clipId);
    if (!clip) return;
    stopTimer();
    sfx.wrong();
    setStates((s) => ({ ...s, [clipId]: { ...(s[clipId] ?? initState(clip)), done: true } }));
    advance(clipId);
  }

  // Une étape à la fois, une seule tentative : bonne réponse → points + bonus, mauvaise → on
  // passe quand même à l'étape suivante (comme le blind test audio en mode facile).
  function answer(clipId: number, choice: string) {
    const clip = clips?.find((c) => c.id === clipId);
    const st = states[clipId];
    if (!clip || !st || st.done) return;
    const field = st.stages[st.stage];
    const elapsed = startedAtRef.current ? (Date.now() - startedAtRef.current) / 1000 : ROUND_SECONDS;
    const correct = qcmIsCorrect(field, toStageTrack(clip), choice);
    const gained = correct ? POINTS[field] + speedBonus(elapsed) : 0;
    if (correct) sfx.correct(); else sfx.wrong();
    const nextStage = st.stage + 1;
    const done = nextStage >= st.stages.length;
    const pool = (clips ?? []).map(toStageTrack);
    setStates((s) => ({
      ...s,
      [clipId]: {
        ...st,
        stage: nextStage,
        solved: { ...st.solved, [field]: correct },
        options: done ? [] : qcmStageOptions(st.stages[nextStage], toStageTrack(clip), pool),
        points: st.points + gained,
        elapsed: correct ? elapsed : st.elapsed,
        done,
        wrong: correct ? null : choice,
      },
    }));
    if (done) { stopTimer(); advance(clipId); }
    else setTimeout(() => setStates((s) => (s[clipId] ? { ...s, [clipId]: { ...s[clipId], wrong: null } } : s)), 600);
  }

  function finish() {
    stopTimer();
    clips?.forEach((c) => playersRef.current[c.id]?.pause());
    bumpGamesPlayed();
    window.dispatchEvent(new Event("drf-game-finished"));
    sfx.tag();
    setFinished(true);
  }

  function begin() {
    sfx.click();
    setStarted(true);
    const current = clips?.[0];
    if (current) playersRef.current[current.id]?.play();
  }

  useEffect(() => () => stopTimer(), [stopTimer]);

  if (clips === null) {
    return (
      <div className="stage grid place-items-center">
        <BrandLoader label="On charge les clips" size="lg" />
      </div>
    );
  }
  if (loadError || clips.length === 0) {
    return (
      <div className="stage grid place-items-center px-6 text-center">
        <div>
          <p className="font-display text-2xl font-bold mb-2">Pas de clip pour l&apos;instant</p>
          <p className="text-sm text-ink-muted mb-6">{loadError}</p>
          <a href="/jouer" className="sticker">Jouer au blind test audio</a>
        </div>
      </div>
    );
  }
  if (finished) {
    const perfect = outcomes.filter((o) => o.found >= o.total).length;
    return (
      <div className="stage px-5 sm:px-6 pb-10">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between pt-4 pb-2">
            <a href="/" aria-label="Accueil"><img src="/logo.svg" alt="DailyRapFrance" className="h-6 w-auto" /></a>
            <a href="/jouer?mode=clips" className="text-sm font-semibold text-ink-muted">Rejouer</a>
          </div>
          <h2 className="stage-title mt-4 mb-5">{perfect === clips.length ? "Sans faute." : perfect >= clips.length * 0.7 ? "Solide." : "Fini."}</h2>
          <ResultTicket
            points={score}
            rounds={outcomes}
            themeLabel="Devine le clip"
            config={{ ...DEFAULT_CONFIG, mode: "solo", theme: tag ?? "clips", media: "clip", rounds: clips.length }}
            daily={null}
            chips={[{ label: `${perfect} / ${clips.length} clips reconnus` }]}
            headline="Devine le clip"
            subline="1 pt par artiste reconnu, bonus de rapidité."
            onReplay={() => window.location.assign("/jouer?mode=clips")}
            leaderboardHref={undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="reel-feed" data-lenis-prevent>
      <ImmersiveBody />
      {clips.map((clip, i) => {
        const st = states[clip.id];
        const isActive = i === active;
        return (
          <section key={clip.id} ref={(el) => { slidesRef.current[i] = el; }} data-index={i} className="reel-slide">
            <div className="reel-video">
              {Math.abs(i - active) <= 1 && (
                <ClipPlayer
                  ref={(h) => { playersRef.current[clip.id] = h; }}
                  videoId={clip.videoId}
                  start={clip.start}
                  volume={1}
                  onPlaying={() => onPlaying(clip.id)}
                  covered={!playing[clip.id] && !st}
                  onCoverTap={started && isActive ? () => playersRef.current[clip.id]?.play() : undefined}
                  coverLabel={!started ? "Le clip démarre au tap" : "Lancer le clip"}
                />
              )}
            </div>
            <div className="reel-shade" aria-hidden="true" />

            {/* Haut : fermer, progression, score */}
            <div className="reel-top">
              <a href="/jouer" aria-label="Quitter" className="w-10 h-10 rounded-full bg-black/45 border border-white/10 grid place-items-center text-ink"><X size={16} /></a>
              <div className="flex-1 seg-progress">
                {clips.map((c, j) => (
                  <span key={c.id} className="seg" data-state={states[c.id]?.done ? (Object.values(states[c.id].solved).every(Boolean) ? "done" : Object.values(states[c.id].solved).some(Boolean) ? "partial" : "miss") : j === active ? "current" : undefined} />
                ))}
              </div>
              <span className="score-rail"><span className="score-num text-xl pl-1">{score}</span><span className="text-[11px] text-ink-faint pr-1">pts</span></span>
            </div>

            {/* Bas : question + réponses, ou révélation */}
            <div className="reel-bottom">
              {!started && i === 0 ? (
                <div className="text-center">
                  <p className="stage-kicker mb-1">Devine le clip</p>
                  <p className="font-display text-2xl font-extrabold tracking-tight mb-4">{clips.length} clips, {ROUND_SECONDS} s chacun. L&apos;artiste, le titre, le feat.</p>
                  <button type="button" onClick={begin} className="sticker h-16 px-10 text-lg"><Play size={20} fill="currentColor" /> C&apos;est parti</button>
                </div>
              ) : st?.done ? (
                <div className="solved-pop">
                  <p className={`text-xs font-bold mb-1 ${st.points > 0 ? "text-[#ffd166]" : "text-riseNeg"}`}>{st.points > 0 ? `+${st.points} pts` : "Raté"}</p>
                  <p className="font-display text-3xl font-extrabold tracking-tight leading-none">{clip.title}</p>
                  <p className="text-ink-muted mt-1">{clip.artist}{clip.feats.length > 0 && ` feat. ${clip.feats.slice(0, 3).join(", ")}`}</p>
                  <span className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {st.stages.map((f) => (
                      <span key={f} className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${st.solved[f] ? "bg-[#ffd166] text-[#3a0007]" : "bg-white/10 text-ink-faint"}`}>
                        {f === "artist" ? "Artiste" : f === "title" ? "Titre" : "Feat"} {st.solved[f] ? "✓" : "✗"}
                      </span>
                    ))}
                  </span>
                  {i < clips.length - 1 && (
                    <button type="button" onClick={() => slidesRef.current[i + 1]?.scrollIntoView({ behavior: "smooth" })} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
                      Clip suivant <ChevronDown size={16} className="animate-bounce" />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-sm font-bold">
                      {st ? QCM_STAGE_PROMPTS[st.stages[st.stage]] : "Qui chante ?"}
                      {st && st.stages.length > 1 && <span className="ml-2 text-[11px] font-semibold text-ink-faint">{st.stage + 1}/{st.stages.length}</span>}
                    </p>
                    {isActive && started && (
                      <span className={`score-num text-2xl ${timeLeft <= 5 ? "text-[#ffd166] urgent-pulse" : "text-ink"}`}>{playing[clip.id] ? timeLeft : "…"}</span>
                    )}
                  </div>
                  <div className="space-y-2" key={st?.stage ?? 0}>
                    {(st?.options ?? clip.choices).map((choice, k) => (
                      <button key={choice} type="button" disabled={!isActive || !started || !st} onClick={() => answer(clip.id, choice)} className="answer solved-pop" data-wrong={st?.wrong === choice}>
                        <span className="answer-key">{["A", "B", "C"][k]}</span>
                        <span className="flex-1 truncate">{choice}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {st?.done && Object.values(st.solved).every(Boolean) && <span className="reel-check solved-pop"><Check size={28} strokeWidth={3} /></span>}
          </section>
        );
      })}
    </div>
  );
}

/* Pendant le feed de clips : plein écran, aucun menu du site (header, dock) — comme le blind test. */
function ImmersiveBody() {
  useEffect(() => {
    document.body.classList.add("game-immersive");
    return () => { document.body.classList.remove("game-immersive"); };
  }, []);
  return null;
}
