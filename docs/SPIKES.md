# Phase 0 — De-risking spikes

**Date:** 2026-10-10 · **Machine:** Linux x86_64 · **Node:** v18.19.1 (build machine) ·
**Toolchain pinned for the app:** Node 24.3.0 (see `.nvmrc`).

## Environment constraints (why some spikes are partial/blocked)

This build machine has `git`, `adb` (binary only), Node 18 and Java 21, but **no Android SDK,
no emulator/device, no macOS/Xcode and no EAS credentials**. Therefore any spike that needs a
native runtime is executed only for its portable parts; the device-only parts are marked
**BLOCKED** with the documented fallback applied. The pure-JS risks were executed for real.

Status legend: ✅ executed with numbers · 🟡 partial (portable part done) · ⛔ blocked.

| Spike | Status | Decision |
|---|---|---|
| S1 PDF page → preview image | ⛔ blocked (no device) | primary `react-native-pdf-thumbnail`; fallback custom Expo module over `PdfRenderer`/`PDFKit` |
| S2 pdf-lib individual + merged | ✅ | **`pdf-lib` 1.17.1** + `@pdf-lib/fontkit` 1.1.1 |
| S3 Skia shaping (Indic) | 🟡 CanvasKit/HarfBuzz proxy, verified | **Skia Paragraph API**; on-device confirm in Phase 3 |
| S4 ZIP + export | 🟡 fflate in Node | primary native zipper; **`fflate` 0.8.3** fallback validated |
| S5 spreadsheet parsing | ✅ | `xlsx` 0.18.5 + `papaparse` 5.7.0; **custom** charset fallback (not jschardet) |
| S6 offline release build | ⛔ blocked (no SDK) | config implemented; verify on owner CI/device |

Raw outputs: `docs/assets/spikes/` and `spikes/out/` (gitignored). Summary log:
`docs/assets/spikes/summary.log`.

---

## S1 — PDF page → preview image ⛔ BLOCKED

- **Tried:** nothing runnable on this machine; `react-native-pdf-thumbnail` needs a device.
  `pdfjs-dist@6.4.299` (the Node-side PDF reader we will use for Phase 2 parity tests) requires
  Node `>=22.13` and does not run on the build machine's Node 18.
- **Decision:** primary dependency `react-native-pdf-thumbnail@2.0.0` (MIT). Fallback (R1): a thin
  custom Expo module over Android `PdfRenderer` and iOS `PDFKit`, behind the
  `PdfRasteriser` port. `react-native-pdf` viewer is preview-only last resort.
- **Target re-check (NFR):** 1-page A4 PDF → PNG at ~1600 px in < 1.5 s on both OSes. **Not yet
  measured** — must be measured in Phase 2/3 on a real device.
- **Consequence:** Phase 1 will still install the port and a fake implementation so the editor can
  be built and tested in CI; the native adapter is verified once a device is available.

## S2 — pdf-lib: individual and merged PDFs ✅

Command: `cd spikes && node --expose-gc s2-pdflib/run.js` · results: `docs/assets/spikes/s2-results.json`.

Setup: A4 (595.28 × 841.89 pt), embedded **Noto Sans** TTF (subset), 37 pt centred text at x=50/y=52,
100 Latin names; JPEG template 2200×1600 (pixel noise) re-encoded to **3.81 MB**.

| Measurement (Node/V8) | Value |
|---|---|
| Individual PDFs from **vector PDF** template | **92.1 ms/file** (100 files ≈ 9.2 s) |
| Individual PDFs from **3.81 MB JPEG** template | **103.5 ms/file** (100 files ≈ 10.4 s) |
| Merged PDF, template embedded once, 1 page | 6 KB |
| Merged PDF, 100 pages | 34 KB |
| Merged PDF, 500 pages | 142 KB (≈ 1.0 s) |
| Peak RSS (whole process) | ≈ 420 MB (Node; includes one-time 3.81 MB JPEG encode and V8 heap) |

