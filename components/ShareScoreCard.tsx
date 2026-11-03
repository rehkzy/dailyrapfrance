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
          document.fonts.load('800 190px "Bricolage Grotesque"'),
          document.fonts.load('800 150px "Bricolage Grotesque"'),
          document.fonts.load('600 36px "Bricolage Grotesque"'),
          document.fonts.load('500 22px "IBM Plex Mono"'),
        ]);
      } catch {
        // la carte reste correcte en police système si le chargement échoue
      }

      // Affiche : noir plat, blocs rouges nets, filets fins, mono — la même grammaire que
      // les stories de la marque (pas de halos flous ni de pilules partout).
      const RED = "#F0001C";
      const INK = "#f5e8e8";
      const PAD = 64;
      const display = (w: number, px: number) => `${w} ${px}px "Bricolage Grotesque", system-ui, sans-serif`;
      const mono = (px: number) => `500 ${px}px "IBM Plex Mono", ui-monospace, monospace`;
      const upper = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) => {
        ctx.save(); ctx.letterSpacing = `${tracking}px`; ctx.fillText(text.toUpperCase(), x, y); ctx.restore();
      };
      const rule = (y: number, alpha = 0.16) => {
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      };
      const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      };

      ctx.fillStyle = "#0a0707";
      ctx.fillRect(0, 0, W, H);

      // Bandeau haut : wordmark à gauche, tampon mono à droite, filet dessous.
      try {
        const logo = await loadSvg("/logo.svg");
        if (cancelled) return;
        const logoH = 52;
        const logoW = (logo.width / logo.height) * logoH;
        ctx.drawImage(logo, PAD, 150, logoW, logoH);
      } catch {}
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(245,232,232,0.7)";
      ctx.font = mono(22);
      upper(ctx, "Défi de la semaine", W - PAD, 186, 4);
      rule(236);

      // Thème en mono rouge + titre affiche.
      ctx.textAlign = "left";
      ctx.fillStyle = RED;
      ctx.font = mono(22);
      upper(ctx, themeLabel.length > 34 ? themeLabel.slice(0, 33) + "…" : themeLabel, PAD, 318, 4.4);
      ctx.fillStyle = INK;
      ctx.font = display(800, 150);
      ctx.save(); ctx.letterSpacing = "-7px";
      ctx.fillText("BATS", PAD, 468);
      ctx.fillText("MON", PAD, 600);
      ctx.fillText("SCORE.", PAD, 732);
      ctx.restore();

      // Cadre score.
      const boxY = 800;
      const boxH = 330;
      ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = 2;
      roundRect(PAD, boxY, W - PAD * 2, boxH, 8); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = display(800, 190);
      ctx.save(); ctx.letterSpacing = "-9px";
      ctx.fillText(points.toLocaleString("fr-FR"), PAD + 40, boxY + 190);
      ctx.restore();
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(245,232,232,0.6)";
      ctx.font = mono(24);
      upper(ctx, "pts", W - PAD - 40, boxY + 186, 4);
      // Barre de manches (une case par manche, les dernières en gris si > 10 inconnu → tout rouge).
      const cells = Math.min(Math.max(rounds, 1), 12);
      const cellW = 46, gap = 8;
      for (let i = 0; i < cells; i++) {
        ctx.fillStyle = RED;
        ctx.fillRect(PAD + 40 + i * (cellW + gap), boxY + 250, cellW, 14);
      }
      ctx.fillStyle = "rgba(245,232,232,0.8)";
      ctx.font = mono(24);
      upper(ctx, `${rounds} manches`, W - PAD - 40, boxY + 266, 2.4);

      // Accroche.
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(245,232,232,0.85)";
      ctx.font = display(600, 36);
      ctx.fillText("Même thème, mêmes sons, une seule tentative.", PAD, 1210);
      ctx.fillText("Le classement se ferme dimanche soir.", PAD, 1262);

      // Encart concours (rouge).
      const cY = 1320, cH = 150;
      ctx.fillStyle = RED;
      roundRect(PAD, cY, W - PAD * 2, cH, 8); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(PAD + 32, cY + 56, 150, 40);
      ctx.fillStyle = "#8a0010";
      ctx.font = mono(18);
      ctx.textAlign = "center";
      upper(ctx, "Concours", PAD + 32 + 75, cY + 83, 3.2);
      ctx.textAlign = "left";
      ctx.fillStyle = "#fff";
      ctx.font = display(600, 26);
      ctx.fillText("2 places pour Kaaris au Stade de France :", PAD + 210, cY + 62);
      ctx.fillText("invite tes potes avec ton lien, chaque inscrit = 1 chance.", PAD + 210, cY + 102);

      // CTA blanc + ligne lien.
      const btnY = 1560, btnH = 128;
      ctx.fillStyle = "#fff";
      roundRect(PAD, btnY, W - PAD * 2, btnH, 8); ctx.fill();
      ctx.fillStyle = "#0a0707";
      ctx.font = display(800, 42);
      ctx.save(); ctx.letterSpacing = "-1px";
      ctx.fillText("RELEVER LE DÉFI", PAD + 40, btnY + 79);
      ctx.restore();
      ctx.strokeStyle = "#0a0707"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
      const ax = W - PAD - 64, ay = btnY + btnH / 2;
      ctx.beginPath(); ctx.moveTo(ax - 22, ay); ctx.lineTo(ax + 22, ay); ctx.moveTo(ax + 4, ay - 18); ctx.lineTo(ax + 22, ay); ctx.lineTo(ax + 4, ay + 18); ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(245,232,232,0.7)";
      ctx.font = mono(22);
      upper(ctx, "dailyrapfrance.best · gratuit, compte en 10 s", W / 2, btnY + btnH + 62, 3);

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
            text: `${points} points au blind test rap français. Bats mon score si tu peux 🔥 dailyrapfrance.best`,
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
