# Progress log

## Current phase: 3 — Fonts and shaped pipeline
## Next task: Phase 3 device pass — verify Skia shaping + overlay placement on Android/iOS, then Phase 4 (storage/state)

> Resume point for a new session. Newest entries at the bottom.

### 2026-10-10 — repo/bootstrap: local git init + base files
- Changes: initialised local git repo (`main`); added `README.md`, `.gitignore`, `.editorconfig`,
  `.nvmrc` (Node 24.3.0), `LICENSE_DECISION.md`, `docs/` skeletons; committed `implementation.md`.
- Verified: `git status` clean after commits.
- Open issues: GitHub repo `agni-007/certificate-generator-mobile` **not created** (no `gh`/token).
  Push commands in `docs/SPIKES.md#github-push-commands-owner`.
- Decisions logged: docs/DECISIONS.md#adr-0001-local-repo-bootstrap

### 2026-10-10 — Phase 0 spike workspace
- Changes: `spikes/` workspace with pinned deps (`pdf-lib`, `@pdf-lib/fontkit`, `xlsx`,
  `papaparse`, `fflate`, `canvaskit-wasm`, `harfbuzzjs`, `jpeg-js`), shared lib, four executable
  spikes (S2–S5) and one verifier. Copied Noto fixtures. Removed `sharp` (needs Node ≥20; not an
  app dep).
- Verified: all runnable spikes pass.
- Open issues: S1 and S6 need a device/EAS and are blocked here.
- Decisions logged: docs/DECISIONS.md#adr-0002-node-version-pinned-to-2430

### 2026-10-10 — Phase 0 results (S1–S6)
- Changes: wrote `docs/SPIKES.md` with numbers; committed S3 screenshots + result JSON under
  `docs/assets/spikes/`; added ADR-0003…0008; updated `docs/DEPENDENCIES.md`.
- Verified:
  - S2 ✅ pdf-lib 1.17.1: vector 92 ms/file, JPEG template 104 ms/file (100 files ≈ 9–10 s);
    merged PDF template stored once (6 KB → 142 KB for 500 pages); peak ~420 MB in Node.
  - S3 🟡 Skia/CanvasKit shaping: conjuncts form ligatures (14→11, 15→9 glyphs); HarfBuzz widths
    == CanvasKit widths to 0.1 pt; PNGs + `shaped-samples.pdf` committed.
  - S4 🟡 fflate streaming fallback: 300 files in 44–66 ms, flat ~72 MB RSS, non-Latin names intact.
  - S5 ✅ 8/8 checks: xlsx 5,000 rows in 299 ms; BOM, cp1252, tab-separated, multi-line cell,
    dedupe, missing values, NFC.
  - S1 ⛔ / S6 ⛔ blocked (no device/SDK); fallbacks applied and documented.
- Open issues: on-device S1 timing, S3 Skia native API, S4 native zipper, S6 permission check all
  pending a device/CI build. `pdfjs-dist` (parity tests) needs Node ≥22.13 → runs on CI Node 24.
- Decisions logged: docs/DECISIONS.md#adr-0003 … #adr-0008

### 2026-10-10 — Pushed repo to GitHub
- Changes: added remote `origin` → https://github.com/agni-007/Certificate-generator-mobile.git and
  pushed `main` (3 commits).
- Verified: `git push` succeeded.

### 2026-10-10 — Phase 1: Expo scaffold + tooling + CI + offline audit
- Changes:
  - Root project pinned to Expo SDK 57 (`expo@57.0.27`, `react@19.2.3`, `react-native@0.86.3`,
    `expo-router@57.0.25`, `typescript@6.0.3`, `nativewind@4.2.7` + `tailwindcss@3.4.19`,
    `@shopify/react-native-skia@2.6.2`, `jest@30.5.2` + `jest-expo@57.0.5`, `pdf-lib@1.17.1`, …).
    1586 packages installed.
  - Config: `app.config.ts` (prod-only `blockedPermissions` for INTERNET/ACCESS_NETWORK_STATE,
    `updates.enabled:false`), `eas.json`, `tsconfig.json`/`tsconfig.jest.json`, `babel.config.js`,
    `metro.config.js`, `tailwind.config.js`, `global.css`, `eslint.config.js` (flat), `.prettierrc`.
  - App routes: `app/_layout.tsx` (safe-area + class-based dark mode), `app/index.tsx`, plus stubs
    `onboarding`, `settings`, `project/[id]`, `project/[id]/generate`.
  - `src/core/`: `types.ts`, `constants.ts` (12 standard fonts, A4, limits, defaults), `errors.ts`
    (Appendix A catalogue + `AppError`) with unit tests. `src/platform/ports.ts` port interfaces.
  - `src/ui/`: `theme/tokens.ts`, `components/Screen.tsx` + RNTL test.
  - `scripts/offline-audit.ts` + allowlist: fails on fetch/XHR/WebSocket/axios/telemetry/OTA/remote
    URLs and forbidden deps. `.github/workflows/ci.yml` (Node from `.nvmrc`; lint, format:check,
    typecheck, test:core, offline-audit).
