"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Share2, Swords, BookmarkPlus, ImageIcon, X } from "lucide-react";
import { buildGrid, buildShareText, copyText, shareOrCopy, type RoundOutcome } from "@/lib/share";
import { configToUrl, savePreset, describeConfig, type GameConfig } from "@/lib/presets";
import ShareScoreCard from "@/components/ShareScoreCard";

/*
 * Bloc "Partage" de l'écran de fin — trois gestes, dans l'ordre d'usage :
 *   1. Copier / partager le résultat en texte (grille emoji sans spoiler) — le geste Wordle.
 *   2. Défier un pote : un lien qui ouvre EXACTEMENT la même partie, avec ton score à battre.
 *   3. Enregistrer la config pour la relancer une prochaine fois ("Tes soirées").
 * La carte image (story 9:16) est là aussi, derrière un bouton, pour ne pas alourdir l'écran.
 */
export default function ResultShare({
  points,
  rounds,
  themeLabel,
  config,
  daily,
  bestStreak,
  playerName,
}: {
  points: number;
  rounds: RoundOutcome[];
  themeLabel: string;
  config: GameConfig;
  daily: { number: number; streak: number } | null;
  bestStreak?: number;
  playerName?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [challengeCopied, setChallengeCopied] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const challengeUrl = useMemo(
    () => configToUrl(config, { from: (playerName ?? "un pote").slice(0, 24), score: String(points), ...(daily ? { daily: "1" } : {}), autostart: config.mode === "solo" ? "1" : "" }),
    [config, playerName, points, daily]
  );
  const resultUrl = daily ? `https://dailyrapfrance.best/jouer?daily=1&theme=${config.theme}&autostart=1` : challengeUrl;

  const text = useMemo(
    () => buildShareText({ points, rounds, themeLabel, url: resultUrl, daily, bestStreak }),
    [points, rounds, themeLabel, resultUrl, daily, bestStreak]
  );

  async function copyResult() {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function nativeShare() {
    const res = await shareOrCopy({ title: "Blind Test Rap FR — DailyRapFrance", text });
    if (res === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function challenge() {
    const res = await shareOrCopy({
      title: "Défi blind test rap FR",
      text: `${playerName ?? "Je"} ${playerName ? "a" : "ai"} fait ${points} pts sur « ${themeLabel} ». Tu fais mieux ? 🎤\n${challengeUrl}`,
    });
    if (res !== "none") {
      setChallengeCopied(true);
      setTimeout(() => setChallengeCopied(false), 2000);
    }
  }

  function save() {
    const name = presetName.trim() || describeConfig(config, themeLabel);
    savePreset(name, config);
    setSavedName(name);
    setSaving(false);
  }

  return (
    <div className="text-left">
      {/* Aperçu fidèle de ce qui sera collé — grille emoji sans spoiler */}
      <div className="result-grid mb-3" aria-label="Résultat à partager">
        {text.split("\n").slice(0, -1).join("\n")}
        {"\n"}
        <span className="text-ink-faint">{resultUrl.replace("https://", "")}</span>
      </div>
      <p className="text-[11px] text-ink-faint mb-4 flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gold" /> tout trouvé
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-riseNeg ml-2" /> en partie
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-white/25 ml-2" /> raté
        <span className="ml-2">⚡ éclair</span>
      </p>

      <div className="grid gap-2">
        <button type="button" onClick={canShare ? nativeShare : copyResult} className="action-row" data-primary="true">
          <span className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center shrink-0">
            {copied ? <Check size={18} strokeWidth={3} /> : canShare ? <Share2 size={18} /> : <Copy size={18} />}
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">{copied ? "Copié ! Colle-le dans le groupe" : canShare ? "Partager mon résultat" : "Copier mon résultat"}</span>
            <span className="block text-xs opacity-85">Sans spoiler — personne ne verra les réponses</span>
          </span>
        </button>

        <button type="button" onClick={challenge} className="action-row">
          <span className="w-10 h-10 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0">
            {challengeCopied ? <Check size={18} strokeWidth={3} /> : <Swords size={18} />}
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">{challengeCopied ? "Lien du défi copié" : "Défier un pote sur cette partie"}</span>
            <span className="block text-xs text-ink-faint">Même thème, mêmes réglages, ton score à battre : {points} pts</span>
          </span>
        </button>

        <button type="button" onClick={() => setShowStory((v) => !v)} className="action-row" aria-expanded={showStory}>
          <span className="w-10 h-10 rounded-xl bg-white/6 text-ink-muted grid place-items-center shrink-0">
            <ImageIcon size={18} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">Image pour ta story</span>
            <span className="block text-xs text-ink-faint">Format 9:16, logo et score — Instagram, TikTok, Snap</span>
          </span>
        </button>
        {showStory && (
          <div className="card p-4">
            <ShareScoreCard points={points} themeLabel={themeLabel} rounds={rounds.length} />
          </div>
        )}

        {savedName ? (
          <div className="action-row" data-static="true">
            <span className="w-10 h-10 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0">
              <Check size={18} strokeWidth={3} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Enregistrée : {savedName}</span>
              <span className="block text-xs text-ink-faint">Retrouve-la dans « Tes soirées » sur l&apos;accueil, prête à relancer.</span>
            </span>
          </div>
        ) : saving ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="card p-3.5 flex items-center gap-2"
          >
            <input
              autoFocus
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={describeConfig(config, themeLabel)}
              maxLength={40}
              aria-label="Nom de la soirée"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gold/50"
            />
            <button type="submit" className="h-10 px-4 rounded-full bg-gold hover:bg-glow text-white text-sm font-semibold transition-colors">
              Enregistrer
            </button>
            <button type="button" onClick={() => setSaving(false)} aria-label="Annuler" className="w-9 h-9 grid place-items-center text-ink-faint hover:text-ink">
              <X size={16} />
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setSaving(true)} className="action-row">
            <span className="w-10 h-10 rounded-xl bg-white/6 text-ink-muted grid place-items-center shrink-0">
              <BookmarkPlus size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Enregistrer cette config pour mes soirées</span>
              <span className="block text-xs text-ink-faint">{describeConfig(config, themeLabel)} — à relancer en un tap</span>
            </span>
          </button>
        )}
      </div>

      <details className="mt-3 text-xs text-ink-faint">
        <summary className="cursor-pointer hover:text-ink">Voir le texte brut</summary>
        <pre className="result-grid mt-2 text-[11px]">{text}</pre>
      </details>
      <span className="sr-only">{buildGrid(rounds)}</span>
    </div>
  );
}
