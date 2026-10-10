"use strict";
/* Spike S3: complex-script shaping via Skia (CanvasKit = Skia compiled to WASM).
 * CanvasKit uses the same SkParagraph/HarfBuzz shaping stack as
 * @shopify/react-native-skia, so this validates the shaping decision without a device.
 * Renders Malayalam / Tamil / Devanagari / Latin to transparent PNGs at 300 DPI,
 * measures tight bounds, and embeds the PNGs into a one-page PDF with pdf-lib.
 */
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const { initCanvasKit } = require("../lib/canvaskit");
const { outPath, fixturePath, nowMs, writeJson } = require("../lib/util");

const DPI = 300;
const SCALE = DPI / 72;
const FONT_SIZE_PT = 37;

const FONTS = [
  { file: "NotoSansMalayalam-Regular.ttf", family: "Noto Sans Malayalam" },
  { file: "NotoSansTamil-Regular.ttf", family: "Noto Sans Tamil" },
  { file: "NotoSansDevanagari-Regular.ttf", family: "Noto Sans Devanagari" },
  { file: "NotoSans-Regular.ttf", family: "Noto Sans" },
];

const SAMPLES = [
  {
    id: "malayalam-word",
    family: "Noto Sans Malayalam",
    text: "മലയാളം",
    note: "Malayalam — vowel signs + chillu",
  },
  {
    id: "malayalam-conjunct",
    family: "Noto Sans Malayalam",
    text: "സ്ത്രീ ക്ഷേത്രം",
    note: "Malayalam — conjuncts (st + ra + ii, ksha)",
  },
  {
    id: "tamil-word",
    family: "Noto Sans Tamil",
    text: "தமிழ்",
    note: "Tamil — pulli + vowel sign",
  },
  {
    id: "tamil-conjunct",
    family: "Noto Sans Tamil",
    text: "ஸ்ரீ க்ஷேத்திரம்",
    note: "Tamil — sri ligature + conjunct",
  },
  {
    id: "devanagari-word",
    family: "Noto Sans Devanagari",
    text: "हिन्दी",
    note: "Devanagari — vowel signs",
  },
  {
    id: "devanagari-conjunct",
    family: "Noto Sans Devanagari",
    text: "क्षत्रिय श्री",
    note: "Devanagari — conjuncts (ksha, shri)",
  },
  { id: "latin", family: "Noto Sans", text: "Aarav Sharma", note: "Latin control" },
];

function loadFontMgr(CK) {
  const data = FONTS.map((f) => new Uint8Array(fs.readFileSync(fixturePath("fonts", f.file))));
  const mgr = CK.FontMgr.FromData(data);
  const families = [];
  for (let i = 0; i < mgr.countFamilies(); i++) families.push(mgr.getFamilyName(i));
  return { mgr, families };
}

function renderParagraph(CK, mgr, family, text, color) {
  const paraStyle = new CK.ParagraphStyle({
    textStyle: {
      color,
      fontSize: FONT_SIZE_PT * SCALE,
      fontFamilies: [family],
    },
    textAlign: CK.TextAlign.Left,
  });
  const builder = CK.ParagraphBuilder.Make(paraStyle, mgr);
  builder.addText(text);
  const para = builder.build();
  para.layout(1e6);
  const width = para.getLongestLine();
  const height = para.getHeight();
  const baseline = para.getAlphabeticBaseline();
  const pad = Math.ceil(FONT_SIZE_PT * SCALE * 0.35);
  const w = Math.ceil(width) + pad * 2;
  const h = Math.ceil(height) + pad * 2;
  const surface = CK.MakeSurface(w, h);
  const canvas = surface.getCanvas();
  canvas.clear(CK.TRANSPARENT);
  canvas.drawParagraph(para, pad, pad);
  const snap = surface.makeImageSnapshot();
  const png = snap.encodeToBytes(CK.ImageFormat.PNG, 100);
  snap.delete();
  surface.delete();
  para.delete();
  builder.delete();
  return { png, widthPx: width, heightPx: height, baselinePx: baseline, pad, w, h };
}

(async () => {
  const CK = await initCanvasKit();
  const { mgr, families } = loadFontMgr(CK);
  const dir = outPath("s3");
  const results = {
    dpi: DPI,
    fontSizePt: FONT_SIZE_PT,
    runtime: process.version,
    families,
    samples: [],
  };
  const t0 = nowMs();

  const embedded = [];
  for (const s of SAMPLES) {
    const r = renderParagraph(CK, mgr, s.family, s.text, CK.Color(15, 23, 42, 1));
    const pngFile = path.join(dir, s.id + ".png");
    fs.writeFileSync(pngFile, r.png);
    // width in points = px * 72/300; tight height likewise
    const widthPt = r.widthPx * (72 / DPI);
    const heightPt = r.heightPx * (72 / DPI);
    results.samples.push({
      id: s.id,
      note: s.note,
      text: s.text,
      family: s.family,
      pngFile: path.relative(path.join(__dirname, ".."), pngFile),
      pngBytes: r.png.length,
      widthPt: +widthPt.toFixed(2),
      heightPt: +heightPt.toFixed(2),
      baselinePx: +r.baselinePx.toFixed(2),
    });
    embedded.push({ s, png: r.png, widthPt, heightPt });
  }

  // End-to-end: embed the shaped PNGs into one PDF (the S3 + S2 integration).
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: rgb(0.97, 0.97, 1) });
  let y = 760;
  for (const e of embedded) {
    const img = await doc.embedPng(e.png);
    const targetH = e.heightPt;
    const targetW = e.widthPt;
    page.drawImage(img, { x: 60, y: y - targetH, width: targetW, height: targetH });
    y -= targetH + 24;
  }
  const pdf = await doc.save({ useObjectStreams: true });
  fs.writeFileSync(path.join(dir, "shaped-samples.pdf"), pdf);

  results.totalMs = +(nowMs() - t0).toFixed(1);
  writeJson(path.join(dir, "results.json"), results);

  console.log("\n=== S3 shaping spike (CanvasKit/Skia, " + DPI + " DPI) ===");
  for (const s of results.samples) {
    console.log(
      `  ${s.id.padEnd(20)} ${s.widthPt.toFixed(1).padStart(7)} x ${s.heightPt.toFixed(1).padStart(6)} pt   ${s.text}`,
    );
  }
  console.log(`  total ${results.totalMs} ms; PNGs + shaped-samples.pdf in spikes/out/s3/\n`);
})().catch((e) => {
  console.error("S3 FAILED:", e);
  process.exit(1);
});