**Template stored once (key result):** 500-page merged PDF is 142 KB versus a 6 KB one-page PDF →
the shared `embedPage` XObject adds only ~0.27 KB/page of text, i.e. the template is **not**
duplicated. This validates the merged-PDF memory strategy (Section 4.4).

**Memory note (honest):** during the first (vector) pass RSS grew from ~219 MB to ~460 MB, but the
second (JPEG) pass was flat at ~207 MB — i.e. V8 lazily expanded its heap, outputs were not retained
in JS (they are written to disk and dropped). Steady-state memory is flat in N. Peak is dominated by
the one-time image encode. **Follow-ups for Phase 6:** cache font bytes, avoid re-parsing the PDF
template per file where possible, `await` a macrotask tick per item, and re-measure on a real
device/Hermes.

**Decision:** adopt `pdf-lib@1.17.1` (MIT) with `@pdf-lib/fontkit@1.1.1`. `@cantoo/pdf-lib` stays
the fallback if a bug appears (R2).

## S3 — Complex-script shaping via Skia 🟡 (proxy, verified programmatically)

Command: `cd spikes && node s3-shaping/run.js && node s3-shaping/verify.mjs`.

Because the build machine/model cannot display images, correctness was verified **programmatically**
with HarfBuzz (the same shaper Skia uses) and by cross-checking advance widths against CanvasKit
(Skia compiled to WASM), which shares `@shopify/react-native-skia`'s shaping stack.

At 300 DPI (scale 300/72), 37 pt:

| Case (text) | codepoints | HarfBuzz glyphs | HB width (pt) | CanvasKit width (pt) | verdict |
|---|---|---|---|---|---|
| മലയാളം | 6 | 6 | 159.0 | 159.0 | 1:1 (no conjunct in word) |
| സ്ത്രീ ക്ഷേത്രം | 14 | 11 | 258.9 | 258.9 | ligature ✅ |
| தமிழ் | 5 | 4 | 103.7 | 103.7 | ligature ✅ |
| ஸ்ரீ க்ஷேத்திரம் | 15 | 9 | 286.9 | 286.9 | ligature ✅ |
| हिन्दी | 6 | 5 | 69.5 | 69.5 | ligature ✅ |
| क्षत्रिय श्री | 12 | 7 | 123.2 | 123.2 | ligature ✅ |

- **Glyph substitution confirmed:** conjunct-heavy strings map to fewer glyphs than base codepoints
  (e.g. സ്ത്രീ ക്ഷേത്രം: 14→11, ஸ்ரீ க்ஷேத்திரம்: 15→9), i.e. conjuncts form real ligatures.
- **Same shaper confirmed:** HarfBuzz advance widths equal CanvasKit paragraph widths to 0.1 pt —
  CanvasKit/Skia is using HarfBuzz GSUB.
- Screenshots (PNG, transparent, 300 DPI) and an end-to-end PDF embedding them are committed at
  `docs/assets/spikes/s3/` (`malayalam-conjunct.png`, `tamil-conjunct.png`,
  `devanagari-conjunct.png`, `shaped-samples.pdf`, …). **A human should still eyeball these.**
- Skia offscreen Paragraph → PNG → `pdf-lib.embedPng` total for 7 samples: **1.7 s** (one-time).

API note discovered: in `canvaskit-wasm` the working path is
`FontMgr.FromData([...fonts])` + `ParagraphBuilder.Make(style, fontMgr)`;
`TypefaceFontProvider` + `MakeFromFontProvider` did **not** resolve families in this build.

**Decision:** adopt the Skia shaped pipeline. On-device Skia (`@shopify/react-native-skia@2.14.0`)
must still be confirmed in Phase 3 (API names differ slightly); fallback is native text-to-bitmap.

## S4 — ZIP + export 🟡 (fallback validated in Node)

Command: `cd spikes && node s4-zip/run.js` · results: `docs/assets/spikes/s4-results.json`.

