/**
 * Bundled font catalogue and coverage (implementation.md Phase 3).
 * Pure metadata only: the platform FontRegistry maps `fileName` to bundled
 * assets; this module never imports react-native/expo and never loads bytes.
 */

import { isStandardFontKey } from "./pdf/fonts";
import { classifyChar, type FontCoverage, type Script } from "./shaping";
import type { FontKey } from "./types";

export interface BundledFont {
  id: string;
  key: `bundled:${string}`;
  label: string;
  family: string;
  scripts: Script[];
  /** Base name of the OFL font file under `src/assets/fonts/`. */
  fileName: string;
}

export const BUNDLED_FONTS: BundledFont[] = [
  {
    id: "latin-serif",
    key: "bundled:latin-serif",
    label: "Noto Serif",
    family: "Noto Serif",
    scripts: ["latin"],
    fileName: "NotoSerif-Regular.ttf",
  },
  {
    id: "latin-sans",
    key: "bundled:latin-sans",
    label: "Noto Sans",
    family: "Noto Sans",
    scripts: ["latin"],
    fileName: "NotoSans-Regular.ttf",
  },
  {
    id: "latin-script",
    key: "bundled:latin-script",
    label: "Great Vibes",
    family: "Great Vibes",
    scripts: ["latin"],
    fileName: "GreatVibes-Regular.ttf",
  },
  {
    id: "latin-mono",
    key: "bundled:latin-mono",
    label: "Noto Sans Mono",
    family: "Noto Sans Mono",
    scripts: ["latin"],
    fileName: "NotoSansMono-Regular.ttf",
  },
  {
    id: "malayalam",
    key: "bundled:malayalam",
    label: "Noto Sans Malayalam",
    family: "Noto Sans Malayalam",
    scripts: ["malayalam", "latin"],
    fileName: "NotoSansMalayalam-Regular.ttf",
  },
  {
    id: "tamil",
    key: "bundled:tamil",
    label: "Noto Sans Tamil",
    family: "Noto Sans Tamil",
    scripts: ["tamil", "latin"],
    fileName: "NotoSansTamil-Regular.ttf",
  },
  {
    id: "devanagari",
    key: "bundled:devanagari",
    label: "Noto Sans Devanagari",
    family: "Noto Sans Devanagari",
    scripts: ["devanagari", "latin"],
    fileName: "NotoSansDevanagari-Regular.ttf",
  },
  {
    id: "bengali",
    key: "bundled:bengali",
    label: "Noto Sans Bengali",
    family: "Noto Sans Bengali",
    scripts: ["bengali", "latin"],
    fileName: "NotoSansBengali-Regular.ttf",
  },
  {
    id: "telugu",
    key: "bundled:telugu",
    label: "Noto Sans Telugu",
    family: "Noto Sans Telugu",
    scripts: ["telugu", "latin"],
    fileName: "NotoSansTelugu-Regular.ttf",
  },
  {
    id: "kannada",
    key: "bundled:kannada",
    label: "Noto Sans Kannada",
    family: "Noto Sans Kannada",
    scripts: ["kannada", "latin"],
    fileName: "NotoSansKannada-Regular.ttf",
  },
  {
    id: "gujarati",
    key: "bundled:gujarati",
    label: "Noto Sans Gujarati",
    family: "Noto Sans Gujarati",
    scripts: ["gujarati", "latin"],
    fileName: "NotoSansGujarati-Regular.ttf",
  },
  {
    id: "gurmukhi",
    key: "bundled:gurmukhi",
    label: "Noto Sans Gurmukhi",
    family: "Noto Sans Gurmukhi",
    scripts: ["gurmukhi", "latin"],
    fileName: "NotoSansGurmukhi-Regular.ttf",
  },
];

const BY_ID = new Map(BUNDLED_FONTS.map((f) => [f.id, f]));
const BY_KEY = new Map(BUNDLED_FONTS.map((f) => [f.key, f]));

export function bundledKey(id: string): `bundled:${string}` {
  return `bundled:${id}`;
}

/** Look up a bundled font by either `"malayalam"` or `"bundled:malayalam"`. */
export function findBundledFont(idOrKey: string): BundledFont | undefined {
  return BY_ID.get(idOrKey) ?? BY_KEY.get(idOrKey as `bundled:${string}`);
}

export function bundledFontKeys(): `bundled:${string}`[] {
  return BUNDLED_FONTS.map((f) => f.key);
}

/** First bundled font that can display `script`. */
export function bundledFontForScript(script: Script): BundledFont | undefined {
  return BUNDLED_FONTS.find((f) => f.scripts.includes(script));
}

const STANDARD_COVERAGE: FontCoverage = { scripts: ["latin"], standard: true };
const UNKNOWN_COVERAGE: FontCoverage = { scripts: [] };

/**
 * Coverage of a font key. Standard fonts use WinAnsi (Latin only); bundled
 * fonts use their declared script list; custom fonts are unknown here (the
 * platform FontRegistry parses their cmap and supplies concrete coverage).
 */
export function fontCoverage(font: FontKey): FontCoverage | undefined {
  if (isStandardFontKey(font)) return STANDARD_COVERAGE;
  if (font.startsWith("bundled:")) {
    const bundled = findBundledFont(font);
    return bundled ? { scripts: bundled.scripts } : UNKNOWN_COVERAGE;
  }
  return undefined;
}

/** True when `font` can display every script present in `text`. */
export function fontSupports(font: FontKey, text: string): boolean {
  const coverage = fontCoverage(font);
  if (!coverage) return false; // custom fonts: caller must supply coverage
  for (const char of text) {
    const script = classifyChar(char);
    if (script === "common") continue;
    if (script === "other") return false;
    if (!coverage.scripts.includes(script)) return false;
  }
  return true;
}
