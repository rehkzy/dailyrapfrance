import type { Metadata } from "next";
import { Suspense } from "react";
import BlindTestBuilder from "@/components/BlindTestBuilder";
import BrandLoader from "@/components/BrandLoader";

export const metadata: Metadata = {
  title: "Créer mon blind test — Mes morceaux, mon lien, gratuit | DailyRapFrance",
  description:
    "Construis ton propre blind test en 2 minutes : cherche les titres (ou colle une playlist Spotify ou Deezer), donne un nom, envoie le lien. Anniversaire, soirée, classe, team building — se joue sans compte, sur tout téléphone.",
  alternates: { canonical: "https://dailyrapfrance.best/blindtest/creer" },
  openGraph: {
    title: "Créer mon blind test — DailyRapFrance",
    description: "Tes morceaux, tes règles : un blind test personnalisé à partager en un lien.",
    url: "https://dailyrapfrance.best/creer",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export default function CreerPage() {
  return (
    <Suspense fallback={<div className="stage grid place-items-center"><BrandLoader size="md" /></div>}>
      <BlindTestBuilder />
    </Suspense>
  );
}
