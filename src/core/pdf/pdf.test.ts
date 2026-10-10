import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PDFDocument, degrees, rgb } from "pdf-lib";

import { AppError } from "../errors";
import { buildStyle } from "../style";
import { drawName } from "./draw";
import { imageToPdf } from "./imageToPdf";
import { renderMergedPdf } from "./merged";
import { readPdfPageSize } from "./pageSize";
import { embedFontFor, renderCertificatePdf, type TemplateSource } from "./index";

const A4_W = 595.28;
const A4_H = 841.89;

async function makeVectorTemplate(width = A4_W, height = A4_H): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([width, height]);
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.2, 0.3, 0.4) });
  return doc.save();
}

const ONE_BY_ONE_PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

const latinTtfPath = join(process.cwd(), "src", "assets", "fonts", "NotoSans-Regular.ttf");
const hasLatinTtf = existsSync(latinTtfPath);

describe("readPdfPageSize", () => {
  it("reads portrait A4 geometry with rotation 0", async () => {
    const bytes = await makeVectorTemplate();
    expect(await readPdfPageSize(bytes)).toEqual({ widthPt: A4_W, heightPt: A4_H, rotation: 0 });
  });

  it("swaps width/height for 90/270 rotation and not for 180", async () => {
    for (const angle of [90, 270]) {
      const doc = await PDFDocument.create();
      const page = doc.addPage([A4_W, A4_H]);
      page.setRotation(degrees(angle));
      const size = await readPdfPageSize(await doc.save());
      expect(size.rotation).toBe(angle);
      expect(size.widthPt).toBeCloseTo(A4_H, 2);
      expect(size.heightPt).toBeCloseTo(A4_W, 2);
    }
    const doc = await PDFDocument.create();
    const page = doc.addPage([A4_W, A4_H]);
    page.setRotation(degrees(180));
    const size = await readPdfPageSize(await doc.save());
    expect(size.widthPt).toBeCloseTo(A4_W, 2);
    expect(size.heightPt).toBeCloseTo(A4_H, 2);
  });

  it("throws BAD_TEMPLATE for invalid PDF bytes", async () => {
    await expect(readPdfPageSize(Uint8Array.from([1, 2, 3, 4]))).rejects.toBeInstanceOf(AppError);
    try {
      await readPdfPageSize(Uint8Array.from([1, 2, 3, 4]));
    } catch (e) {
      expect((e as AppError).code).toBe("BAD_TEMPLATE");
    }
  });
});

describe("renderCertificatePdf (individual)", () => {
  it("renders one A4 page per call from a vector template", async () => {
    const template: TemplateSource = {
      kind: "pdf",
      bytes: await makeVectorTemplate(),
      widthPt: A4_W,
      heightPt: A4_H,
    };
    const bytes = await renderCertificatePdf({
      template,
      name: "Asha Nair",
      style: buildStyle(),
    });
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(1);
    const size = out.getPage(0).getSize();
    expect(size.width).toBeCloseTo(A4_W, 2);
    expect(size.height).toBeCloseTo(A4_H, 2);
  });

  it("renders from an image template", async () => {
    const bytes = await renderCertificatePdf({
      template: {
        kind: "image",
        format: "png",
        bytes: ONE_BY_ONE_PNG,
        widthPt: A4_W,
        heightPt: A4_H,
      },
      name: "Bharat",
      style: buildStyle({ alignment: "left" }),
    });
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(1);
  });

  it("throws BAD_FONT for a custom font with no bytes", async () => {
    const template: TemplateSource = {
      kind: "pdf",
      bytes: await makeVectorTemplate(),
      widthPt: A4_W,
      heightPt: A4_H,
    };
    await expect(
      renderCertificatePdf({ template, name: "X", style: buildStyle({ font: "custom:nope" }) }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("throws BAD_FONT for an unreadable font file", async () => {
    const doc = await PDFDocument.create();
    await expect(
      embedFontFor(doc, "custom:junk", Uint8Array.from([0, 1, 2])),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("renderMergedPdf", () => {
  it("produces one page per name, embedding the template once", async () => {
    const names = Array.from({ length: 10 }, (_, i) => `Student ${i}`);
    const template: TemplateSource = {
      kind: "pdf",
      bytes: await makeVectorTemplate(),
      widthPt: A4_W,
      heightPt: A4_H,
    };
    const bytes = await renderMergedPdf({ template, names, style: buildStyle() });
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(10);
  });

  it("returns a valid PDF for an empty name list without crashing", async () => {
    const template: TemplateSource = {
      kind: "pdf",
      bytes: await makeVectorTemplate(),
      widthPt: A4_W,
      heightPt: A4_H,
    };
    const bytes = await renderMergedPdf({ template, names: [], style: buildStyle() });
    // pdf-lib materialises a zero-page document as one blank page on load; the
    // real pipeline rejects empty input before reaching the renderer.
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(1);
  });
});

describe("imageToPdf", () => {
  it("wraps a PNG into a single page PDF", async () => {
    const bytes = await imageToPdf({
      bytes: ONE_BY_ONE_PNG,
      format: "png",
      widthPt: A4_W,
      heightPt: A4_H,
    });
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(1);
  });

  it("throws BAD_TEMPLATE for corrupt image bytes", async () => {
    await expect(
      imageToPdf({
        bytes: Uint8Array.from([0, 1, 2]),
        format: "png",
        widthPt: A4_W,
        heightPt: A4_H,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("drawName (auto-fit)", () => {
  it("shrinks the font when maxWidthPct would be exceeded", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([A4_W, A4_H]);
    const font = await embedFontFor(doc, "times");
    const longName = "Extraordinarily Long Name That Overflows";
    const base = drawName(page, {
      name: longName,
      style: buildStyle(),
      pageW: A4_W,
      pageH: A4_H,
      font,
    });
    const fitted = drawName(page, {
      name: longName,
      style: buildStyle({ maxWidthPct: 10 }),
      pageW: A4_W,
      pageH: A4_H,
      font,
    });
    expect(fitted.fontSize).toBeLessThan(base.fontSize);
    expect(fitted.textWidth).toBeLessThanOrEqual(A4_W * 0.1 + 0.5);
  });
});

describe("embedFontFor with a real TTF", () => {
  const test = hasLatinTtf ? it : it.skip;
  test("embeds a bundled Unicode TTF and renders a name", async () => {
    const fontBytes = Uint8Array.from(readFileSync(latinTtfPath));
    const template: TemplateSource = {
      kind: "pdf",
      bytes: await makeVectorTemplate(),
      widthPt: A4_W,
      heightPt: A4_H,
    };
    const bytes = await renderCertificatePdf({
      template,
      name: "മലയാളം Name",
      style: buildStyle({ font: "bundled:latin-sans" }),
      fontBytes,
    });
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(1);
  });
});
