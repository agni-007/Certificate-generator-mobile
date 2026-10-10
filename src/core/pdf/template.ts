/**
 * Shared template embedding and font-loading for the pdf-lib pipelines
 * (implementation.md 7.3). Pure.
 */

import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFEmbeddedPage, PDFFont, PDFImage, PDFPage } from "pdf-lib";

import { AppError } from "../errors";
import type { FontKey } from "../types";
import { isStandardFontKey, standardFontName } from "./fonts";

export interface TemplateSource {
  kind: "pdf" | "image";
  /** Required for image templates. */
  format?: "png" | "jpeg";
  bytes: Uint8Array;
  /** Final page width in points (already A4-fitted for images). */
  widthPt: number;
  /** Final page height in points. */
  heightPt: number;
}

export type EmbeddedTemplate =
  { kind: "pdf"; page: PDFEmbeddedPage } | { kind: "image"; image: PDFImage };

export async function embedTemplate(
  doc: PDFDocument,
  template: TemplateSource,
): Promise<EmbeddedTemplate> {
  if (template.kind === "pdf") {
    try {
      const [page] = await doc.embedPdf(template.bytes, [0]);
      if (!page) throw new AppError("BAD_TEMPLATE");
      return { kind: "pdf", page };
    } catch (cause) {
      throw new AppError("BAD_TEMPLATE", cause);
    }
  }

  try {
    const image =
      template.format === "png"
        ? await doc.embedPng(template.bytes)
        : await doc.embedJpg(template.bytes);
    return { kind: "image", image };
  } catch (cause) {
    throw new AppError("BAD_TEMPLATE", cause);
  }
}

export function addTemplatePage(
  doc: PDFDocument,
  template: TemplateSource,
  embedded: EmbeddedTemplate,
): PDFPage {
  const page = doc.addPage([template.widthPt, template.heightPt]);
  const box = { x: 0, y: 0, width: template.widthPt, height: template.heightPt };
  if (embedded.kind === "pdf") page.drawPage(embedded.page, box);
  else page.drawImage(embedded.image, box);
  return page;
}

/**
 * Embed the selected font. Standard fonts need no bytes; custom/bundled fonts
 * are embedded from their TTF/OTF bytes with subsetting.
 */
export async function embedFontFor(
  doc: PDFDocument,
  font: FontKey,
  fontBytes?: Uint8Array,
): Promise<PDFFont> {
  if (fontBytes) {
    try {
      doc.registerFontkit(fontkit);
      return await doc.embedFont(fontBytes, { subset: true });
    } catch (cause) {
      throw new AppError("BAD_FONT", cause);
    }
  }
  if (isStandardFontKey(font)) return doc.embedFont(standardFontName(font));
  throw new AppError("BAD_FONT");
}
