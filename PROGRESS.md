# Progress log

## Current phase: 1 — Scaffold and tooling (next)
## Next task: Phase 1.1 — scaffold Expo + TypeScript + Expo Router, pin versions

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
