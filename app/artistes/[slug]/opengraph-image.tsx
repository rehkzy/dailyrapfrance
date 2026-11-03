import { ImageResponse } from "next/og";
import { ARTISTS, findArtist } from "@/lib/artists";
import { resolveArtist, artistTopTracksFull } from "@/lib/deezerArtist";

export const alt = "Top sons — DailyRapFrance";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export function generateStaticParams() { return ARTISTS.map((a) => ({ slug: a.slug })); }

const SITE = "https://dailyrapfrance.best";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = findArtist(slug);
  const name = a?.name ?? "Rap français";
  const artist = a ? await resolveArtist(a.name) : null;
  const tracks = artist ? await artistTopTracksFull(artist.id, 3) : [];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 64px 48px", background: "#0a0707", color: "#f5e8e8", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 22, borderBottom: "2px solid rgba(255,255,255,0.16)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src={`${SITE}/icon-192.png`} width={48} height={48} style={{ borderRadius: 11 }} />
            <div style={{ fontSize: 28, fontWeight: 700 }}>DailyRapFrance</div>
          </div>
          <div style={{ fontSize: 18, letterSpacing: 3, textTransform: "uppercase", color: "rgba(245,232,232,0.7)" }}>{`Top sons · ${new Date().getFullYear()}`}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {artist?.picture_big ? <img src={artist.picture_big} width={220} height={220} style={{ borderRadius: 32, objectFit: "cover" }} /> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 26, color: "#ff3b4e", fontWeight: 700 }}>Les meilleurs sons de</div>
            <div style={{ fontSize: name.length > 14 ? 76 : 100, fontWeight: 900, lineHeight: 0.95, letterSpacing: -3 }}>{name}</div>
            {tracks.length ? <div style={{ fontSize: 24, color: "rgba(245,232,232,0.8)", marginTop: 6 }}>{tracks.map((t, i) => `${i + 1}. ${t.title}`).join("   ·   ")}</div> : null}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 22, borderTop: "2px solid rgba(255,255,255,0.16)" }}>
          <div style={{ fontSize: 22, color: "rgba(245,232,232,0.85)" }}>Top 10 · discographie · blind test gratuit</div>
          <div style={{ fontSize: 20, letterSpacing: 2, textTransform: "uppercase", color: "#fff", background: "#f0001c", padding: "12px 18px", borderRadius: 6 }}>dailyrapfrance.best</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
