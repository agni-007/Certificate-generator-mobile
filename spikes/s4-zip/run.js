"use strict";
/* Spike S4: ZIP. Primary plan is a native streaming zipper (react-native-zip-archive);
 * that needs a device, so here we measure the documented fallback: fflate streaming
 * to disk (never holding the archive in JS memory). Verifies non-Latin filenames.
 */
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const { Zip, ZipPassThrough, unzipSync } = require("fflate");
const { outPath, nowMs, readProcStatus, writeJson } = require("../lib/util");

const N = 300;

async function makePdf(i) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  page.drawText(`Certificate #${i}`, { x: 72, y: 700, size: 24 });
  return Buffer.from(await doc.save());
}

function zipToDisk(files, zipPath) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(zipPath);
    const samples = [];
    let count = 0;
    const zip = new Zip((err, chunk, final) => {
      if (err) return reject(err);
      ws.write(Buffer.from(chunk));
      if (++count % 50 === 0) samples.push({ files: count, rssKb: readProcStatus().rssKb });
      if (final) {
        ws.end(() => resolve({ samples }));
      }
    });
    for (const f of files) {
      const entry = new ZipPassThrough(f.name);
      zip.add(entry);
      entry.push(f.bytes, true);
    }
    zip.end();
  });
}

(async () => {
  const dir = outPath("s4");
  const pdfSamples = await Promise.all(Array.from({ length: 5 }, (_, i) => makePdf(i)));
  const names = [
    "certificate_Aarav_Sharma.pdf",
    "certificate_മലയാളം.pdf",
    "certificate_தமிழ்.pdf",
    "certificate_हिन्दी.pdf",
    "certificate_untyped.pdf",
  ];
  const files = [];
  for (let i = 0; i < N; i++)
    files.push({
      name: `certificates/${names[i % names.length].replace(".pdf", `_${i}.pdf`)}`,
      bytes: pdfSamples[i % pdfSamples.length],
    });

  const zipPath = path.join(dir, "certificates.zip");
  const peakBefore = readProcStatus().peakKb;
  const t0 = nowMs();
  const { samples } = await zipToDisk(files, zipPath);
  const ms = nowMs() - t0;
  const size = fs.statSync(zipPath).size;

  // verify
  const back = unzipSync(new Uint8Array(fs.readFileSync(zipPath)));
  const entries = Object.keys(back);
  const malayalamOk = entries.some((e) => e.includes("മലയാളം"));

  const results = {
    files: N,
    ms: +ms.toFixed(1),
    zipBytes: size,
    entries: entries.length,
    malayalamNameIntact: malayalamOk,
    rssSamples: samples,
    peakKb: readProcStatus().peakKb,
    peakBeforeKb: peakBefore,
  };
  writeJson(path.join(dir, "results.json"), results);

  console.log("\n=== S4 ZIP spike (fflate streaming fallback) ===");
  console.log(
    `  ${N} files, ${(size / 1024).toFixed(0)} KB zip, ${ms.toFixed(0)} ms (${(N / (ms / 1000)).toFixed(0)} files/s)`,
  );
  console.log(
    `  entries after unzip: ${entries.length}, Malayalam filename intact: ${malayalamOk}`,
  );
  console.log(`  RSS samples (kB): ${samples.map((s) => s.files + ":" + s.rssKb).join("  ")}`);
  console.log(`  peak ${(results.peakKb / 1024).toFixed(1)} MB\n`);
})().catch((e) => {
  console.error("S4 FAILED:", e);
  process.exit(1);
});
