"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BlindTest from "@/components/BlindTest";
import ClipFeed from "@/components/ClipFeed";
import BrandLoader from "@/components/BrandLoader";

/*
 * /jouer — le hub unique. BlindTest gère ses propres liens profonds
 * (?mode=solo|local|online|party, ?room=CODE, ?theme=…) ; le jeu « Devine le clip »
 * (feed vertical façon Reels) vit au même endroit sous ?mode=clips, avec ?theme=<id>
 * pour filtrer le catalogue et ?count=<n> pour la longueur de la session.
 */

function Switch() {
  const sp = useSearchParams();
  if (sp.get("mode") === "clips") {
    const count = Math.min(Math.max(Number(sp.get("count")) || 10, 3), 30);
    const tag = sp.get("theme") ?? sp.get("tag") ?? undefined;
    return <ClipFeed tag={tag} count={count} />;
  }
  return <BlindTest />;
}

export default function JouerPage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 flex items-center justify-center">
          <BrandLoader size="md" />
        </div>
      }
    >
      <Switch />
    </Suspense>
  );
}
