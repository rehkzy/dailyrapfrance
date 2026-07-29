import PartyDisplay from "@/components/PartyDisplay";

export const metadata = {
  title: "Écran de salon — DailyRapFrance",
  robots: { index: false }, // page utilitaire, rien à indexer
};

export default async function EcranPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;

  if (!code) {
    return (
      <main className="min-h-screen bg-bg text-ink flex items-center justify-center px-6 text-center">
        <p className="text-ink-muted">
          Ajoute le code du salon à l&apos;adresse : <span className="font-mono text-gold">/ecran?code=ABCD</span>
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg text-ink relative overflow-hidden">
      <div className="aurora-fixed" aria-hidden="true" />
      <div className="relative z-10">
        <PartyDisplay code={code.toUpperCase()} />
      </div>
    </main>
  );
}
