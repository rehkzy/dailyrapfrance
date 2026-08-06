"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Scale } from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import { sfx } from "@/lib/sfx";

/*
 * Le Tribunal du Rap — un duel par jour (deux morceaux du chart), la communauté vote.
 * Les résultats (barres de %) ne s'affichent qu'APRÈS avoir voté, pour ne pas influencer.
 */

type Duel = {
  id: string;
  day: string;
  a_id: string; a_title: string; a_artist: string; a_cover: string | null;
  b_id: string; b_title: string; b_artist: string; b_cover: string | null;
};

export default function TribunalPage() {
  const [duel, setDuel] = useState<Duel | null>(null);
  const [votes, setVotes] = useState<{ a: number; b: number }>({ a: 0, b: 0 });
  const [myVote, setMyVote] = useState<"a" | "b" | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/jeux/tribunal")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDuel(d.duel);
        setVotes(d.votes);
        setMyVote(d.myVote);
        setSignedIn(d.signedIn);
      })
      .catch(() => setError("Impossible de charger le duel du jour. Réessaie."));
  }

  useEffect(load, []);

  async function vote(choice: "a" | "b") {
    if (!duel || myVote || busy) return;
    setBusy(true);
    sfx.click();
    const res = await fetch("/api/jeux/tribunal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice }),
    });
    setBusy(false);
    if (res.status === 401) {
      setError("Connecte-toi pour voter — ton vote compte une seule fois par duel.");
      return;
    }
    sfx.correct();
    setMyVote(choice);
    setVotes((v) => ({ ...v, [choice]: v[choice] + 1 }));
  }

  if (error && !duel) return <p className="max-w-md mx-auto text-center text-sm text-riseNeg py-20">{error}</p>;
  if (!duel) {
    return (
      <div className="h-64 flex items-center justify-center">
        <BrandLoader size="md" />
      </div>
    );
  }

  const total = votes.a + votes.b;
  const pctA = total ? Math.round((votes.a / total) * 100) : 50;
  const pctB = total ? 100 - pctA : 50;
  const voted = myVote !== null;

  const sides = [
    { key: "a" as const, title: duel.a_title, artist: duel.a_artist, cover: duel.a_cover, pct: pctA, count: votes.a },
    { key: "b" as const, title: duel.b_title, artist: duel.b_artist, cover: duel.b_cover, pct: pctB, count: votes.b },
  ];

  return (
    <section className="max-w-2xl mx-auto px-6 pt-10 pb-24">
      <a href="/jeux" className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide mb-8">
        <ArrowLeft size={14} /> Tous les jeux
      </a>

      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
        <Scale size={13} /> Le Tribunal · {duel.day}
      </p>
      <h1 className="font-display text-2xl font-semibold mb-1">Le duel du jour</h1>
      <p className="text-sm text-ink-muted mb-8">
        {voted ? `${total.toLocaleString("fr-FR")} vote${total > 1 ? "s" : ""} — la communauté a tranché.` : "Un seul vote. Choisis ton camp."}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {sides.map((s) => {
          const isMine = myVote === s.key;
          return (
            <button
              key={s.key}
              onClick={() => vote(s.key)}
              disabled={voted || busy}
              className={`game-thumb p-4 min-h-[240px] flex flex-col justify-end text-left transition-opacity ${
                voted && !isMine ? "opacity-60" : ""
              } ${voted ? "pointer-events-none" : ""}`}
            >
              <span
                className="thumb-bg"
                style={{
                  background: s.cover
                    ? `linear-gradient(180deg, rgba(10,7,7,0.15) 0%, rgba(10,7,7,0.92) 75%), url(${s.cover}) center/cover`
                    : "linear-gradient(180deg, #2a0509, #0a0707)",
                }}
                aria-hidden="true"
              />
              {isMine && <span className="thumb-badge thumb-badge-top">Ton vote</span>}
              <p className="font-display text-lg font-semibold leading-tight mb-0.5">{s.title}</p>
              <p className="text-xs text-ink-muted mb-2">{s.artist}</p>
              {voted ? (
                <div className="solved-pop">
                  <p className="font-impact text-2xl text-gold leading-none mb-1.5">{s.pct}%</p>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ) : (
                <p className="font-mono text-[10px] uppercase tracking-wide text-gold">Voter →</p>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-riseNeg text-center mb-4">{error}</p>}
      {!signedIn && !voted && (
        <p className="text-xs text-ink-faint font-mono text-center">Connecte-toi pour que ton vote compte.</p>
      )}
      {voted && (
        <p className="text-xs text-ink-faint font-mono text-center">Nouveau duel demain à minuit.</p>
      )}
    </section>
  );
}
