/**
 * TextStyle creation, colour normalisation and validation
 * (implementation.md 2.1 and 6.1). Pure.
 */

import { DEFAULT_STYLE, LIMITS, STANDARD_FONTS } from "./constants";
import { AppError } from "./errors";
import { clamp } from "./math";
import type { Alignment, FontKey, TextStyle } from "./types";

const STANDARD_FONT_KEYS: ReadonlySet<string> = new Set(STANDARD_FONTS.map((f) => f.key));
const ALIGNMENTS: readonly Alignment[] = ["left", "center", "right"];

export interface Rgb255 {
  r: number;
  g: number;
  b: number;
}

function toHex(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

export function rgbToHex({ r, g, b }: Rgb255): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): Rgb255 {
  const normalized = normalizeColor(hex);
  if (normalized === null) throw new AppError("BAD_COLOR");
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

/** `#rgb`, `#rrggbb`, `rgb(r,g,b)` or `rgba(r,g,b,a)` -> `#rrggbb`, else null. */
export function normalizeColor(input: string): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();

  const shortHex = /^#([0-9a-fA-F]{3})$/.exec(value);
  if (shortHex) {
    const chars = (shortHex[1] as string).split("");
    return `#${chars[0]}${chars[0]}${chars[1]}${chars[1]}${chars[2]}${chars[2]}`.toLowerCase();
  }

  const longHex = /^#([0-9a-fA-F]{6})$/.exec(value);
  if (longHex) return `#${(longHex[1] as string).toLowerCase()}`;

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/i.exec(
    value,
  );
  if (rgb) {
    // Out-of-range channels are clamped into 0..255.
    return rgbToHex({
      r: parseInt(rgb[1] as string, 10),
      g: parseInt(rgb[2] as string, 10),
      b: parseInt(rgb[3] as string, 10),
    });
  }

  return null;
}

export function isValidColor(input: string): boolean {
  return normalizeColor(input) !== null;
}

export function isValidFontKey(font: unknown): font is FontKey {
  if (typeof font !== "string") return false;
  if (STANDARD_FONT_KEYS.has(font)) return true;
  if (font.startsWith("custom:")) return font.slice("custom:".length).length > 0;
  if (font.startsWith("bundled:")) return font.slice("bundled:".length).length > 0;
  return false;
}

export function isValidAlignment(value: unknown): value is Alignment {
  return typeof value === "string" && (ALIGNMENTS as readonly string[]).includes(value);
}

/**
 * Merge a partial style over the defaults, clamping numeric ranges and
 * validating font/colour/alignment. Throws `AppError` on invalid input.
 */
export function buildStyle(partial: Partial<TextStyle> = {}): TextStyle {
  const font = partial.font ?? DEFAULT_STYLE.font;
  if (!isValidFontKey(font)) throw new AppError("BAD_FONT");

  const alignment = partial.alignment ?? DEFAULT_STYLE.alignment;
  if (!isValidAlignment(alignment)) throw new AppError("BAD_ALIGNMENT");

  const rawColor = partial.color ?? DEFAULT_STYLE.color;
  const color = normalizeColor(rawColor);
  if (color === null) throw new AppError("BAD_COLOR");

  const style: TextStyle = {
    x: clamp(partial.x ?? DEFAULT_STYLE.x, 0, 100),
    y: clamp(partial.y ?? DEFAULT_STYLE.y, 0, 100),
    font,
    fontSize: clamp(
      partial.fontSize ?? DEFAULT_STYLE.fontSize,
      LIMITS.minFontSize,
      LIMITS.maxFontSize,
    ),
    color,
    alignment,
  };

  if (partial.maxWidthPct !== undefined) {
    style.maxWidthPct = clamp(partial.maxWidthPct, 10, 100);
  }

  return style;
}
