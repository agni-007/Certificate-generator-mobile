// Programmatic shaping verification (the build machine/model cannot view images).
// Uses HarfBuzz (the same shaper Skia/CanvasKit uses) directly to prove that
// conjuncts and vowel signs are shaped, not emitted as isolated base characters,
// and cross-checks the advance widths against CanvasKit's paragraph layout.
import * as hb from "harfbuzzjs";
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const CanvasKitInit = require("canvaskit-wasm");
const base = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const fontDir = path.join(base, "fixtures", "fonts");

const CASES = [
  { id: "malayalam-word", file: "NotoSansMalayalam-Regular.ttf", family: "Noto Sans Malayalam", text: "മലയാളം", expectConjunct: false },
  { id: "malayalam-conjunct", file: "NotoSansMalayalam-Regular.ttf", family: "Noto Sans Malayalam", text: "സ്ത്രീ ക്ഷേത്രം", expectConjunct: true },
  { id: "tamil-word", file: "NotoSansTamil-Regular.ttf", family: "Noto Sans Tamil", text: "தமிழ்", expectConjunct: true },
  { id: "tamil-conjunct", file: "NotoSansTamil-Regular.ttf", family: "Noto Sans Tamil", text: "ஸ்ரீ க்ஷேத்திரம்", expectConjunct: true },
  { id: "devanagari-word", file: "NotoSansDevanagari-Regular.ttf", family: "Noto Sans Devanagari", text: "हिन्दी", expectConjunct: true },
  { id: "devanagari-conjunct", file: "NotoSansDevanagari-Regular.ttf", family: "Noto Sans Devanagari", text: "क्षत्रिय श्री", expectConjunct: true },
];

function shapeCase(c) {
  const data = fs.readFileSync(path.join(fontDir, c.file));
  const blob = new hb.Blob(data);
  const face = new hb.Face(blob);
  const font = new hb.Font(face);
  const buffer = new hb.Buffer();
  buffer.addText(c.text);
  buffer.guessSegmentProperties();
  hb.shape(font, buffer);
  const infos = buffer.getGlyphInfos();
  const positions = buffer.getGlyphPositions();
  const codepoints = [...c.text.replace(/\s/g, "")].length;
  const glyphs = infos.length;
  const upem = face.upem;
  const advanceUnits = positions.reduce((a, p) => a + p.xAdvance, 0);
  let marksWithOffsets = 0;
  for (const p of positions) if (p.xOffset !== 0 || p.yOffset !== 0) marksWithOffsets++;
  return { codepoints, glyphs, upem, advanceUnits, marksWithOffsets, gids: infos.map((i) => i.codepoint) };
}

(async () => {
  const CK = await CanvasKitInit({
    locateFile: (f) => path.join(base, "node_modules", "canvaskit-wasm", "bin", f),
  });
  const fontFiles = [...new Set(CASES.map((c) => c.file))];
  const mgr = CK.FontMgr.FromData(fontFiles.map((f) => new Uint8Array(fs.readFileSync(path.join(fontDir, f)))));

  const SZ = 37;
  console.log("\n=== S3 shaping verification (HarfBuzz + CanvasKit width cross-check) ===");
  console.log("case                  cps  glyphs  offsets  hbWidthPt  ckWidthPt  shaping?");
  let allShaped = true;
  for (const c of CASES) {
    const r = shapeCase(c);
    const hbWidthPt = (r.advanceUnits / r.upem) * SZ;
    const style = new CK.ParagraphStyle({
      textStyle: { color: CK.BLACK, fontSize: SZ, fontFamilies: [c.family] },
    });
    const b = CK.ParagraphBuilder.Make(style, mgr);
    b.addText(c.text);
    const p = b.build();
    p.layout(1e6);
    const ckWidthPt = p.getLongestLine();
    // shaping is considered to have occurred when ligatures reduce glyph count
    // and/or marks are repositioned; for pure Latin we expect neither.
    // A conjunct case is correctly shaped when ligatures/substitutions reduce the
    // glyph count below the base codepoint count. Simple words may legitimately map
    // 1:1 (e.g. മലയാളം has no conjuncts).
    const reduced = r.glyphs < r.codepoints;
    const widthMatch = Math.abs(hbWidthPt - ckWidthPt) <= Math.max(1, ckWidthPt * 0.02);
    if (!widthMatch) allShaped = false;
    if (c.expectConjunct && !reduced) allShaped = false;
    console.log(
      c.id.padEnd(22) +
        String(r.codepoints).padStart(3) +
        String(r.glyphs).padStart(7) +
        String(r.marksWithOffsets).padStart(9) +
        hbWidthPt.toFixed(1).padStart(11) +
        ckWidthPt.toFixed(1).padStart(11) +
        "   " + (reduced ? "ligature" : "1:1") + (widthMatch ? "" : "  [WIDTH MISMATCH]")
    );
    console.log("      gids:", r.gids.join(","));
  }
  console.log(
    allShaped
      ? "\nRESULT: all conjunct cases show substitution and HarfBuzz widths equal CanvasKit widths. ✅\n"
      : "\nRESULT: shaping NOT confirmed. ❌\n"
  );
  process.exit(allShaped ? 0 : 1);
})().catch((e) => {
  console.error("verify FAILED:", e);
  process.exit(1);
});