- Verified locally (Node 18.19.1): `npm run lint` ✅, `npm run format:check` ✅, `npm run typecheck` ✅,
  `npm test` ✅ (3 suites / 9 tests), `npm run offline-audit` ✅ (21 files, clean).
- Open issues / notes:
  - Local machine has Node 18.19.1 (< required ≥20.19.4 for RN 0.86.3) → install only warned;
    authoritative runs are on CI Node 24.3.0 (`.nvmrc`).
  - TypeScript 6 no longer auto-includes `@types/*` → tsconfigs set `"types": ["node","jest"]`.
  - RNTL v14 `render` is async; safe-area-context mocked in `jest.setup.ts`.
  - `newArchEnabled` removed (New Architecture is always on in SDK 57).
  - `pdfjs-dist` parity tests still deferred to CI (needs Node ≥22.13).
- Decisions logged: docs/DECISIONS.md#adr-0009-… (SDK 57 pinning, TS 6 types, offline-audit)

### 2026-10-10 — Phase 2: Core engine (pure TS)
- Changes:
  - `src/core/`: `validation.ts` (extension/magic/size), `names/*` (clean, dedupe, parseText,
    parseCsv, parseXlsx, column select, tab detection, limits, charset fallback), `filename.ts`,
    `style.ts`, `geometry.ts`, `math.ts`, `pdf/*` (vector, merged, imageToPdf, draw, template,
    pageSize, fonts).
  - `scripts/parity-check.ts` + `scripts/parity-fixtures/` (pdf.js placement parity).
  - Quality gate: `jest.config.js` coverage threshold (85 % lines/stmts/funcs, 75 % branches);
    CI runs `test:parity`; `package.json` adds `test:parity`.
- Verified (Node 18.19.1 + shim): `test:core` ✅ (111 tests, 97 % coverage), `test:parity` ✅
  (3/3 alignments ≤ 0.5 pt), `typecheck` ✅, `lint` ✅, `offline-audit` ✅.
- Decisions logged: docs/DECISIONS.md#adr-0013

### 2026-10-10 — Phase 3: Fonts and shaped pipeline
- Changes:
  - Bundled 12 OFL fonts under `src/assets/fonts/` + `LICENSES/` (`OFL-Noto.txt`,
    `OFL-GreatVibes.txt`, `NOTICE.txt`): Noto Serif/Sans/Mono, Great Vibes, and Noto Sans for
    Malayalam/Tamil/Devanagari/Bengali/Telugu/Kannada/Gujarati/Gurmukhi.
  - `src/core/shaping.ts` (script detection, `needsShaping`, coverage), `src/core/fontCatalog.ts`
    (bundled font metadata + `fontSupports`), `src/core/fontFile.ts` (sfnt magic + `name`-table
    parser), `src/core/pdf/overlay.ts` (shaped PNG embedding sharing `placeText`); vector/merged
    renderers accept an optional overlay.
  - Platform adapters: `src/platform/fontRegistry.ts` (Metro assets + sandbox imports) and
    `src/platform/shapedText.ts` (Skia offscreen paragraph → transparent PNG).
- Verified (Node 18.19.1): `npm test` ✅ (13 suites / 146 tests), `test:core:cov` ✅ (~97 %),
  `typecheck` ✅, `lint` ✅, `format:check` ✅, `test:parity` ✅, `offline-audit` ✅ (63 files).
- Open issues: on-device Skia rasterisation, coloured-baseline alignment and S1/S6 remain blocked
  (no device). A cmap-based custom-font coverage check is backlog (ADR-0016).
- Decisions logged: docs/DECISIONS.md#adr-0014 … #adr-0016