Primary plan is a **native streaming zipper** (`react-native-zip-archive@9.5.3`, over a folder on
disk) — needs a device. The documented fallback, **`fflate@0.8.3` streaming to disk**, was measured:

| Measurement | Value |
|---|---|
| 300 files (incl. Malayalam/Tamil/Devanagari names) | **44–66 ms**, 308 KB zip (~6,800 files/s) |
| RSS during zip | **flat ~71–73 MB** |
| Entries after unzip | 300, all names intact incl. `certificate_മലയാളം.pdf` |

**Decision:** use the native zipper on device; keep `fflate` streaming as the cross-platform
fallback and for CI. Non-Latin filenames survive UTF-8 ZIP entry names.

## S5 — Spreadsheet / CSV parsing ✅

Command: `cd spikes && node s5-sheets/run.js` · results: `docs/assets/spikes/s5-results.json`.
**8/8 checks pass.**

| Check | Result |
|---|---|
| `.xlsx`, 5,000 rows, name column | **299 ms**, 5,000 names, header skipped |
| UTF-8 **BOM** CSV | BOM stripped, `María García` intact |
| `Full Name` header + `nan` missing value | 5 names (missing dropped) |
| Case-insensitive dedupe | 5 → 4 |
| cp1252 CSV (no BOM) | decoded via UTF-8-strict→cp1252 fallback (`José Álvarez`, `Müller`) |
| tab-separated detection | detected (first line has tab, no comma) |
| single multi-line cell | split into `["Asha","Bharat","Chandra"]` |
| `cleanName` NBSP + whitespace + NFC | `A B C`, `é` |

**Important finding:** `jschardet@4.0.0` misdetected the cp1252 fixture as *Windows-1250 with 0.06
confidence* — unreliable. The deterministic **UTF-8-strict → cp1252 → latin-1** fallback (the
documented alternative) decoded it correctly. See ADR-0006.

**Decision:** `xlsx` (SheetJS, Apache-2.0) for `.xlsx`, `papaparse` (MIT) for CSV, and a **custom**
charset fallback in `src/core` — do **not** ship `jschardet` (also avoids its LGPL-2.1+ licence,
which conflicts with NFR-12).

## S6 — Offline release build ⛔ BLOCKED

- **Tried:** no Android SDK / EAS account on this machine, so no release APK could be produced and
  `dumpsys package` cannot be run.
- **Applied now:** the `app.config.ts` sketch blocks `android.permission.INTERNET` and
  `android.permission.ACCESS_NETWORK_STATE` when `EAS_BUILD_PROFILE === "production"`; OTA updates
  (`expo-updates`) are not installed; no `fetch`/XHR/WebSocket/analytics code is permitted and a CI
  offline-audit enforces it (Phase 1).
- **Owner action:** run `eas build -p android --profile production`, install, then
  `adb shell dumpsys package com.agni.certificategenerator | grep -i permission` and confirm no
  `INTERNET`. Also run the full flow in airplane mode (Phase 9, Appendix C).

---

## GitHub push commands (owner)

This environment could not create the remote repo (no `gh`, no token). To publish:

```bash
git remote add origin git@github.com:agni-007/certificate-generator-mobile.git
git push -u origin main
# optional: protect main (PR + CI required) after Phase 2
```

(Use the HTTPS URL if SSH keys are not configured:
`https://github.com/agni-007/certificate-generator-mobile.git`.)

## NFR-04 status after Phase 0

| Target | Phase 0 evidence | Status |
|---|---|---|
| 100 certs (A4, ~2 MB image, Latin) ≤ 60 s | Node: ~9–10 s (vector/JPEG) | likely ✅, confirm on device |
| UI ≥ 50 fps while generating | not testable here | pending Phase 5/6 |
| cold start ≤ 3 s | not testable here | pending Phase 1/9 |
| memory flat in N | Node steady-state flat; outputs streamed to disk | ✅ (confirm on device) |
