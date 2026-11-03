import { ImageResponse } from "next/og";
import { findLanding, ALL_LANDINGS } from "@/lib/seo";

export const alt = "Blind test rap français — DailyRapFrance";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export function generateStaticParams() { return ALL_LANDINGS.map((l) => ({ slug: l.slug })); }

const SITE = "https://dailyrapfrance.best";

/* Image de partage par page thème/artiste — même grammaire que les affiches de la marque :
   noir plat, filets fins, titre très grand, bloc rouge pour l'URL, vraie tuile DR. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = findLanding(slug);
  const title = l?.title ?? "Blind test rap français";
  const sub = l?.kind === "theme" ? l.theme?.text ?? "" : "Gratuit · En ligne · Compte en 10 secondes";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 64px 48px", background: "#0a0707", color: "#f5e8e8", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 22, borderBottom: "2px solid rgba(255,255,255,0.16)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src={`${SITE}/icon-192.png`} width={48} height={48} style={{ borderRadius: 11 }} />
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>DailyRapFrance</div>
          </div>
          <div style={{ fontSize: 18, letterSpacing: 3, textTransform: "uppercase", color: "rgba(245,232,232,0.7)" }}>Blind test rap français</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: title.length > 26 ? 76 : 104, fontWeight: 900, lineHeight: 0.92, letterSpacing: -4, textTransform: "uppercase", maxWidth: 1060 }}>{title}</div>
          {sub ? <div style={{ fontSize: 28, color: "rgba(245,232,232,0.8)", maxWidth: 1000 }}>{sub}</div> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 22, borderTop: "2px solid rgba(255,255,255,0.16)" }}>
          <div style={{ fontSize: 22, color: "rgba(245,232,232,0.85)" }}>Gratuit · solo, entre potes, en ligne, soirée TV · compte en 10 s</div>
          <div style={{ fontSize: 20, letterSpacing: 2, textTransform: "uppercase", color: "#fff", background: "#f0001c", padding: "12px 18px", borderRadius: 6 }}>dailyrapfrance.best</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
