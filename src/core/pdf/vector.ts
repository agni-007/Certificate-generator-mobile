/**
 * Vector pipeline: one PDF per name (implementation.md 7.3). Pure/Node-runnable.
 * When a shaped overlay is supplied the name is drawn as a PNG (7.4).
 */

import { PDFDocument } from "pdf-lib";

import type { TextStyle } from "../types";
import { drawName } from "./draw";
import { drawShapedName, type ShapedOverlay } from "./overlay";
import { addTemplatePage, embedFontFor, embedTemplate, type TemplateSource } from "./template";

export interface RenderCertificateOptions {
  template: TemplateSource;
  name: string;
  style: TextStyle;
  /** TTF/OTF bytes when `style.font` is a custom/bundled key. */
  fontBytes?: Uint8Array;
  /** Shaped-pipeline output for this name; skips pdf-lib text drawing. */
  overlay?: ShapedOverlay;
}

/** Render a single certificate PDF and return its bytes. */
export async function renderCertificatePdf(opts: RenderCertificateOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const embedded = await embedTemplate(doc, opts.template);
  const page = addTemplatePage(doc, opts.template, embedded);

  const placement = { pageW: opts.template.widthPt, pageH: opts.template.heightPt };

  if (opts.overlay) {
    await drawShapedName(doc, page, {
      overlay: opts.overlay,
      ...placement,
      x: opts.style.x,
      y: opts.style.y,
      fontSize: opts.style.fontSize,
      alignment: opts.style.alignment,
    });
  } else {
    const font = await embedFontFor(doc, opts.style.font, opts.fontBytes);
    drawName(page, {
      name: opts.name,
      style: opts.style,
      ...placement,
      font,
    });
  }

  return doc.save({ useObjectStreams: true });
}
