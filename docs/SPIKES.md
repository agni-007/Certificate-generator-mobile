# Phase 0 — De-risking spikes

Environment note: this build machine has Node 18.19.1, `git`, `adb` (binary only) but **no Android
SDK, no emulator, no device, no macOS/Xcode, and no EAS credentials**. Therefore the spikes that
require a native runtime (S1, S3-on-Skia, S4-native, S6) are *partially* executed here and their
device-only parts are marked **BLOCKED**, with the documented fallback recorded. The pure-JS risks
(S2, S3 shaping-correctness, S5, S4-fallback) are executed for real with numbers below.

Status legend: ✅ executed with numbers · 🟡 partial · ⛔ blocked (no native runtime) — fallback applied.

| Spike | Status | Decision |
|---|---|---|
| S1 PDF page → preview image | ⛔ blocked (no device) | fallback: `react-native-pdf-thumbnail` primary; custom Expo module fallback |
| S2 pdf-lib individual + merged | ✅ | pdf-lib 1.17.1 |
| S3 Skia shaping (Indic) | 🟡 (CanvasKit/HarfBuzz proxy) | Skia Paragraph API; verify on device in Phase 3 |
| S4 ZIP + export | 🟡 (fflate in Node) | native zipper primary; fflate fallback |
| S5 spreadsheet parsing | ✅ | xlsx + papaparse + jschardet |
| S6 offline release build | ⛔ blocked (no SDK) | config verified by inspection; run pending owner CI/device |

(Filled in below as each spike completes.)
