import type { Metadata } from "next";
import DailyGuess from "@/components/DailyGuess";
import { DRMark3D } from "@/components/BlindTestLogo";

export const metadata: Metadata = {
  title: "Devine du jour — DailyRapFrance",
  description: "Un seul son par jour, 6 essais, l'extrait s'allonge à chaque erreur. Le même morceau pour tout le monde — reviens demain pour le suivant.",
};

export default function DevinePage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <div className="aurora-fixed" aria-hidden="true" />
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-10 sm:pt-16 pb-20">
        <div className="flex justify-center mb-8">
          <span className="block w-16 h-16">
            <DRMark3D size="100%" />
          </span>
        </div>
        <DailyGuess />
      </section>
    </main>
  );
}
