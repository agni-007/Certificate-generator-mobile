/**
 * Mapping from core font keys to pdf-lib standard fonts (implementation.md 2.1:
 * 14 standard PDF fonts, 12 offered). Pure. Non-standard keys need bytes.
 */

import { StandardFonts } from "pdf-lib";

import type { StandardFontKey } from "../types";

const STANDARD_FONT_MAP: Record<StandardFontKey, StandardFonts> = {
  times: StandardFonts.TimesRoman,
  "times-italic": StandardFonts.TimesRomanItalic,
  "times-bold": StandardFonts.TimesRomanBold,
  "times-bolditalic": StandardFonts.TimesRomanBoldItalic,
  helvetica: StandardFonts.Helvetica,
  "helvetica-bold": StandardFonts.HelveticaBold,
  "helvetica-oblique": StandardFonts.HelveticaOblique,
  "helvetica-boldoblique": StandardFonts.HelveticaBoldOblique,
  courier: StandardFonts.Courier,
  "courier-bold": StandardFonts.CourierBold,
  "courier-oblique": StandardFonts.CourierOblique,
  "courier-boldoblique": StandardFonts.CourierBoldOblique,
};

export function isStandardFontKey(key: string): key is StandardFontKey {
  return Object.prototype.hasOwnProperty.call(STANDARD_FONT_MAP, key);
}

export function standardFontName(key: StandardFontKey): StandardFonts {
  return STANDARD_FONT_MAP[key];
}

export function standardFontKeys(): StandardFontKey[] {
  return Object.keys(STANDARD_FONT_MAP) as StandardFontKey[];
}
