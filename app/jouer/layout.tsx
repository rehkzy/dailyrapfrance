import type { Metadata } from "next";

/*
 * /jouer rend le même blind test que /blindtest (qui porte, elle, le contenu
 * éditorial et les données structurées). Le canonical pointe vers /blindtest
 * pour concentrer tout le référencement sur une seule URL au lieu de le diviser.
 */
export const metadata: Metadata = {
  title: "Jouer au Blind Test Rap Français — Gratuit, Compte en 10 Secondes | DailyRapFrance",
  description:
    "Lance une partie de blind test rap français : solo, entre potes sur le même écran, à distance avec un code, ou en soirée sur la TV. Gratuit — compte en 10 secondes.",
  alternates: { canonical: "https://dailyrapfrance.best/blindtest" },
};

export default function JouerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
