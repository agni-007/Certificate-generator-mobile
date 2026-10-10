/**
 * Read page-1 geometry from a PDF template, respecting `/Rotate`
 * (implementation.md 7.2 step 2). Pure (pdf-lib is environment-agnostic).
 */

import { PDFDocument } from "pdf-lib";

import { AppError } from "../errors";

export interface PdfPageGeometry {
  /** Width in points after applying rotation. */
  widthPt: number;
  /** Height in points after applying rotation. */
  heightPt: number;
  /** Normalised rotation in degrees (0/90/180/270). */
  rotation: number;
}

export async function readPdfPageSize(bytes: Uint8Array): Promise<PdfPageGeometry> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch (cause) {
    throw new AppError("BAD_TEMPLATE", cause);
  }

  if (doc.getPageCount() === 0) throw new AppError("BAD_TEMPLATE");

  const page = doc.getPage(0);
  const { width, height } = page.getSize();
  const rotation = (((page.getRotation().angle % 360) + 360) % 360) % 360;
  const swapped = rotation === 90 || rotation === 270;

  return {
    widthPt: swapped ? height : width,
    heightPt: swapped ? width : height,
    rotation,
  };
}
