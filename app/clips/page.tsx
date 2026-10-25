import type { Metadata } from "next";
import { Suspense } from "react";
import ClipFeed from "@/components/ClipFeed";
import BrandLoader from "@/components/BrandLoader";

export const metadata: Metadata = {
  title: "Devine le clip — Quiz Clips Rap Français | DailyRapFrance",
  description:
    "Reconnais le rappeur à son clip : des clips officiels lancés après l'intro, 15 secondes pour répondre, façon Reels. Gratuit, dans le navigateur, compte en 10 secondes.",
  alternates: { canonical: "https://dailyrapfrance.best/clips" },
  openGraph: {
    title: "Devine le clip — DailyRapFrance",
    description: "Le quiz des clips rap français : swipe, regarde, réponds. Gratuit — compte en 10 secondes.",
    url: "https://dailyrapfrance.best/clips",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export default async function ClipsPage({ searchParams }: { searchParams: Promise<{ tag?: string; count?: string }> }) {
  const sp = await searchParams;
  const count = Math.min(Math.max(Number(sp.count) || 10, 3), 30);
  return (
    <Suspense fallback={<div className="stage grid place-items-center"><BrandLoader size="md" /></div>}>
      <ClipFeed tag={sp.tag} count={count} />
    </Suspense>
  );
}
