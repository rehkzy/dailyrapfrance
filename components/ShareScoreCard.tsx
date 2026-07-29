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

      // Logo officiel DailyRapFrance — le monogramme blanc (icon.svg, fond transparent),
      // posé sur une pastille GLASS dessinée à la main : voile blanc translucide, liseré
      // clair en haut, fine bordure — le style "glass" du site, sans aucun cadre opaque
      // ni fond noir derrière le logo.
      try {
        const logo = await loadSvg("/icon.svg");
        if (cancelled) return;

        const panelW = 340;
        const panelH = 300;
        const panelX = (W - panelW) / 2;
        const panelY = 130;
        const pr = 56;

        const roundedPath = () => {
          ctx.beginPath();
          ctx.moveTo(panelX + pr, panelY);
          ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + panelH, pr);
          ctx.arcTo(panelX + panelW, panelY + panelH, panelX, panelY + panelH, pr);
          ctx.arcTo(panelX, panelY + panelH, panelX, panelY, pr);
          ctx.arcTo(panelX, panelY, panelX + panelW, panelY, pr);
          ctx.closePath();
        };

        // Voile translucide (dégradé léger pour l'effet verre)
        const glass = ctx.createLinearGradient(0, panelY, 0, panelY + panelH);
        glass.addColorStop(0, "rgba(255,255,255,0.10)");
        glass.addColorStop(1, "rgba(255,255,255,0.045)");
        roundedPath();
        ctx.fillStyle = glass;
        ctx.fill();
        // Fine bordure + reflet haut
        roundedPath();
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(panelX + pr, panelY + 1);
        ctx.lineTo(panelX + panelW - pr, panelY + 1);
        ctx.stroke();

        // Le logo blanc, centré dans la pastille
        const logoW = 240;
        const logoH = (logo.height / logo.width) * logoW;
        ctx.drawImage(logo, (W - logoW) / 2, panelY + (panelH - logoH) / 2, logoW, logoH);
      } catch {
        // pas bloquant si le logo ne charge pas — le reste de la carte reste correct
      }

      ctx.textAlign = "center";

      ctx.fillStyle = "#ffffff";
      ctx.font = '800 52px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.save();
      ctx.letterSpacing = "4px";
      ctx.fillText("DAILYRAPFRANCE", W / 2, 460);
      ctx.restore();

      ctx.fillStyle = "#F0001C";
      ctx.font = '600 32px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.save();
      ctx.letterSpacing = "8px";
      ctx.fillText("BLIND TEST RAP FRANÇAIS", W / 2, 520);
      ctx.restore();

      // Score — le héros de la carte
      ctx.fillStyle = "#ffffff";
      ctx.font = '800 320px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.fillText(String(points), W / 2, 900);

      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = '600 48px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.fillText("POINTS", W / 2, 985);

      // Détail thème / manches
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = '600 46px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.fillText(themeLabel, W / 2, 1140);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = '500 36px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.fillText(`${rounds} manches`, W / 2, 1198);

      // Bloc promo — ce que la personne qui voit l'image doit retenir : c'est jouable
      // tout de suite, gratuitement, seule ou en groupe. Séparé du score par un trait.
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.2, 1300);
      ctx.lineTo(W * 0.8, 1300);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = '700 50px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.fillText("Tu fais mieux ?", W / 2, 1395);

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = '500 36px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.fillText("+ de 25 thèmes · Ninho, JUL, PNL, 90s, drill...", W / 2, 1465);
      ctx.fillText("Solo, entre potes ou en mode Soirée sur ta TV", W / 2, 1522);
      ctx.fillText("Gratuit, sans téléchargement", W / 2, 1579);

      // CTA façon bouton — la marque en rouge, l'URL en gros, lisible même en story compressée.
      const btnW = 720;
      const btnH = 110;
      const btnX = (W - btnW) / 2;
      const btnY = 1670;
      const r = btnH / 2;
      ctx.fillStyle = "#F0001C";
      ctx.beginPath();
      ctx.moveTo(btnX + r, btnY);
      ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + btnH, r);
      ctx.arcTo(btnX + btnW, btnY + btnH, btnX, btnY + btnH, r);
      ctx.arcTo(btnX, btnY + btnH, btnX, btnY, r);
      ctx.arcTo(btnX, btnY, btnX + btnW, btnY, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = '800 44px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.fillText("dailyrapfrance.best", W / 2, btnY + btnH / 2 + 16);

      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = '500 28px "Bricolage Grotesque", system-ui, sans-serif';
      ctx.fillText("Lance une partie en 10 secondes", W / 2, btnY + btnH + 60);

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

// Charge un SVG pour le canvas en lui injectant width/height explicites — les SVG exportés
// d'Illustrator n'ont qu'un viewBox, et Safari dessine alors une image 0×0 dans drawImage.
async function loadSvg(src: string): Promise<HTMLImageElement> {
  const res = await fetch(src);
  let text = await res.text();
  const vb = text.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const w = vb ? parseFloat(vb[1]) : 512;
  const h = vb ? parseFloat(vb[2]) : 512;
  if (!/<svg[^>]*\swidth=/.test(text)) {
    text = text.replace(/<svg /, `<svg width="${w}" height="${h}" `);
  }
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  try {
    return await loadImage(url);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
