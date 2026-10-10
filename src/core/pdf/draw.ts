/**
 * Draw a name onto a prepared certificate page using the exact web-app geometry
 * (implementation.md 7.1/7.3), including optional shrink-to-fit width.
 */

import { rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { placeText } from "../geometry";
import { hexToRgb } from "../style";
import type { TextStyle } from "../types";

export interface DrawNameOptions {
  name: string;
  style: TextStyle;
  pageW: number;
  pageH: number;
  font: PDFFont;
}

export interface DrawNameResult {
  textWidth: number;
  fontSize: number;
  x: number;
  yPdf: number;
}

export function drawName(page: PDFPage, opts: DrawNameOptions): DrawNameResult {
  let fontSize = opts.style.fontSize;
  let textWidth = opts.font.widthOfTextAtSize(opts.name, fontSize);

  const { maxWidthPct } = opts.style;
  if (maxWidthPct !== undefined && textWidth > 0) {
    const maxWidthPt = opts.pageW * (maxWidthPct / 100);
    if (textWidth > maxWidthPt) {
      fontSize = fontSize * (maxWidthPt / textWidth);
      textWidth = opts.font.widthOfTextAtSize(opts.name, fontSize);
    }
  }

  const { x, yPdf } = placeText({
    pageW: opts.pageW,
    pageH: opts.pageH,
    x: opts.style.x,
    y: opts.style.y,
    fontSize,
    textWidth,
    alignment: opts.style.alignment,
  });

  const { r, g, b } = hexToRgb(opts.style.color);
  page.drawText(opts.name, {
    x,
    y: yPdf,
    size: fontSize,
    font: opts.font,
    color: rgb(r / 255, g / 255, b / 255),
  });

  return { textWidth, fontSize, x, yPdf };
}
