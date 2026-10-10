# Architecture Decision Records (ADRs)

Format: context → options tried → decision → consequences. Every spike outcome and every default
taken from `implementation.md` Section 14 is recorded here.

---

## ADR-0001: Local repo bootstrap (GitHub repo creation blocked)

- **Context:** `implementation.md` requires a new private GitHub repo
  `agni-007/certificate-generator-mobile`. The execution environment has `git` but **no `gh` CLI
  and no GitHub token**, and no non-interactive way to create a remote repo.
- **Options tried:** `gh repo create` (command not available); GitHub REST API (no token).
- **Decision:** initialise a **local** git repository on branch `main` with the project scaffold,
  and hand the owner exact push commands. Repo visibility: **private** (default per Section 14).
- **Consequences:** CI workflows are authored and committed but only run once the owner pushes to
  GitHub. Owner must run `git remote add` + `git push` (commands recorded in `docs/SPIKES.md`).

---

## ADR-0002: Node version pinned to 24.3.0

- **Context:** React Native 0.87.1 (Expo SDK 57) declares `engines.node = ^22.13.0 || ^24.3.0 || >=26.0.0`.
  The build machine shipped with Node 18.19.1.
- **Options tried:** Node 18 (fails RN engine range), Node 22 (also valid), Node 24 (current LTS line).
- **Decision:** pin `.nvmrc` to `24.3.0` — the minimum of the 24 line, valid for RN 0.87 and a
  long-term-support release. Core/spike code remains source-compatible with Node 18 so tests can
  run on the build machine too.
- **Consequences:** contributors need Node 24 for the full Expo toolchain; `test:core` and spikes
  also run on Node 18.

---

## ADR-0003: PDF engine = `pdf-lib` 1.17.1 (spike S2)

- **Context:** need a pure-JS, offline PDF engine that can embed a template page once and overlay text.
- **Options tried:** `pdf-lib@1.17.1` in Node (individual + merged, PDF and JPEG templates).
- **Decision:** adopt `pdf-lib@1.17.1` (MIT) + `@pdf-lib/fontkit@1.1.1`. Merged PDF embeds the
  template **once** (`embedPage` + `drawPage`), confirmed: 500 pages = 142 KB vs 6 KB one-page.
- **Consequences:** individual PDFs cost ~92–125 ms/file on Node/V8; ~420 MB peak RSS in Node
  (one-time image encode + V8 heap). Memory-optimisation and on-device re-measurement are Phase 6
  tasks. `@cantoo/pdf-lib` remains the fallback (R2).

## ADR-0004: Complex-script shaping via the Skia shaped pipeline (spike S3)

- **Context:** Latin vector text must stay vector, but Malayalam/Tamil/Devanagari need real shaping.
- **Options tried:** CanvasKit (Skia WASM) Paragraph offscreen render → PNG, cross-checked against
  HarfBuzz glyph output.
- **Decision:** adopt the **Skia shaped pipeline** (`@shopify/react-native-skia@2.14.0`): rasterise
  only the name to a transparent 300-DPI PNG, embed with `pdf-lib`. Selection per name via
  `needsShaping()`.
- **Consequences:** conjuncts form ligatures (verified: 14→11, 15→9 glyphs) and widths match
  HarfBuzz to 0.1 pt. On-device Skia API must be confirmed in Phase 3; fallback is native
  text-to-bitmap. `canvaskit-wasm` uses `FontMgr.FromData` + `ParagraphBuilder.Make`.

## ADR-0005: ZIP = native zipper on device, `fflate` fallback (spike S4)

- **Context:** must never hold a whole archive in JS memory.
- **Options tried:** `fflate@0.8.3` streaming to disk in Node (300 files, 44–66 ms, flat ~72 MB RSS).
- **Decision:** primary = native streaming zipper (`react-native-zip-archive@9.5.3`) over a folder on
  disk; `fflate` streaming remains the cross-platform fallback/CI path.
- **Consequences:** non-Latin UTF-8 entry names preserved. Native path still needs device verification.

## ADR-0006: Sheets stack = `xlsx` + `papaparse` + custom charset fallback (spike S5)

- **Context:** parse `.xlsx`, UTF-8 (with/without BOM), cp1252, tab-separated offline. NFR-12 bans
  copyleft licences.
- **Options tried:** `xlsx@0.18.5` (5,000 rows in 299 ms), `papaparse@5.7.0`, and `jschardet@4.0.0`.
- **Decision:** use `xlsx` + `papaparse`; implement the **custom** charset fallback
  (UTF-8-strict → cp1252 table → latin-1) in `src/core` and **do not ship `jschardet`**.
- **Consequences:** `jschardet` misdetected the cp1252 fixture as Windows-1250 (confidence 0.06) and
  is LGPL-2.1+ (licence conflict). `xlsx` npm registry copy is noted as potentially stale vs the
  SheetJS CDN tarball — revisit at Phase 1 pin time (see DEPENDENCIES.md).

## ADR-0007: Spikes S1 and S6 blocked → documented fallbacks applied

- **Context:** no Android SDK/emulator/device and no EAS credentials in this environment.
- **Options tried:** none runnable.
- **Decision:** proceed with `react-native-pdf-thumbnail` primary + custom Expo module fallback for
  S1, behind the `PdfRasteriser` port (a fake is used in CI). Implement the offline manifest block
  and offline-audit now; owner runs the release-build permission check and airplane-mode test.
- **Consequences:** S1 timing target and S6 permission assertion remain unverified until a device/CI
  build is available; tracked in PROGRESS.md.

## ADR-0008: NFR-04 performance targets kept, to be re-confirmed on device

- **Context:** Phase 0 could only measure in Node/V8.
- **Decision:** keep the documented targets (100 certs ≤ 60 s, cold start ≤ 3 s, UI ≥ 50 fps),
  noting Node evidence (~9–10 s for 100 certs) and deferring device confirmation to Phases 1/5/6/9.
- **Consequences:** if Hermes is significantly slower, revise here with measurements (do not silently
  change the stack).
