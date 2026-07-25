import type { Config } from "tailwindcss";

// Design system DRF — charte graphique officielle DailyRapFrance
// Rouge Daily #F0001C (principal), Rouge Article #780101 (secondaire), Noir #000000, Blanc, Gris Sable #F5E8E8
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#000000",
        surface: "#141414",
        "surface-raised": "#1c1c1c",
        line: "#262626",
        "line-strong": "#363636",
        ink: "#F5E8E8",
        "ink-muted": "#9BA1A8",
        "ink-faint": "#5B6167",
        gold: "#F0001C",      // Rouge Daily — accent, certifications, hype, signature
        signal: "#780101",    // Rouge Article — secondaire, halos, profondeur
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
