import { ImageResponse } from "next/og";
import { findLanding, ALL_LANDINGS } from "@/lib/seo";

export const alt = "Blind test rap français — DailyRapFrance";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export function generateStaticParams() { return ALL_LANDINGS.map((l) => ({ slug: l.slug })); }

/* Image de partage par page : le titre en très grand sur le rouge de la marque — ce que
   Google Discover, WhatsApp, iMessage et X affichent quand un lien est partagé. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = findLanding(slug);
  const title = l?.title ?? "Blind test rap français";
  const sub = l?.kind === "theme" ? l.theme?.text ?? "" : "Gratuit · En ligne · Compte en 10 secondes";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 72, background: "linear-gradient(135deg, #2a0608 0%, #8a0010 55%, #f0001c 130%)", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", top: 64, left: 72, display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#fff", color: "#f0001c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900 }}>DR</div>
          <div style={{ fontSize: 30, fontWeight: 700, opacity: 0.95 }}>dailyrapfrance.best</div>
        </div>
        <div style={{ fontSize: title.length > 28 ? 68 : 88, fontWeight: 900, lineHeight: 1, letterSpacing: -3, maxWidth: 1000 }}>{title}</div>
        <div style={{ fontSize: 32, marginTop: 24, opacity: 0.9 }}>{sub}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
          {["Gratuit", "Solo ou entre potes", "Extraits de 30 s"].map((t) => (
            <div key={t} style={{ padding: "12px 22px", borderRadius: 999, background: "rgba(255,255,255,0.18)", fontSize: 24, fontWeight: 700 }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
