/**
 * Merged pipeline: a single PDF with one page per name, embedding the template
 * once (implementation.md 2.2 #2, 7.3). Pure/Node-runnable.
 */

import { PDFDocument } from "pdf-lib";

import type { TextStyle } from "../types";
import { drawName } from "./draw";
import { drawShapedName, type ShapedOverlay } from "./overlay";
import { addTemplatePage, embedFontFor, embedTemplate, type TemplateSource } from "./template";

export interface RenderMergedOptions {
  template: TemplateSource;
  names: readonly string[];
  style: TextStyle;
  fontBytes?: Uint8Array;
  /** Optional per-name shaped overlay (name, index) -> overlay. */
  overlayFor?: (name: string, index: number) => ShapedOverlay | undefined;
}

/** Render all names into one PDF (template embedded once) and return its bytes. */
export async function renderMergedPdf(opts: RenderMergedOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const embedded = await embedTemplate(doc, opts.template);
  const anyVector = opts.names.some(
    (_, i) => opts.overlayFor?.(opts.names[i] ?? "", i) === undefined,
  );
  const font = anyVector ? await embedFontFor(doc, opts.style.font, opts.fontBytes) : undefined;

  for (const [index, name] of opts.names.entries()) {
    const page = addTemplatePage(doc, opts.template, embedded);
    const overlay = opts.overlayFor?.(name, index);
    if (overlay) {
      await drawShapedName(doc, page, {
        overlay,
        pageW: opts.template.widthPt,
        pageH: opts.template.heightPt,
        x: opts.style.x,
        y: opts.style.y,
        fontSize: opts.style.fontSize,
        alignment: opts.style.alignment,
      });
    } else if (font) {
      drawName(page, {
        name,
        style: opts.style,
        pageW: opts.template.widthPt,
        pageH: opts.template.heightPt,
        font,
      });
    }
  }

  return doc.save({ useObjectStreams: true });
}
