/**
 * Convert a normalised image template into a one-page PDF (implementation.md
 * 2.1 "Image to page"). Pure/Node-runnable.
 */

import { PDFDocument, type PDFImage } from "pdf-lib";

import { AppError } from "../errors";

export interface ImageToPdfOptions {
  bytes: Uint8Array;
  format: "png" | "jpeg";
  widthPt: number;
  heightPt: number;
}

export async function imageToPdf(opts: ImageToPdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  let image: PDFImage;
  try {
    image = opts.format === "png" ? await doc.embedPng(opts.bytes) : await doc.embedJpg(opts.bytes);
  } catch (cause) {
    throw new AppError("BAD_TEMPLATE", cause);
  }

  const page = doc.addPage([opts.widthPt, opts.heightPt]);
  page.drawImage(image, { x: 0, y: 0, width: opts.widthPt, height: opts.heightPt });

  return doc.save({ useObjectStreams: true });
}
