import type { MetadataRoute } from "next";

// Manifest PWA — permet "Ajouter à l'écran d'accueil" avec le logo du jeu, en plein
// écran (standalone), démarrant directement sur le hub /jouer.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blind Test Rap Français — DailyRapFrance",
    short_name: "Blind Test",
    description: "Le blind test rap français : gratuit, solo ou entre potes.",
    start_url: "/jouer",
    display: "standalone",
    background_color: "#0A0707",
    theme_color: "#0A0707",
    orientation: "portrait",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
