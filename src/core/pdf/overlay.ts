/**
 * Shaped pipeline overlay embedding (implementation.md 7.4 step 4). The Skia
 * port rasterises the name to a tight transparent PNG; pdf-lib embeds it and
 * positions it with the same `placeText` geometry as the vector pipeline.
 */

import type { PDFDocument, PDFPage } from "pdf-lib";

import { placeText } from "../geometry";
import type { Alignment } from "../types";

export interface ShapedOverlay {
  /** Tightly-cropped transparent PNG of the shaped name. */
  png: Uint8Array;
  /** Measured width in points at the requested font size. */
  widthPt: number;
  /** Measured height in points at the requested font size. */
  heightPt: number;
  /** Distance from the top of the image to the alphabetic baseline, in points. */
  baselinePt: number;
}

export interface DrawOverlayOptions {
  overlay: ShapedOverlay;
  pageW: number;
  pageH: number;
  /** Anchor 0..100 (percent of page width). */
  x: number;
  /** Vertical centre 0..100 (percent of page height). */
  y: number;
  /** Requested font size in points (drives the baseline offset). */
  fontSize: number;
  alignment: Alignment;
}

export interface DrawOverlayResult {
  x: number;
  /** Lower-left Y in pdf-lib's bottom-left origin. */
  yPdf: number;
  textWidth: number;
  textHeight: number;
}

/** Compute the image draw box (lower-left origin) for a shaped overlay. */
export function overlayDrawBox(opts: DrawOverlayOptions): DrawOverlayResult {
  const { x, yPdf } = placeText({
    pageW: opts.pageW,
    pageH: opts.pageH,
    x: opts.x,
    y: opts.y,
    fontSize: opts.fontSize,
    textWidth: opts.overlay.widthPt,
    alignment: opts.alignment,
  });
  // Align the image so its alphabetic baseline sits on `yPdf`.
  const yLower = yPdf - opts.overlay.heightPt + opts.overlay.baselinePt;
  return {
    x,
    yPdf: yLower,
    textWidth: opts.overlay.widthPt,
    textHeight: opts.overlay.heightPt,
  };
}

/** Embed the overlay PNG and draw it at the computed position. */
export async function drawShapedName(
  doc: PDFDocument,
  page: PDFPage,
  opts: DrawOverlayOptions,
): Promise<DrawOverlayResult> {
  const box = overlayDrawBox(opts);
  const image = await doc.embedPng(opts.overlay.png);
  page.drawImage(image, {
    x: box.x,
    y: box.yPdf,
    width: opts.overlay.widthPt,
    height: opts.overlay.heightPt,
  });
  return box;
}
