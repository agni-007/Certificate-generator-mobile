import { PDFDocument, rgb } from "pdf-lib";

import { placeText } from "../geometry";
import { drawShapedName, overlayDrawBox, type ShapedOverlay } from "./overlay";
import { renderCertificatePdf, type TemplateSource } from "./index";

const A4_W = 595.28;
const A4_H = 841.89;

const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

const overlay: ShapedOverlay = { png: PNG, widthPt: 120, heightPt: 24, baselinePt: 18 };

async function makeTemplate(): Promise<TemplateSource> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4_W, A4_H]);
  page.drawRectangle({ x: 0, y: 0, width: A4_W, height: A4_H, color: rgb(0.9, 0.9, 0.9) });
  return { kind: "pdf", bytes: await doc.save(), widthPt: A4_W, heightPt: A4_H };
}

describe("overlayDrawBox", () => {
  it("aligns the image baseline to the text baseline for each alignment", () => {
    for (const alignment of ["left", "center", "right"] as const) {
      const box = overlayDrawBox({
        overlay,
        pageW: A4_W,
        pageH: A4_H,
        x: 40,
        y: 60,
        fontSize: 37,
        alignment,
      });
      const text = placeText({
        pageW: A4_W,
        pageH: A4_H,
        x: 40,
        y: 60,
        fontSize: 37,
        textWidth: overlay.widthPt,
        alignment,
      });
      expect(box.x).toBeCloseTo(text.x, 6);
      expect(box.yPdf + overlay.heightPt - overlay.baselinePt).toBeCloseTo(text.yPdf, 6);
      expect(box.textWidth).toBe(overlay.widthPt);
      expect(box.textHeight).toBe(overlay.heightPt);
    }
  });

  it("clamps the draw x to the page like the vector pipeline", () => {
    const box = overlayDrawBox({
      overlay: { ...overlay, widthPt: 1000 },
      pageW: A4_W,
      pageH: A4_H,
      x: 0,
      y: 50,
      fontSize: 37,
      alignment: "center",
    });
    expect(box.x).toBe(0);
  });
});

describe("renderCertificatePdf with a shaped overlay", () => {
  it("embeds the overlay PNG instead of drawing text", async () => {
    const template = await makeTemplate();
    const bytes = await renderCertificatePdf({
      template,
      name: "മലയാളം",
      style: {
        x: 50,
        y: 50,
        font: "bundled:malayalam",
        fontSize: 37,
        color: "#000000",
        alignment: "center",
      },
      overlay,
    });
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(1);
  });
});

describe("drawShapedName", () => {
  it("draws a PNG onto a page", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([A4_W, A4_H]);
    const result = await drawShapedName(doc, page, {
      overlay,
      pageW: A4_W,
      pageH: A4_H,
      x: 50,
      y: 50,
      fontSize: 37,
      alignment: "center",
    });
    expect(result.textWidth).toBe(120);
    const bytes = await doc.save();
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(1);
  });
});
