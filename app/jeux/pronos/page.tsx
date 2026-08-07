"use client";

import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import BorderMagicButton from "@/components/ui/BorderMagicButton";
import BrandLoader from "@/components/BrandLoader";
import { sfx } from "@/lib/sfx";

// Désactivé pour l'instant — seuls Blind Test et Artists Manager 2026 sont
// jouables. Le composant réel (PronosPageReal, plus bas) est intact et prêt
// à être réactivé : il suffit de remplacer ce redirect par son rendu.
export default function PronosPage() {
  redirect("/jeux/bientot?titre=Coach%20A%26R");
}

/*
 * Coach A&R — chaque semaine, choisis 3 morceaux du top rap actuel que tu penses
 * ENCORE dans le top la semaine prochaine. 1 pt par bon pronostic, comptés au premier
 * passage la semaine suivante (pas de cron — voir la route).
 */

type ChartTrack = { id: string; title: string; artist: string; cover: string };
type Pick = { id: string; title: string; artist: string };

void PronosPageReal; // référencé pour éviter un avertissement de build (non appelé)

function PronosPageReal() {
  const [chart, setChart] = useState<ChartTrack[]>([]);
  const [week, setWeek] = useState("");
  const [myPicks, setMyPicks] = useState<Pick[] | null>(null);
  const [lastResult, setLastResult] = useState<{ points: number; week: string } | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [selection, setSelection] = useState<Pick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/jeux/pronos")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setChart(d.chart);
        setWeek(d.week);
        setMyPicks(d.myPicks);
        setLastResult(d.lastResult);
        setSignedIn(d.signedIn);
      })
      .catch(() => setError("Impossible de charger le chart. Réessaie."));
  }, []);

  function toggle(t: ChartTrack) {
    if (myPicks) return;
    sfx.click();
    setSelection((prev) => {
      const exists = prev.some((p) => p.id === t.id);
      if (exists) return prev.filter((p) => p.id !== t.id);
      if (prev.length >= 3) return prev; // 3 max
      return [...prev, { id: t.id, title: t.title, artist: t.artist }];
    });
  }

  async function submit() {
    if (selection.length !== 3 || busy) return;
    setBusy(true);
    const res = await fetch("/api/jeux/pronos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ picks: selection }),
    });
    setBusy(false);
    if (res.status === 401) {
      setError("Connecte-toi pour déposer ton pronostic.");
      return;
    }
    sfx.victory();
    setMyPicks(selection);
  }

  if (error && !chart.length) return <p className="max-w-md mx-auto text-center text-sm text-riseNeg py-20">{error}</p>;
  if (!chart.length) {
    return (
      <div className="h-64 flex items-center justify-center">
        <BrandLoader size="md" />
      </div>
    );
  }

  const pickedIds = new Set((myPicks ?? selection).map((p) => p.id));

  return (
    <section className="max-w-2xl mx-auto px-6 pt-10 pb-32">
      <a href="/jeux" className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink font-mono uppercase tracking-wide mb-8">
        <ArrowLeft size={14} /> Tous les jeux
      </a>

      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
        <Sparkles size={13} /> Coach A&R · Semaine {week.split("-W")[1]}
      </p>
      <h1 className="font-display text-2xl font-semibold mb-1">Tes 3 pronos de la semaine</h1>
      <p className="text-sm text-ink-muted mb-4">
        Lesquels de ces morceaux seront encore dans le top la semaine prochaine ? 1 pt par bon flair.
      </p>

      {lastResult && (
        <div className="solved-pop glass rounded-xl px-4 py-3 text-sm mb-6 flex items-center gap-2.5">
          <span className="font-impact text-xl text-gold">{lastResult.points}/3</span>
          <span className="text-ink-muted">
            sur tes pronos de la semaine {lastResult.week.split("-W")[1]}
            {lastResult.points === 3 ? " — flair parfait 🔥" : ""}
          </span>
        </div>
      )}

      {myPicks ? (
        <div className="glass rounded-2xl p-5 mb-6">
          <p className="font-mono text-xs text-gold uppercase tracking-[0.16em] mb-3">Ton prono est posé ✓</p>
          <div className="space-y-2">
            {myPicks.map((p) => (
              <p key={p.id} className="text-sm flex items-center gap-2">
                <Check size={14} className="text-gold shrink-0" />
                <span className="font-medium">{p.title}</span>
                <span className="text-ink-faint">— {p.artist}</span>
              </p>
            ))}
          </div>
          <p className="text-xs text-ink-faint font-mono mt-4">Résultat au début de la semaine prochaine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {chart.map((t) => {
            const picked = pickedIds.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggle(t)}
                className={`game-thumb p-3 min-h-[150px] flex flex-col justify-end text-left transition-opacity ${
                  selection.length >= 3 && !picked ? "opacity-50" : ""
                }`}
              >
                <span
                  className="thumb-bg"
                  style={{
                    background: `linear-gradient(180deg, rgba(10,7,7,0.2) 0%, rgba(10,7,7,0.92) 78%), url(${t.cover}) center/cover`,
                  }}
                  aria-hidden="true"
                />
                {picked && (
                  <span className="thumb-badge thumb-badge-top">
                    <Check size={11} /> Choisi
                  </span>
                )}
                <p className="font-display text-sm font-semibold leading-tight mb-0.5 line-clamp-2">{t.title}</p>
                <p className="text-[11px] text-ink-muted line-clamp-1">{t.artist}</p>
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-riseNeg text-center mb-4">{error}</p>}

      {!myPicks && (
        <div className="fixed bottom-0 inset-x-0 z-30 px-4 pt-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)" }}>
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/90 to-transparent -z-10" aria-hidden="true" />
          <div className="max-w-2xl mx-auto">
            <BorderMagicButton onClick={submit} fullWidth size="lg" disabled={selection.length !== 3 || busy}>
              {selection.length === 3
                ? busy ? "Envoi..." : "Valider mes 3 pronos"
                : `Choisis encore ${3 - selection.length} morceau${3 - selection.length > 1 ? "x" : ""}`}
            </BorderMagicButton>
            {!signedIn && (
              <p className="text-[11px] text-ink-faint font-mono text-center mt-2">Connexion requise pour valider.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
