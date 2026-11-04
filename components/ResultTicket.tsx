"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Share2, Copy, Check, ImageIcon, Swords, BookmarkPlus, X, RotateCcw, Trophy, Sliders, Flame, ArrowRight } from "lucide-react";
import { WhatsAppIcon } from "@/components/SocialIcons";
import { buildShareText, copyText, shareOrCopy, type RoundOutcome } from "@/lib/share";
import { configToUrl, savePreset, describeConfig, VARIANTS, type GameConfig } from "@/lib/presets";
import ShareScoreCard from "@/components/ShareScoreCard";
import BrandMark from "@/components/BrandMark";

/*
 * Ticket de fin de partie (v3) — un seul objet : le score en haut, la partie manche par
 * manche en tuiles, la déchirure, puis les gestes. Le texte partagé (grille emoji sans
 * spoiler + lien) n'est jamais affiché brut : on le voit comme des tuiles, on le copie ou
 * on l'envoie. Les actions secondaires (story, enregistrer) s'ouvrent dans une feuille.
 */
export default function ResultTicket({
  points,
  rounds,
  themeLabel,
  config,
  daily,
  bestStreak,
  playerName,
  chips,
  headline,
  subline,
  onReplay,
  onReplaySame,
  leaderboardHref,
  podium,
  guestCta,
  nextUp,
}: {
  points: number;
  rounds: RoundOutcome[];
  themeLabel: string;
  config: GameConfig;
  daily: { number: number; streak: number } | null;
  bestStreak?: number;
  playerName?: string;
  chips: { label: string; strong?: boolean }[];
  headline: string;
  subline: string;
  onReplay: () => void;
  onReplaySame?: () => void;
  leaderboardHref?: string;
  podium?: { name: string; score: number }[];
  /** Invité : le bloc « sauvegarde ce score » — rendu juste sous le score, là où on le lit. */
  guestCta?: ReactNode;
  /** La suite proposée (défi de la semaine, retour demain, thème surprise). */
  nextUp?: { href?: string; title: string; sub: string; icon?: "flame" | "arrow" };
}) {
  const [sheet, setSheet] = useState<null | "story" | "save" | "share">(null);
  const [copied, setCopied] = useState(false);
  const [challenged, setChallenged] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);

  const challengeUrl = useMemo(
    () =>
      configToUrl(config, {
        from: (playerName ?? "un pote").slice(0, 24),
        score: String(points),
        ...(daily ? { daily: "1" } : {}),
        autostart: config.mode === "solo" ? "1" : "",
      }),
    [config, playerName, points, daily]
  );
  const resultUrl = daily ? `https://dailyrapfrance.best/jouer?daily=1&theme=${config.theme}&autostart=1` : challengeUrl;
  const text = useMemo(
    () => buildShareText({ points, rounds, themeLabel, url: resultUrl, daily, bestStreak }),
    [points, rounds, themeLabel, resultUrl, daily, bestStreak]
  );
  const variantLabel = VARIANTS.find((v) => v.id === config.variant)?.label;

  function flash(setter: (v: boolean) => void) {
    setter(true);
    setTimeout(() => setter(false), 1800);
  }
  async function share() {
    const r = await shareOrCopy({ title: "Blind Test Rap FR — DailyRapFrance", text });
    if (r === "copied") flash(setCopied);
  }
  async function copy() {
    if (await copyText(text)) flash(setCopied);
  }
  async function challenge() {
    const r = await shareOrCopy({
      title: "Défi blind test rap FR",
      text: `${playerName ? `${playerName} a` : "J'ai"} fait ${points} pts sur « ${themeLabel} ». Tu fais mieux ? 🎤\n${challengeUrl}`,
    });
    if (r !== "none") flash(setChallenged);
  }
  function save() {
    const name = presetName.trim() || describeConfig(config, themeLabel);
    savePreset(name, config);
    setSavedName(name);
    setSheet(null);
  }

  return (
    <>
      <div className="ticket">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            <span className="stage-kicker inline-flex items-center gap-2">
              <BrandMark size={12} /> {headline}
            </span>
            {variantLabel && config.variant !== "classic" && (
              <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-white text-black">{variantLabel}</span>
            )}
          </div>

          {podium && podium.length > 0 ? (
            <div className="mb-2">
              <p className="stage-title mb-1">{podium[0].name}</p>
              <p className="text-ink-muted text-sm">gagne avec {podium[0].score} pts</p>
            </div>
          ) : (
            <div className="flex items-end gap-3 mb-1">
              <span className="score-num text-[6.5rem] sm:text-[8rem] leading-none text-ink">{points}</span>
              <span className="font-display font-bold text-2xl text-ink-muted pb-4">pts</span>
            </div>
          )}
          <p className="text-sm text-ink-muted">{subline}</p>

          <div className="tiles mt-5" aria-label="Bilan des manches">
            {rounds.map((r, i) => (
              <span
                key={i}
                className="tile"
                data-s={r.total > 0 && r.found >= r.total ? (r.fast ? "fast" : "done") : r.found > 0 ? "partial" : "miss"}
                title={`Manche ${i + 1} : ${r.found}/${r.total}`}
              >
                {r.fast && r.found >= r.total ? "⚡" : ""}
              </span>
            ))}
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {chips.map((c) => (
                <span key={c.label} className={`text-xs font-medium rounded-md px-2.5 py-1.5 ${c.strong ? "bg-gold text-white" : "bg-white/8 text-ink-muted"}`}>
                  {c.label}
                </span>
              ))}
            </div>
          )}

          {podium && podium.length > 1 && (
            <ol className="mt-5 space-y-1.5">
              {podium.map((p, i) => (
                <li key={p.name + i} className="flex items-center gap-3 text-sm">
                  <span className="score-num text-lg w-6 text-ink-faint">{i + 1}</span>
                  <span className="flex-1 font-medium truncate">{p.name}</span>
                  <span className="score-num text-lg text-glow">{p.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="ticket-cut" />

        <div className="p-6 sm:p-8">
          {guestCta && <div className="mb-5">{guestCta}</div>}

          <div className="grid gap-2.5">
            {onReplaySame && (
              <button type="button" onClick={onReplaySame} className="sticker w-full h-16 text-lg cta-glow">
                <RotateCcw size={20} /> Encore — nouveaux extraits
              </button>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={challenge} className="sticker w-full">
                {challenged ? <Check size={18} /> : <Swords size={18} />}
                {challenged ? "Défi envoyé" : "Défier un pote"}
              </button>
              <button type="button" onClick={() => setSheet("share")} className="sticker sticker-ghost w-full">
                {copied ? <Check size={18} className="text-gold" /> : <Share2 size={18} />}
                {copied ? "Copié" : "Partager"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={onReplay} className="sticker sticker-ghost sticker-sm w-full">
                <Sliders size={15} /> {onReplaySame ? "Changer" : "Rejouer"}
              </button>
              {leaderboardHref ? (
                <a href={leaderboardHref} className="sticker sticker-ghost sticker-sm w-full">
                  <Trophy size={15} /> Classement
                </a>
              ) : (
                <a href="/" className="sticker sticker-ghost sticker-sm w-full">Accueil</a>
              )}
            </div>
          </div>

          {nextUp && (
            nextUp.href ? (
              <a href={nextUp.href} className="mt-5 flex items-center gap-3 rounded-2xl p-4 bg-gradient-to-r from-[#8a0010] to-[#f0001c] text-white">
                <span className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center shrink-0">{nextUp.icon === "flame" ? <Flame size={18} /> : <ArrowRight size={18} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{nextUp.title}</span>
                  <span className="block text-xs text-white/80">{nextUp.sub}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-white/80" />
              </a>
            ) : (
              <div className="mt-5 flex items-center gap-3 rounded-2xl p-4 bg-white/5 border border-white/10">
                <span className="w-10 h-10 rounded-xl bg-[#ffd166]/15 text-[#ffd166] grid place-items-center shrink-0"><Flame size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{nextUp.title}</span>
                  <span className="block text-xs text-ink-faint">{nextUp.sub}</span>
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {sheet && (
        <>
          <button type="button" aria-label="Fermer" onClick={() => setSheet(null)} className="sheet-backdrop" />
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="sheet-handle" />
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-lg font-bold">{sheet === "story" ? "Image pour ta story" : sheet === "share" ? "Envoie ton résultat — sans spoiler" : "Enregistrer cette soirée"}</p>
              <button type="button" onClick={() => setSheet(null)} aria-label="Fermer" className="w-9 h-9 rounded-full bg-white/8 grid place-items-center">
                <X size={16} />
              </button>
            </div>
            {sheet === "share" ? (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-2 px-2 pb-1">
                {canShare && (
                  <button type="button" onClick={share} className="share-round" data-primary="true">
                    <span>{copied ? <Check size={22} /> : <Share2 size={22} />}</span>
                    Partager
                  </button>
                )}
                <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="share-round" data-primary={!canShare}>
                  <span><WhatsAppIcon /></span>
                  WhatsApp
                </a>
                <button type="button" onClick={copy} className="share-round">
                  <span>{copied ? <Check size={22} className="text-gold" /> : <Copy size={22} />}</span>
                  {copied ? "Copié" : "Copier"}
                </button>
                <button type="button" onClick={() => setSheet("story")} className="share-round">
                  <span><ImageIcon size={22} /></span>
                  Story
                </button>
                <button type="button" onClick={() => setSheet("save")} className="share-round">
                  <span>{savedName ? <Check size={22} className="text-gold" /> : <BookmarkPlus size={22} />}</span>
                  {savedName ? "Enregistrée" : "Enregistrer"}
                </button>
              </div>
            ) : sheet === "story" ? (
              <>
                <ShareScoreCard points={points} themeLabel={themeLabel} rounds={rounds.length} />
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save();
                }}
              >
                <p className="text-xs text-ink-muted mb-3">{describeConfig(config, themeLabel)}</p>
                <input
                  autoFocus
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Nom (ex. Soirée samedi, Anniv Karim…)"
                  maxLength={40}
                  aria-label="Nom de la soirée"
                  className="answer-input mb-3"
                />
                <button type="submit" className="sticker w-full">Enregistrer</button>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
