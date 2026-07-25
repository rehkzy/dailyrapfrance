import type { Config } from "tailwindcss";

// Design system DRF — voir 00_MASTER_PROMPT.md §P5 (Linear, Apple, Vercel, Arc)
// Palette : terminal sombre, un seul accent chaud (or/certification), un signal froid (data live)
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0A0B0D",
        surface: "#131519",
        "surface-raised": "#191C21",
        line: "#22262B",
        "line-strong": "#31363D",
        ink: "#F2F1ED",
        "ink-muted": "#9BA1A8",
        "ink-faint": "#5B6167",
        gold: "#E8A93B",     // accent — certifications, hype, signature
        signal: "#4EA8FF",   // données live, courbes, sparklines
        risePos: "#4CC38A",
        riseNeg: "#E5674A",
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
