/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Placement parity check against pdf.js, the parser used by the reference web
 * app. Verifies that coordinates computed by `placeText` land exactly in PDF
 * user space (text-item transform[4]/[5]) and that measured widths agree.
 *
 * Runs outside Jest (`npm run test:parity`) because pdfjs-dist is ESM-only and
 * Jest's CJS sandbox intercepts dynamic import. Works on Node >= 22 natively;
 * on Node 18 the `Promise.withResolvers` shim below is required.
 */

import assert from "node:assert/strict";

import { PDFDocument, rgb, type StandardFonts } from "pdf-lib";

import { placeText } from "../src/core/geometry";
import { renderCertificatePdf, standardFontName } from "../src/core/pdf";
import { buildStyle } from "../src/core/style";
import type { StandardFontKey } from "../src/core/types";

if (typeof (Promise as any).withResolvers !== "function") {
  (Promise as any).withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

const A4_W = 595.28;
const A4_H = 841.89;

async function makeVectorTemplate(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4_W, A4_H]);
  page.drawRectangle({ x: 0, y: 0, width: A4_W, height: A4_H, color: rgb(0.9, 0.9, 0.9) });
  return doc.save();
}

async function measure(name: string, fontSize: number, fontKey: StandardFontKey): Promise<number> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(standardFontName(fontKey) as StandardFonts);
  return font.widthOfTextAtSize(name, fontSize);
}

async function main(): Promise<void> {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const template = {
    kind: "pdf" as const,
    bytes: await makeVectorTemplate(),
    widthPt: A4_W,
    heightPt: A4_H,
  };

  let checked = 0;
  for (const alignment of ["left", "center", "right"] as const) {
    const name = `Parity ${alignment}`;
    const fontSize = 37;
    const style = buildStyle({ alignment, fontSize, x: 30, y: 40, color: "#123456" });
    const fontKey = style.font;
    if (!["times", "times-italic", "times-bold", "times-bolditalic"].includes(fontKey)) {
      throw new Error(`parity only supports Times standard fonts, got ${fontKey}`);
    }
    const bytes = await renderCertificatePdf({ template, name, style });

    const task = pdfjs.getDocument({
      data: bytes,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      verbosity: 0,
    });
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const item = content.items.find((i: any) => i.str === name);
    assert.ok(item, `text item "${name}" not found`);

    const textWidth = await measure(name, fontSize, fontKey as StandardFontKey);
    const expected = placeText({
      pageW: A4_W,
      pageH: A4_H,
      x: style.x,
      y: style.y,
      fontSize,
      textWidth,
      alignment,
    });

    assert.ok(Math.abs(item.transform[4] - expected.x) < 0.5, `${name}: x off`);
    assert.ok(Math.abs(item.transform[5] - expected.yPdf) < 0.5, `${name}: y off`);
    checked += 1;
    console.log(
      `parity ${alignment.padEnd(6)} x=${item.transform[4].toFixed(2)} y=${item.transform[5].toFixed(2)} widthDelta=${Number(item.width - textWidth).toFixed(3)} OK`,
    );
  }

  console.log(`placement parity: ${checked}/3 alignments matched pdf.js within 0.5pt`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
