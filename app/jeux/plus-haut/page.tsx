"use client";

import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, RotateCcw, TrendingUp } from "lucide-react";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import BrandLoader from "@/components/BrandLoader";
import { sfx } from "@/lib/sfx";

// Désactivé pour l'instant — seuls Blind Test et Artists Manager 2026 sont
// jouables. Le composant réel (PlusHautPageReal, plus bas) est intact et prêt
// à être réactivé : il suffit de remplacer ce redirect par son rendu.
export default function PlusHautPage() {
  redirect("/jeux/bientot?titre=Plus%20Haut%2C%20Plus%20Bas");
}

/*
 * Plus Haut, Plus Bas — deux morceaux, lequel a le plus de streams (rank Deezer) ?
 * Bonne réponse : la série continue, le morceau de droite passe à gauche et un nouveau
 * challenger arrive. Mauvaise réponse : partie terminée, record local conservé.
 */

type Track = { id: string; title: string; artist: string; cover: string; rank: number };

function loadBest(): number {
  try {
    return Number(localStorage.getItem("drf-plushaut-best") ?? 0);
  } catch {
    return 0;
  }
}

void PlusHautPageReal; // référencé pour éviter un avertissement de build (non appelé)

function PlusHautPageReal() {
  const [pool, setPool] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<Track | null>(null);
  const [right, setRight] = useState<Track | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const usedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setBest(loadBest());
    fetch("/api/jeux/plus-haut")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setPool(d.tracks);
      })
      .catch(() => setError("Impossible de charger les morceaux. Réessaie."));
  }, []);

  useEffect(() => {
    if (pool.length && !left) startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  function draw(exclude: Set<string>): Track {
    const candidates = pool.filter((t) => !exclude.has(t.id));
    // Pool épuisé (série de fou) : on recycle en gardant juste les deux affichés exclus.
    const source = candidates.length > 0 ? candidates : pool.filter((t) => t.id !== left?.id && t.id !== right?.id);
    return source[Math.floor(Math.random() * source.length)];
  }

  function startGame() {
    usedRef.current = new Set();
    const a = draw(usedRef.current);
    usedRef.current.add(a.id);
    const b = draw(usedRef.current);
    usedRef.current.add(b.id);
    setLeft(a);
    setRight(b);
    setStreak(0);
    setGameOver(false);
    setRevealing(false);
  }

  function pick(choice: "left" | "right") {
    if (!left || !right || revealing || gameOver) return;
    const correct =
      (choice === "left" && left.rank >= right.rank) || (choice === "right" && right.rank >= left.rank);
    setRevealing(true);

    setTimeout(() => {
      if (correct) {
        sfx.correct();
        const next = streak + 1;
        setStreak(next);
        if (next > best) {
          setBest(next);
          try {
            localStorage.setItem("drf-plushaut-best", String(next));
          } catch {
            // stockage indisponible — le record vivra le temps de la session
          }
        }
        // Le gagnant du duel reste, un nouveau challenger arrive.
        const winner = left.rank >= right.rank ? left : right;
        const challenger = draw(usedRef.current);
        usedRef.current.add(challenger.id);
        setLeft(winner);
        setRight(challenger);
        setRevealing(false);
      } else {
        sfx.wrong();
        setGameOver(true);
        setRevealing(false);
        // Enregistre la série comme score (thème dédié, visible dans le profil).
        if (streak > 0) {
          fetch("/api/blindtest/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: "jeu-plus-haut", rounds: streak, points: streak }),
          }).catch(() => {});
        }
      }
    }, 900); // court temps de révélation des chiffres avant d'enchaîner
  }

  if (error) return <p className="max-w-md mx-auto text-center text-sm text-riseNeg py-20">{error}</p>;
  if (!left || !right) {
    return (
      <div className="h-64 flex items-center justify-center">
        <BrandLoader size="md" />
      </div>
    );
  }

  return (
    <section className="max-w-2xl mx-auto px-6 pt-10 pb-24">
      <a href="/jeux" className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide mb-8">
        <ArrowLeft size={14} /> Tous les jeux
      </a>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-1">Plus Haut, Plus Bas</p>
          <h1 className="font-display text-2xl font-semibold">Quel morceau stream le plus ?</h1>
        </div>
        <div className="text-right shrink-0">
          <p className="font-impact text-3xl text-gold leading-none">{streak}</p>
          <p className="font-mono text-[10px] text-ink-faint uppercase">Série · record {best}</p>
        </div>
      </div>

      {gameOver ? (
        <div className="text-center solved-pop py-8">
          <TrendingUp size={40} className="text-gold mx-auto mb-4" />
          <p className="font-display text-2xl font-semibold mb-1">Série terminée !</p>
          <p className="text-sm text-ink-muted mb-8">
            {streak} bonne{streak > 1 ? "s" : ""} réponse{streak > 1 ? "s" : ""} d&apos;affilée
            {streak >= best && streak > 0 ? " — nouveau record 🔥" : ""}
          </p>
          <BorderMagicButton onClick={startGame} size="lg">
            <RotateCcw size={18} /> Rejouer
          </BorderMagicButton>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {([{ t: left, side: "left" as const }, { t: right, side: "right" as const }]).map(({ t, side }) => (
            <button
              key={t.id + side}
              onClick={() => pick(side)}
              disabled={revealing}
              className="game-thumb p-4 min-h-[240px] flex flex-col justify-end text-left disabled:pointer-events-none"
            >
              <span
                className="thumb-bg"
                style={{
                  background: `linear-gradient(180deg, rgba(10,7,7,0.15) 0%, rgba(10,7,7,0.92) 75%), url(${t.cover}) center/cover`,
                }}
                aria-hidden="true"
              />
              <p className="font-display text-lg font-semibold leading-tight mb-0.5">{t.title}</p>
              <p className="text-xs text-ink-muted mb-2">{t.artist}</p>
              {revealing ? (
                <p className="solved-pop font-impact text-xl text-gold">{t.rank.toLocaleString("fr-FR")}</p>
              ) : (
                <p className="font-mono text-[10px] uppercase tracking-wide text-gold">Ce morceau →</p>
              )}
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] text-ink-faint font-mono mt-6 text-center">
        Basé sur l&apos;indice de popularité Deezer des morceaux.
      </p>
    </section>
  );
}
