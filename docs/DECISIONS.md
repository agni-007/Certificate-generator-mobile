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

## ADR-0009: Pin Expo SDK 57 exactly; no caret ranges in the app

- **Context:** offline reproducibility and a stable native toolchain; Expo's `bundledNativeModules`
  is authoritative for `expo-*` versions.
- **Options tried:** ranges (`^`) vs exact pins; NativeWind 4 (Tailwind 3.4.19) vs NativeWind 5 RC.
- **Decision:** exact pins for all runtime/dev deps (`expo@57.0.27`, `react@19.2.3`,
  `react-native@0.86.3`, `expo-router@57.0.25`, `typescript@6.0.3`, `@shopify/react-native-skia@2.6.2`,
  `nativewind@4.2.7` + `tailwindcss@3.4.19`, `pdf-lib@1.17.1`, …). Commit `package-lock.json`.
- **Consequences:** deterministic installs. `react-test-renderer` pinned to `19.2.3` to match
  `react`'s peer range. `newArchEnabled` dropped from `app.config.ts` (always on in SDK 57).

## ADR-0010: TypeScript 6 requires explicit `types` and forbids `baseUrl`

- **Context:** `typescript@6.0.3` (Expo SDK 57 template) deprecates `baseUrl` (TS5101) and no longer
  auto-includes `node_modules/@types/*` globally.
- **Options tried:** keeping `baseUrl` (fails typecheck); relying on auto-inclusion (breaks `node:fs`,
  `describe`, `console`).
- **Decision:** remove `baseUrl` (paths resolve relative to tsconfig), set
  `"types": ["node", "jest"]`; `tsconfig.jest.json` also sets `"ignoreDeprecations": "6.0"` for its
  CommonJS/`node` resolution.
- **Consequences:** typecheck is clean. Any new ambient type package must be added to `types`.

## ADR-0011: Offline guarantee = offline-audit + production manifest block

- **Context:** "no network" must be enforced, not just asserted.
- **Options tried:** manifest-only vs audit + manifest.
- **Decision:** `scripts/offline-audit.ts` (run in CI) fails on
  `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/`axios`, telemetry SDK names, OTA/`expo-updates`,
  remote URLs, and forbidden dependencies; `app.config.ts` blocks
  `INTERNET`/`ACCESS_NETWORK_STATE` when `EAS_BUILD_PROFILE === "production"`, and
  `updates.enabled: false`.
- **Consequences:** known-safe URL literals go in `scripts/offline-audit.allowlist.json`.

## ADR-0012: Testing = Jest 30 with two projects (core `ts-jest`, app `jest-expo`)

- **Context:** core must run headless on Node (no RN), UI needs a React Native environment.
- **Options tried:** single project vs split.
- **Decision:** `jest.config.js` defines `core` (ts-jest, `node` env, `src/core/**/*.test.ts`) and
  `app` (jest-expo, `src/ui/**/*.test.tsx`); module aliases mapped; `jest.setup.ts` mocks
  `react-native-safe-area-context`. RNTL v14 `render` is awaited.
- **Consequences:** `npm test` runs both; `npm run test:core` is the CI core gate.

## ADR-0013: Phase 2 core engine + placement parity gate

- **Context:** the pure core (validation, names, filename, style, geometry, pdf pipelines) must run
  in Node and match the web app's placement to ≤ 0.5 pt.
- **Options tried:** Jest-only assertions vs an independent PDF parser.
- **Decision:** keep `src/core` RN-free with 85 % coverage on `src/core`; add `scripts/parity-check.ts`
  (`npm run test:parity`) which parses generated PDFs with `pdfjs-dist` and asserts
  `placeText` coordinates equal the PDF text-item transform within 0.5 pt for left/center/right.
  The vector and merged pipelines share `placeText`; a single template page is embedded once.
- **Consequences:** CI runs the parity check on Node 24 (the local machine's Node 18 runs it behind a
  `Promise.withResolvers` shim). Quality gate: `test:core` green + coverage ≥ 85 %.

## ADR-0014: Bundled OFL font set (Phase 3)

- **Context:** Latin + 8 Indic scripts must shape correctly offline, with permissive licences.
- **Options tried:** system fonts (unavailable/nondeterministic) vs bundling a curated OFL set.
- **Decision:** bundle the Noto family (Sans/Serif/Mono + Malayalam, Tamil, Devanagari, Bengali,
  Telugu, Kannada, Gujarati, Gurmukhi) and Great Vibes, all OFL-1.1. `src/core/fontCatalog.ts` holds
  pure metadata (id, family, scripts, file name); `src/platform/fontRegistry.ts` maps file names to
  Metro assets and persists user imports under `documents/fonts/`. Licence files live in
  `src/assets/fonts/LICENSES/`.
- **Consequences:** the app ships ~2.9 MB of fonts. A script list (not a parsed cmap) drives
  `fontSupports` for bundled fonts; custom fonts are trusted and routed through the shaped pipeline
  when they contain complex characters.

## ADR-0015: Shaped pipeline wiring and overlay geometry

- **Context:** the Skia-shaped name must land in the PDF at the same position the vector pipeline
  would place text.
- **Options tried:** re-implement placement for images vs reuse `placeText`.
- **Decision:** `core/shaping.ts` decides per name (`needsShaping`); `core/pdf/overlay.ts` reuses
  `placeText` with the measured width and aligns the PNG's alphabetic baseline
  (`yLower = yPdf - heightPt + baselinePt`). `renderCertificatePdf`/`renderMergedPdf` accept an
  optional overlay. The `ShapedTextRenderer` port is implemented by
  `src/platform/shapedText.ts` using Skia `Surface.MakeOffscreen` + `TypefaceFontProvider`.
- **Consequences:** both pipelines share one geometry source of truth, so parity holds for overlays.
  On-device verification of Skia rasterisation and coloured-baseline placement remains a Phase 3
  device task (no device in this environment).

## ADR-0016: Custom font import validation without a cmap parser

- **Context:** FR-14 requires `.ttf`/`.otf` import; `fontSupports` needs coverage knowledge.
- **Options tried:** parse the `cmap` for exact coverage vs validate + parse the `name` table only.
- **Decision:** `src/core/fontFile.ts` validates the sfnt magic (`00 01 00 00`, `OTTO`, `true`,
  `ttcf`) and reads family/subfamily/full names from the `name` table. Bundled fonts use their
  declared script lists; custom fonts have unknown coverage and are treated as shaped-pipeline
  candidates for complex scripts, while Latin custom text still embeds via pdf-lib.
- **Consequences:** imports are rejected early on corrupt files and named in the UI. A cmap-based
  coverage check is backlog; for now Skia renders missing glyphs as tofu rather than throwing.
