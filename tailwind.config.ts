import type { Config } from "tailwindcss";

// Design system DRF — charte graphique officielle DailyRapFrance
// Rouge Daily #F0001C (principal), Rouge Article #780101 (secondaire), Noir #000000, Blanc, Gris Sable #F5E8E8
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0A0707",           // noir chaud (pointe de rouge), pas un gris neutre générique
        "bg-deep": "#050303",    // pour les sections à forte présence de marque
        surface: "#171111",
        "surface-raised": "#211818",
        line: "#2b2020",
        "line-strong": "#3d2b2b",
        ink: "#F5E8E8",
        "ink-muted": "#9BA1A8",
        "ink-faint": "#5B6167",
        gold: "#F0001C",      // Rouge Daily — accent, certifications, hype, signature
        signal: "#780101",    // Rouge Article — secondaire, halos, profondeur
        glow: "#FF3B4E",       // Rouge Daily éclairci — halos, glow de survol, live
        risePos: "#4CC38A",
        riseNeg: "#E8894A",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-data)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
