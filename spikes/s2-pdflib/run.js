"use strict";
/* Spike S2: pdf-lib on a JS runtime.
 * - individual PDFs from a PDF template and from a ~2 MB JPEG template
 * - embedded TTF text
 * - merged PDF with the template embedded once (file-size check for 1/100/500 pages)
 * Measures wall time per file and RSS/peak memory (see docs/SPIKES.md).
 */
const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { makeNoiseJpeg } = require("../lib/canvaskit");
const { outPath, fixturePath, readProcStatus, nowMs, fmtKb, writeJson } = require("../lib/util");

const PAGE_W = 595.28;
const PAGE_H = 841.89;

function placeText(opts) {
  const anchorX = opts.pageW * (opts.x / 100);
  let startX = anchorX;
  if (opts.alignment === "center") startX = anchorX - opts.textWidth / 2;
  if (opts.alignment === "right") startX = anchorX - opts.textWidth;
  const centerY = opts.pageH * (opts.y / 100);
  const baselineFromTop = centerY + opts.fontSize / 3;
  return { x: Math.max(0, startX), yPdf: opts.pageH - Math.max(0, baselineFromTop) };
}

async function makeTemplatePdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.97, 0.97, 1) });
  page.drawRectangle({
    x: 24,
    y: 24,
    width: PAGE_W - 48,
    height: PAGE_H - 48,
    borderColor: rgb(0.31, 0.27, 0.9),
    borderWidth: 3,
  });
  const f = await doc.embedFont(StandardFonts.TimesRomanItalic);
  page.drawText("CERTIFICATE OF ACHIEVEMENT", {
    x: 90,
    y: PAGE_H - 140,
    size: 22,
    font: f,
    color: rgb(0.31, 0.27, 0.9),
  });
  return doc.save({ useObjectStreams: true });
}

function latinNames(n) {
  const first = [
    "Aarav",
    "Vivaan",
    "Aditya",
    "Ananya",
    "Diya",
    "Ishaan",
    "Kavya",
    "Rohan",
    "Meera",
    "Saanvi",
  ];
  const last = ["Sharma", "Nair", "Reddy", "Patel", "Iyer", "Gupta", "Menon", "Rao", "Das", "Khan"];
  const out = [];
  for (let i = 0; i < n; i++) out.push(`${first[i % first.length]} ${last[(i * 7) % last.length]}`);
  return out;
}

async function renderIndividualPdfTemplate({ templateBytes, names, outDir, fontBytes }) {
  fs.mkdirSync(outDir, { recursive: true });
  const t0 = nowMs();
  let maxRss = 0;
  const samples = [];
  const fontDoc = await PDFDocument.create();
  fontDoc.registerFontkit(fontkit);
  const font = await fontDoc.embedFont(fontBytes, { subset: true });
  const widths = names.map((n) => font.widthOfTextAtSize(n, 37));

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const [embedded] = await doc.embedPdf(templateBytes, [0]);
    const page = doc.addPage([PAGE_W, PAGE_H]);
    page.drawPage(embedded, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
    const f = await doc.embedFont(fontBytes, { subset: true });
    const tw = widths[i];
    const pos = placeText({
      pageW: PAGE_W,
      pageH: PAGE_H,
      x: 50,
      y: 52,
      fontSize: 37,
      textWidth: tw,
      alignment: "center",
    });
    page.drawText(name, { x: pos.x, y: pos.yPdf, size: 37, font: f, color: rgb(0.06, 0.09, 0.16) });
    const bytes = await doc.save({ useObjectStreams: true });
    fs.writeFileSync(path.join(outDir, `certificate_${i}.pdf`), bytes);
    if (i % 10 === 0 || i === names.length - 1) {
      const { rssKb } = readProcStatus();
      maxRss = Math.max(maxRss, rssKb || 0);
      samples.push({ i: i + 1, rssKb });
    }
  }
  const ms = nowMs() - t0;
  const peak = readProcStatus().peakKb;
  return { ms, perFileMs: ms / names.length, samples, maxRssKb: maxRss, peakKb: peak };
}

