"use client";

import { Suspense } from "react";
import BlindTest from "@/components/BlindTest";
import BrandLoader from "@/components/BrandLoader";

/*
 * /jouer — monte directement le blind test, seul jeu du site pour le moment.
 * L'ancien hub façon Netflix (rangées de covers, top des jeux) est retiré : un
 * hub pour un seul jeu ajoutait un clic et de la confusion. Les liens profonds
 * restent valides tels quels (?mode=local|online|party, ?room=CODE, ?play=1),
 * puisque c'est BlindTest qui lit ces paramètres.
 * Pour re-proposer plusieurs jeux plus tard : restaurer le hub depuis l'historique
 * git (version "Netflix" de cette page) et rebrancher la condition wantsGame.
 */

export default function JouerPage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 flex items-center justify-center">
          <BrandLoader size="md" />
        </div>
      }
    >
      <BlindTest />
    </Suspense>
  );
}
