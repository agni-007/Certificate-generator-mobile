/**
 * Geometry that must match the web app (implementation.md 7.1) plus the mobile
 * A4 fit deviation (2.2 #1). Pure.
 *
 * Page coordinates use pdf-lib's bottom-left origin; the web app used top-left.
 */

import { A4, LIMITS } from "./constants";
import { clamp } from "./math";
import type { Alignment } from "./types";

export interface PlaceTextOptions {
  pageW: number;
  pageH: number;
  /** Anchor 0..100 (percent of page width). */
  x: number;
  /** Vertical centre 0..100 (percent of page height). */
  y: number;
  fontSize: number;
  textWidth: number;
  alignment: Alignment;
}

export interface TextPlacement {
  /** Clamped draw X (pdf-lib, already >= 0). */
  x: number;
  /** Draw Y in pdf-lib's bottom-left origin. */
  yPdf: number;
  anchorX: number;
  startX: number;
  centerY: number;
  baselineFromTop: number;
}

export function placeText(opts: PlaceTextOptions): TextPlacement {
  const anchorX = opts.pageW * (opts.x / 100);
  let startX = anchorX;
  if (opts.alignment === "center") startX = anchorX - opts.textWidth / 2;
  if (opts.alignment === "right") startX = anchorX - opts.textWidth;

  const centerY = opts.pageH * (opts.y / 100);
  const baselineFromTop = centerY + opts.fontSize / 3;

  return {
    x: Math.max(0, startX),
    yPdf: opts.pageH - Math.max(0, baselineFromTop),
    anchorX,
    startX,
    centerY,
    baselineFromTop,
  };
}

export interface PageSize {
  widthPt: number;
  heightPt: number;
}

export interface FittedPage extends PageSize {
  scale: number;
}

/**
 * Fit an image-derived page inside A4 in its own orientation (long side <=
 * 841.89, short side <= 595.28), never enlarging. When `normaliseToA4` is false
 * the original size is returned unchanged.
 */
export function fitPage(
  widthPt: number,
  heightPt: number,
  opts: { normaliseToA4?: boolean } = {},
): FittedPage {
  if (opts.normaliseToA4 === false) {
    return { widthPt, heightPt, scale: 1 };
  }
  const longSide = Math.max(widthPt, heightPt);
  const shortSide = Math.min(widthPt, heightPt);
  if (longSide <= 0 || shortSide <= 0) {
    return { widthPt, heightPt, scale: 1 };
  }
  const scale = Math.min(1, A4.heightPt / longSide, A4.widthPt / shortSide);
  return { widthPt: widthPt * scale, heightPt: heightPt * scale, scale };
}

/** Clamp an image DPI into 72..600, defaulting to 300 when absent/invalid. */
export function clampDpi(dpi: number | undefined): number {
  if (dpi === undefined || !Number.isFinite(dpi)) return LIMITS.defaultDpi;
  return clamp(dpi, LIMITS.minDpi, LIMITS.maxDpi);
}

/** Image pixel dimensions -> page size in points at the given DPI. */
export function imagePageSizePt(
  pxWidth: number,
  pxHeight: number,
  dpi: number = LIMITS.defaultDpi,
): PageSize {
  const d = clampDpi(dpi);
  return { widthPt: (pxWidth * 72) / d, heightPt: (pxHeight * 72) / d };
}

/** Image dimensions -> final page size, applying the A4 fit rule. */
export function pageSizeFromImage(
  pxWidth: number,
  pxHeight: number,
  dpi: number,
  normaliseToA4: boolean,
): PageSize {
  const base = imagePageSizePt(pxWidth, pxHeight, dpi);
  const fitted = fitPage(base.widthPt, base.heightPt, { normaliseToA4 });
  return { widthPt: fitted.widthPt, heightPt: fitted.heightPt };
}
