/**
 * Core limits, defaults and the standard-font table.
 * Pure TypeScript: no react-native/expo imports.
 */

import type { FontKey, OutputSettings, StandardFontKey, TextStyle } from "./types";

export const LIMITS = {
  /** 25 MB (implementation.md 2.1). */
  maxTemplateBytes: 25 * 1024 * 1024,
  /** 10 MB guard for spreadsheet imports. */
  maxSheetBytes: 10 * 1024 * 1024,
  maxNameLength: 120,
  maxNames: 2000,
  minFontSize: 6,
  maxFontSize: 200,
  defaultFontSize: 37,
  minDpi: 72,
  maxDpi: 600,
  defaultDpi: 300,
  /** Long side cap for normalised image templates (3508 px ≈ A4 @ 300 DPI). */
  maxImageLongSidePx: 3508,
  safeNameMaxLength: 80,
  sheetRowScanCap: 100_000,
  /** Names processed per chunk before yielding to the event loop. */
  chunkSize: 20,
} as const;

export const A4 = { widthPt: 595.28, heightPt: 841.89 } as const;

export const DEFAULT_POSITION = { x: 50, y: 52 } as const;

/** The 12 standard PDF fonts offered in the UI (implementation.md 2.1). */
export const STANDARD_FONTS: { key: StandardFontKey; label: string; pdfName: string }[] = [
  { key: "times", label: "Times", pdfName: "Times-Roman" },
  { key: "times-italic", label: "Times Italic", pdfName: "Times-Italic" },
  { key: "times-bold", label: "Times Bold", pdfName: "Times-Bold" },
  { key: "times-bolditalic", label: "Times Bold Italic", pdfName: "Times-BoldItalic" },
  { key: "helvetica", label: "Helvetica", pdfName: "Helvetica" },
  { key: "helvetica-bold", label: "Helvetica Bold", pdfName: "Helvetica-Bold" },
  { key: "helvetica-oblique", label: "Helvetica Oblique", pdfName: "Helvetica-Oblique" },
  {
    key: "helvetica-boldoblique",
    label: "Helvetica Bold Oblique",
    pdfName: "Helvetica-BoldOblique",
  },
  { key: "courier", label: "Courier", pdfName: "Courier" },
  { key: "courier-bold", label: "Courier Bold", pdfName: "Courier-Bold" },
  { key: "courier-oblique", label: "Courier Oblique", pdfName: "Courier-Oblique" },
  { key: "courier-boldoblique", label: "Courier Bold Oblique", pdfName: "Courier-BoldOblique" },
];

export const DEFAULT_STYLE: TextStyle = {
  x: DEFAULT_POSITION.x,
  y: DEFAULT_POSITION.y,
  font: "times-italic" satisfies FontKey,
  fontSize: LIMITS.defaultFontSize,
  color: "#ffffff",
  alignment: "center",
};

export const DEFAULT_OUTPUT: OutputSettings = {
  format: "pdf-individual",
  imageDpi: 300,
  normaliseToA4: true,
  zip: true,
  fileNamePattern: "certificate_{name}",
};