async function renderIndividualJpegTemplate({ jpegBytes, names, outDir, fontBytes }) {
  fs.mkdirSync(outDir, { recursive: true });
  const t0 = nowMs();
  let maxRss = 0;
  const samples = [];
  for (let i = 0; i < names.length; i++) {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const img = await doc.embedJpg(jpegBytes);
    const page = doc.addPage([PAGE_W, PAGE_H]);
    page.drawImage(img, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
    const f = await doc.embedFont(fontBytes, { subset: true });
    const name = names[i];
    const tw = f.widthOfTextAtSize(name, 37);
    const pos = placeText({
      pageW: PAGE_W,
      pageH: PAGE_H,
      x: 50,
      y: 52,
      fontSize: 37,
      textWidth: tw,
      alignment: "center",
    });
    page.drawText(name, { x: pos.x, y: pos.yPdf, size: 37, font: f, color: rgb(1, 1, 1) });
    const bytes = await doc.save({ useObjectStreams: true });
    fs.writeFileSync(path.join(outDir, `certificate_${i}.pdf`), bytes);
    if (i % 10 === 0 || i === names.length - 1) {
      const { rssKb } = readProcStatus();
      maxRss = Math.max(maxRss, rssKb || 0);
      samples.push({ i: i + 1, rssKb });
    }
  }
  const ms = nowMs() - t0;
  const peak = readProcStatus().peakKb;
  return { ms, perFileMs: ms / names.length, samples, maxRssKb: maxRss, peakKb: peak };
}

async function renderMerged({ templateBytes, names, outFile, fontBytes }) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const t0 = nowMs();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [embedded] = await doc.embedPdf(templateBytes, [0]); // template embedded ONCE
  const font = await doc.embedFont(fontBytes, { subset: true });
  for (const name of names) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    page.drawPage(embedded, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
    const tw = font.widthOfTextAtSize(name, 37);
    const pos = placeText({
      pageW: PAGE_W,
      pageH: PAGE_H,
      x: 50,
      y: 52,
      fontSize: 37,
      textWidth: tw,
      alignment: "center",
    });
    page.drawText(name, { x: pos.x, y: pos.yPdf, size: 37, font, color: rgb(0.06, 0.09, 0.16) });
  }
  const bytes = await doc.save({ useObjectStreams: true });
  fs.writeFileSync(outFile, bytes);
  const ms = nowMs() - t0;
  return { ms, bytes: bytes.length, perPageMs: ms / names.length, peakKb: readProcStatus().peakKb };
}

(async () => {
  const results = { runtime: process.version, ranAt: new Date().toISOString() };
  const outDir = outPath("s2");
  const fontBytes = fs.readFileSync(fixturePath("fonts", "NotoSans-Regular.ttf"));

  const jpeg = makeNoiseJpeg(2200, 1600, 92);
  const jpegFile = path.join(outDir, "template.jpg");
  fs.writeFileSync(jpegFile, jpeg);
  results.jpegTemplate = {
    path: jpegFile,
    bytes: jpeg.length,
    sizeMB: +(jpeg.length / 1048576).toFixed(2),
  };

  const templateBytes = await makeTemplatePdf();
  const pdfTemplateFile = path.join(outDir, "template.pdf");
  fs.writeFileSync(pdfTemplateFile, templateBytes);
  results.pdfTemplate = { path: pdfTemplateFile, bytes: templateBytes.length };

  const names = latinNames(100);

  results.individualPdfTemplate = await renderIndividualPdfTemplate({
    templateBytes,
    names,
    outDir: path.join(outDir, "individual-pdf"),
    fontBytes,
  });
  results.individualJpegTemplate = await renderIndividualJpegTemplate({
    jpegBytes: jpeg,
    names,
    outDir: path.join(outDir, "individual-jpeg"),
    fontBytes,
  });

  results.merged1 = await renderMerged({
    templateBytes,
    names: names.slice(0, 1),
    outFile: path.join(outDir, "merged-1.pdf"),
    fontBytes,
  });
  results.merged100 = await renderMerged({
    templateBytes,
    names,
    outFile: path.join(outDir, "merged-100.pdf"),
    fontBytes,
  });
  results.merged500 = await renderMerged({
    templateBytes,
    names: latinNames(500),
    outFile: path.join(outDir, "merged-500.pdf"),
    fontBytes,
  });

  results.oneSampleIndividualBytes = fs.statSync(
    path.join(outDir, "individual-pdf", "certificate_0.pdf"),
  ).size;

  writeJson(path.join(outDir, "results.json"), results);

  const line = (k, v) => console.log(`  ${k.padEnd(30)} ${v}`);
  console.log("\n=== S2 pdf-lib spike (Node " + process.version + ") ===");
  line("JPEG template", `${results.jpegTemplate.sizeMB} MB`);
  line(
    "individual PDF template",
    `${results.individualPdfTemplate.ms.toFixed(0)} ms total, ${results.individualPdfTemplate.perFileMs.toFixed(1)} ms/file`,
  );
  line("  peak memory", fmtKb(results.individualPdfTemplate.peakKb));
  line(
    "individual JPEG template",
    `${results.individualJpegTemplate.ms.toFixed(0)} ms total, ${results.individualJpegTemplate.perFileMs.toFixed(1)} ms/file`,
  );
  line("  peak memory", fmtKb(results.individualJpegTemplate.peakKb));
  line("merged 1 page", `${(results.merged1.bytes / 1024).toFixed(0)} KB`);
  line("merged 100 pages", `${(results.merged100.bytes / 1024).toFixed(0)} KB`);
  line("merged 500 pages", `${(results.merged500.bytes / 1024).toFixed(0)} KB`);
  line("  merged500 time", `${results.merged500.ms.toFixed(0)} ms`);
  console.log("  results.json written to spikes/out/s2/\n");
})().catch((e) => {
  console.error("S2 FAILED:", e);
  process.exit(1);
});
