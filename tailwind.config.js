/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#4f46e5",
          50: "#eef2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          600: "#4f46e5",
          700: "#4338ca",
        },
        canvas: { DEFAULT: "#f8fafc", dark: "#0b1220" },
        surface: { DEFAULT: "#ffffff", dark: "#111827" },
        stroke: { DEFAULT: "#e2e8f0", dark: "#243044" },
        content: { DEFAULT: "#0f172a", dark: "#e5e7eb" },
        subtle: { DEFAULT: "#64748b", dark: "#94a3b8" },
        danger: { DEFAULT: "#dc2626", dark: "#f87171" },
        success: { DEFAULT: "#047857", dark: "#34d399" },
      },
      borderRadius: { card: "12px", sheet: "16px" },
    },
  },
  plugins: [],
};
