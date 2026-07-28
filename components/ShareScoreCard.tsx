"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";

const W = 1080;
const H = 1920;

export default function ShareScoreCard({
  points,
  themeLabel,
  rounds,
}: {
  points: number;
  themeLabel: string;
  rounds: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [canNativeShareFiles, setCanNativeShareFiles] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    async function draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
      canvas.width = W;
      canvas.height = H;

      // Charge la display de la marque avant de dessiner — sinon le canvas retombe
      // silencieusement sur la police système.
      try {
        await Promise.all([
          document.fonts.load('800 340px "Bricolage Grotesque"'),
          document.fonts.load('600 46px "Bricolage Grotesque"'),
        ]);
      } catch {
        // la carte reste correcte en police système si le chargement échoue
      }

      // Fond — dégradé de marque, plus un halo pour ne pas s'aplatir en dégradé trop propre.
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#1a0a0a");
      bg.addColorStop(0.55, "#3a0a0a");
      bg.addColorStop(1, "#0a0707");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const glow = ctx.createRadialGradient(W / 2, H * 0.32, 40, W / 2, H * 0.32, W * 0.75);
      glow.addColorStop(0, "rgba(240,0,28,0.55)");
      glow.addColorStop(1, "rgba(240,0,28,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Emblème
      try {
        const logo = await loadImage("/blindtest-mark.svg");
        if (cancelled) return;
        const logoW = 160;
        const logoH = (logo.height / logo.width) * logoW;
        ctx.globalAlpha = 0.95;
        ctx.drawImage(logo, (W - logoW) / 2, 210, logoW, logoH);
        ctx.globalAlpha = 1;
      } catch {
        // pas bloquant si le logo ne charge pas — le reste de la carte reste correct
      }

      ctx.textAlign = "center";

      ctx.fillStyle = "#F0001C";
      ctx.font = '600 34px \"Bricolage Grotesque\", system-ui, sans-serif';
      ctx.save();
      ctx.letterSpacing = "8px";
      ctx.fillText("BLIND TEST RAP FRANÇAIS", W / 2, 470);
      ctx.restore();

      ctx.fillStyle = "#ffffff";
      ctx.font = '800 340px \"Bricolage Grotesque\", system-ui, sans-serif';
      ctx.fillText(String(points), W / 2, 860);

      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = '600 48px \"Bricolage Grotesque\", system-ui, sans-serif';
      ctx.fillText("POINTS", W / 2, 950);

      // Détail thème / manches
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = '600 46px \"Bricolage Grotesque\", system-ui, sans-serif';
      ctx.fillText(themeLabel, W / 2, 1160);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = '500 36px \"Bricolage Grotesque\", system-ui, sans-serif';
      ctx.fillText(`${rounds} manches`, W / 2, 1220);

      // Pied de carte
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = '700 40px \"Bricolage Grotesque\", system-ui, sans-serif';
      ctx.fillText("dailyrapfrance.best/jouer", W / 2, H - 140);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = '500 30px \"Bricolage Grotesque\", system-ui, sans-serif';
      ctx.fillText("Toi aussi, teste ton niveau", W / 2, H - 90);

      if (!cancelled) setReady(true);
    }

    draw(canvas, ctx);
    return () => {
      cancelled = true;
    };
  }, [points, themeLabel, rounds]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "share" in navigator && "canShare" in navigator) {
      setCanNativeShareFiles(true);
    }
  }, []);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = "blind-test-drf-score.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "blind-test-drf-score.png", { type: "image/png" });
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "DailyRapFrance — Blind Test",
            text: `${points} points au blind test rap français ! Viens tester ton niveau 🔥`,
          });
          return;
        }
      } catch {
        // annulé par la personne — pas une erreur
        return;
      }
      download();
    }, "image/png");
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[220px] rounded-2xl overflow-hidden border border-white/10 shadow-lg mb-4" style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas ref={canvasRef} className="w-full h-full" aria-label="Visuel de score à partager" />
        {!ready && <div className="absolute inset-0 bg-surface animate-pulse" aria-hidden="true" />}
      </div>
      <div className="flex items-center gap-2.5">
        <button
          onClick={download}
          disabled={!ready}
          className="tap-press inline-flex items-center gap-1.5 h-10 px-4 rounded-full glass text-sm font-medium text-ink-muted hover:text-gold disabled:opacity-50 transition-colors"
        >
          <Download size={15} />
          Télécharger
        </button>
        {canNativeShareFiles && (
          <button
            onClick={share}
            disabled={!ready}
            className="tap-press inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-gold hover:bg-glow text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <Share2 size={15} />
            Partager en story
          </button>
        )}
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
