import type { Metadata } from "next";

/*
 * /jouer rend le même blind test que /blindtest (qui porte, elle, le contenu
 * éditorial et les données structurées). Le canonical pointe vers /blindtest
 * pour concentrer tout le référencement sur une seule URL au lieu de le diviser.
 */
export const metadata: Metadata = {
  title: "Jouer au Blind Test Rap Français — Solo, Entre Potes, en Ligne, en Soirée | DailyRapFrance",
  description:
    "Lance un blind test rap français gratuit : solo, entre potes sur un téléphone, en ligne avec un code ou en matchmaking (1v1, 2v2, battle royale), ou en soirée sur la TV. Extraits audio ou clips, 80+ thèmes, compte en 10 secondes.",
  alternates: { canonical: "https://dailyrapfrance.best/blindtest" },
};

export default function JouerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
