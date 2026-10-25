import { permanentRedirect } from "next/navigation";

// « Devine le clip » vit désormais dans le hub /jouer (?mode=clips). On garde l'URL
// courte pour les liens déjà partagés.
export default async function ClipsPage({ searchParams }: { searchParams: Promise<{ tag?: string; theme?: string; count?: string }> }) {
  const sp = await searchParams;
  const p = new URLSearchParams({ mode: "clips" });
  const theme = sp.theme ?? sp.tag;
  if (theme) p.set("theme", theme);
  if (sp.count) p.set("count", sp.count);
  permanentRedirect(`/jouer?${p}`);
}
