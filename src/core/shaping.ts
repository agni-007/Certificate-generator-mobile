/**
 * Script detection and shaped-pipeline routing (implementation.md 4.3 / 7.4).
 * Pure TypeScript: no react-native/expo imports.
 *
 * `needsShaping` decides between the vector pipeline (pdf-lib draws real text)
 * and the shaped pipeline (Skia rasterises just the name) per name.
 */

export type Script =
  | "latin"
  | "greek"
  | "cyrillic"
  | "hebrew"
  | "arabic"
  | "devanagari"
  | "bengali"
  | "gurmukhi"
  | "gujarati"
  | "oriya"
  | "tamil"
  | "telugu"
  | "kannada"
  | "malayalam"
  | "sinhala"
  | "thai"
  | "lao"
  | "myanmar"
  | "khmer";

/** `common` = script-neutral (space, punctuation, digits, marks). */
export type CharClass = Script | "common" | "other";

/** Font coverage descriptor: which scripts a font can display. */
export interface FontCoverage {
  scripts: Script[];
  /** Standard PDF fonts use WinAnsi instead of a cmap. */
  standard?: boolean;
}

/** Scripts that require HarfBuzz shaping/ligature formation. */
export const COMPLEX_SCRIPTS: ReadonlySet<Script> = new Set<Script>([
  "devanagari",
  "bengali",
  "gurmukhi",
  "gujarati",
  "oriya",
  "tamil",
  "telugu",
  "kannada",
  "malayalam",
  "sinhala",
  "arabic",
  "thai",
  "lao",
  "myanmar",
  "khmer",
]);

interface Range {
  script: Script;
  start: number;
  end: number;
}

const SCRIPT_RANGES: Range[] = [
  { script: "latin", start: 0x0041, end: 0x005a },
  { script: "latin", start: 0x0061, end: 0x007a },
  { script: "latin", start: 0x00c0, end: 0x024f },
  { script: "latin", start: 0x0250, end: 0x02af },
  { script: "latin", start: 0x1e00, end: 0x1eff },
  { script: "greek", start: 0x0370, end: 0x03ff },
  { script: "greek", start: 0x1f00, end: 0x1fff },
  { script: "cyrillic", start: 0x0400, end: 0x04ff },
  { script: "cyrillic", start: 0x0500, end: 0x052f },
  { script: "hebrew", start: 0x0590, end: 0x05ff },
  { script: "arabic", start: 0x0600, end: 0x06ff },
  { script: "arabic", start: 0x0750, end: 0x077f },
  { script: "arabic", start: 0x08a0, end: 0x08ff },
  { script: "arabic", start: 0xfb50, end: 0xfdff },
  { script: "arabic", start: 0xfe70, end: 0xfeff },
  { script: "devanagari", start: 0x0900, end: 0x097f },
  { script: "devanagari", start: 0xa8e0, end: 0xa8ff },
  { script: "devanagari", start: 0x1cd0, end: 0x1cff },
  { script: "bengali", start: 0x0980, end: 0x09ff },
  { script: "gurmukhi", start: 0x0a00, end: 0x0a7f },
  { script: "gujarati", start: 0x0a80, end: 0x0aff },
  { script: "oriya", start: 0x0b00, end: 0x0b7f },
  { script: "tamil", start: 0x0b80, end: 0x0bff },
  { script: "telugu", start: 0x0c00, end: 0x0c7f },
  { script: "kannada", start: 0x0c80, end: 0x0cff },
  { script: "malayalam", start: 0x0d00, end: 0x0d7f },
  { script: "sinhala", start: 0x0d80, end: 0x0dff },
  { script: "thai", start: 0x0e00, end: 0x0e7f },
  { script: "lao", start: 0x0e80, end: 0x0eff },
  { script: "myanmar", start: 0x1000, end: 0x109f },
  { script: "khmer", start: 0x1780, end: 0x17ff },
];

const COMMON_RANGES: Range[] = [
  { script: "latin", start: 0x0000, end: 0x0040 },
  { script: "latin", start: 0x005b, end: 0x0060 },
  { script: "latin", start: 0x007b, end: 0x00bf },
  { script: "latin", start: 0x2000, end: 0x206f },
  { script: "latin", start: 0x2070, end: 0x20cf },
  { script: "latin", start: 0x2100, end: 0x214f },
  { script: "latin", start: 0x2190, end: 0x2bff },
  { script: "latin", start: 0x2e00, end: 0x2e7f },
  { script: "latin", start: 0x3000, end: 0x303f },
  { script: "latin", start: 0xfe00, end: 0xfe0f },
  { script: "latin", start: 0xfeff, end: 0xfeff },
];

function inRanges(cp: number, ranges: Range[]): boolean {
  return ranges.some((r) => cp >= r.start && cp <= r.end);
}

/** Classify a code point into a script, or `common`/`other`. */
export function classifyCodePoint(cp: number): CharClass {
  if (!Number.isFinite(cp) || cp < 0) return "other";
  if (cp >= 0x0300 && cp <= 0x036f) return "common"; // combining diacritics
  for (const { script, start, end } of SCRIPT_RANGES) {
    if (cp >= start && cp <= end) {
      // The Latin range borrowed for common punctuation must not swallow
      // actual symbols into "latin"; COMMON_RANGES takes precedence.
      if (script === "latin" && inRanges(cp, COMMON_RANGES)) return "common";
      return script;
    }
  }
  if (inRanges(cp, COMMON_RANGES)) return "common";
  return "other";
}

/** Classify the first code point of `char` (a single code point). */
export function classifyChar(char: string): CharClass {
  const cp = char.codePointAt(0);
  return cp === undefined ? "other" : classifyCodePoint(cp);
}

/**
 * Scripts required to render `text`, excluding script-neutral characters.
 * Includes `"other"` when the text contains unsupported/unknown code points.
 */
export function scriptsInText(text: string): Set<Exclude<CharClass, "common">> {
  const scripts = new Set<Exclude<CharClass, "common">>();
  for (const char of text) {
    const cls = classifyChar(char);
    if (cls !== "common") scripts.add(cls);
  }
  return scripts;
}

/** True when the text contains no characters at all (or only common ones). */
export function isScriptless(text: string): boolean {
  return scriptsInText(text).size === 0;
}

/** Whether a coverage descriptor can display every script present in `text`. */
export function coverageCoversText(coverage: FontCoverage, text: string): boolean {
  for (const script of scriptsInText(text)) {
    if (script === "other") return false;
    if (!coverage.scripts.includes(script)) return false;
  }
  return true;
}

export interface NeedsShapingOptions {
  /** Known coverage of the selected font; enables "font lacks this char" routing. */
  coverage?: FontCoverage;
}

/**
 * Per-name routing: true when the name must go through the shaped pipeline.
 * Any complex script always qualifies; otherwise, if the selected font's
 * coverage is known and it cannot display a character, the name is routed to a
 * font that can (shaped pipeline).
 */
export function needsShaping(text: string, opts: NeedsShapingOptions = {}): boolean {
  const scripts = scriptsInText(text);
  if (scripts.size === 0) return false;
  for (const script of scripts) {
    if (script !== "other" && COMPLEX_SCRIPTS.has(script)) return true;
  }
  if (opts.coverage && !coverageCoversText(opts.coverage, text)) return true;
  return false;
}

/** The complex script in `text` (for choosing a fallback font), or null. */
export function complexScriptIn(text: string): Script | null {
  for (const script of scriptsInText(text)) {
    if (script !== "other" && COMPLEX_SCRIPTS.has(script)) return script;
  }
  return null;
}
