"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, X, Share2, RotateCcw } from "lucide-react";
import { FEATURING_GRAPH, artistLabel, normalizeArtistId, areLinked, pickDailyPair } from "@/lib/featuringGraph";
import { sfx } from "@/lib/sfx";

function parisDateString(): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
}
function seedFromDate(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) h = (h * 31 + date.charCodeAt(i)) >>> 0;
  return h;
}

export default function FeaturingChain() {
  const { start, end, parHops } = useMemo(() => pickDailyPair(seedFromDate(parisDateString())), []);
  const [chain, setChain] = useState<string[]>([start]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [copied, setCopied] = useState(false);

  const known = useMemo(() => new Set(Object.keys(FEATURING_GRAPH)), []);

  function submit() {
    const candidate = normalizeArtistId(input);
    if (!candidate) return;
    const last = chain[chain.length - 1];

    if (!known.has(candidate)) {
      setError(`"${input}" ne fait pas encore partie du graphe connu — essaie un autre artiste.`);
      sfx.wrong();
      return;
    }
    if (chain.map(normalizeArtistId).includes(candidate)) {
      setError("Déjà utilisé dans la chaîne.");
      sfx.wrong();
      return;
    }
    if (!areLinked(last, candidate)) {
      setError(`Aucun featuring connu entre ${artistLabel(last)} et ${artistLabel(candidate)}.`);
      sfx.wrong();
      return;
    }

    setError(null);
    setInput("");
    const next = [...chain, candidate];
    setChain(next);
    sfx.correct();
    if (candidate === normalizeArtistId(end)) {
      setWon(true);
      sfx.victory();
    }
  }

  async function share() {
    const text = `Chaîne de featurings DailyRapFrance — ${artistLabel(start)} → ${artistLabel(end)}\nFait en ${chain.length - 1} sauts (par : ${parHops})\ndailyrapfrance.best/chaine`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* rien */
    }
  }

  function restart() {
    setChain([start]);
    setInput("");
    setError(null);
    setWon(false);
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <p className="font-mono text-xs text-gold uppercase tracking-[0.2em] mb-1">Chaîne de featurings</p>
        <p className="text-sm text-ink-faint">
          Relie <span className="text-ink font-semibold">{artistLabel(start)}</span> à{" "}
          <span className="text-ink font-semibold">{artistLabel(end)}</span> par des featurings réels.
        </p>
        <p className="text-xs text-ink-faint mt-1">Par : {parHops} sauts</p>
      </div>

      {/* Chaîne construite */}
      <div className="flex flex-wrap items-center gap-2 justify-center mb-6">
        {chain.map((id, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                i === chain.length - 1 && won ? "bg-gold text-white" : "glass text-ink"
              }`}
            >
              {artistLabel(id)}
            </span>
            {i < chain.length - 1 && <ArrowRight size={14} className="text-ink-faint" />}
          </div>
        ))}
        {!won && (
          <>
            <ArrowRight size={14} className="text-ink-faint" />
            <span className="rounded-full px-3.5 py-1.5 text-sm font-semibold border border-dashed border-white/20 text-ink-faint">
              {artistLabel(end)}
            </span>
          </>
        )}
      </div>

      {!won ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex gap-2 mb-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Qui a featuré avec ${artistLabel(chain[chain.length - 1])} ?`}
            autoFocus
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-gold/50"
          />
          <button type="submit" className="bg-gold hover:bg-glow text-white rounded-full px-5 font-semibold text-sm transition-colors">
            <Check size={16} />
          </button>
        </form>
      ) : (
        <div className="text-center">
          <p className="font-display text-xl font-bold text-gold mb-1">Relié en {chain.length - 1} sauts !</p>
          <p className="text-xs text-ink-faint mb-4">{chain.length - 1 <= parHops ? "Dans le par, propre 🔥" : "Plus long que le par, mais relié quand même."}</p>
          <div className="flex items-center justify-center gap-2.5">
            <button onClick={share} className="press inline-flex items-center gap-2 bg-gold hover:bg-glow text-white rounded-full px-5 py-2.5 font-semibold text-sm transition-colors">
              {copied ? <Check size={15} /> : <Share2 size={15} />}
              {copied ? "Copié !" : "Partager"}
            </button>
            <button onClick={restart} className="press inline-flex items-center gap-2 glass text-ink-muted hover:text-ink rounded-full px-5 py-2.5 font-medium text-sm transition-colors">
              <RotateCcw size={15} /> Rejouer
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-riseNeg text-center flex items-center justify-center gap-1.5">
          <X size={12} /> {error}
        </p>
      )}

      <p className="text-[11px] text-ink-faint text-center mt-8 leading-relaxed">
        Graphe curé à la main à partir de featurings réels et connus — pas exhaustif, en
        extension continue.
      </p>
    </div>
  );
}
