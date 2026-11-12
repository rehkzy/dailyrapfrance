import PartyDisplay from "@/components/PartyDisplay";
import { DRMark3D } from "@/components/BlindTestLogo";

export const metadata = {
  title: "Écran de soirée — DailyRapFrance",
  robots: { index: false }, // page utilitaire, rien à indexer
};

export default async function EcranPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;

  if (!code) {
    return (
      <main className="tv tv-center">
        <span className="w-24 h-24 mb-5"><DRMark3D size="100%" /></span>
        <h1 className="tv-h1">Écran de soirée</h1>
        <p className="tv-sub mt-3 mb-8 max-w-xl">Ouvre cette page sur la TV. Tape le code du salon affiché sur le téléphone de l&apos;hôte.</p>
        <form action="/ecran" method="get" className="flex gap-3 items-center">
          <input name="code" maxLength={6} autoFocus autoComplete="off" autoCapitalize="characters" placeholder="CODE" className="tv-pill tv-code !text-[1.6em] !px-6 !py-3 w-[7em] text-center uppercase bg-white/10 outline-none focus:border-[#F0001C]" />
          <button type="submit" className="tv-arm !text-[1.1em] !animate-none">Afficher</button>
        </form>
      </main>
    );
  }

  return <PartyDisplay code={code.toUpperCase()} />;
}
