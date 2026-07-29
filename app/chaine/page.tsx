import type { Metadata } from "next";
import FeaturingChain from "@/components/FeaturingChain";
import { DRMark3D } from "@/components/BlindTestLogo";

export const metadata: Metadata = {
  title: "Chaîne de featurings — DailyRapFrance",
  description: "Relie deux artistes du rap français par une chaîne de vrais featurings.",
};

export default function ChainPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <div className="aurora-fixed" aria-hidden="true" />
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-10 sm:pt-16 pb-20">
        <div className="flex justify-center mb-8">
          <span className="block w-16 h-16">
            <DRMark3D size="100%" />
          </span>
        </div>
        <FeaturingChain />
      </section>
    </main>
  );
}
