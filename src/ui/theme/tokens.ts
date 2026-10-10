/**
 * Design tokens (implementation.md Section 8.2). Kept in sync with
 * tailwind.config.js so components can use either `className` or these values.
 */

export const colors = {
  accent600: "#4f46e5",
  accent700: "#4338ca",
  accent50: "#eef2ff",
  accent100: "#e0e7ff",
  accentDark600: "#818cf8",
  accentDark700: "#6366f1",
  bg: "#f8fafc",
  bgDark: "#0b1220",
  surface: "#ffffff",
  surfaceDark: "#111827",
  border: "#e2e8f0",
  borderDark: "#243044",
  text: "#0f172a",
  textDark: "#e5e7eb",
  textMuted: "#64748b",
  textMutedDark: "#94a3b8",
  danger: "#dc2626",
  dangerDark: "#f87171",
  success: "#047857",
  successDark: "#34d399",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { card: 12, sheet: 16, pill: 999 } as const;

export const typeScale = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const;

/** Minimum accessible touch target in points (NFR-07). */
export const MIN_TOUCH_TARGET = 44;
