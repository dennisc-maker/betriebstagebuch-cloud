import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f7fb",
          100: "#e7eef6",
          200: "#cadcec",
          300: "#9bbfdc",
          400: "#669dc7",
          500: "#4380b0",
          600: "#326594",
          700: "#2a5179",
          800: "#264565",
          900: "#1e3a5f",
          950: "#142540",
        },
        accent: {
          50: "#fffaeb",
          100: "#fef0c7",
          200: "#fde08a",
          300: "#fbca4d",
          400: "#fab424",
          500: "#f49b0c",
          600: "#d97706",
          700: "#b35808",
          800: "#92440e",
          900: "#78380f",
        },
        surface: "#ffffff",
        canvas: "#fafaf7",
        hairline: "rgba(30, 58, 95, 0.10)",
        ink: {
          DEFAULT: "#0f172a",
          muted: "#475569",
          subtle: "#64748b",
        },
        severity: {
          critical: "#dc2626",
          warning: "#f59e0b",
          info: "#3b82f6",
          ok: "#16a34a",
        },
        shift: {
          frueh: "#fde68a",
          mittel: "#c7d2fe",
          spaet: "#1f2937",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        display: ["Inter Tight", "Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        elevated: "0 4px 14px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
