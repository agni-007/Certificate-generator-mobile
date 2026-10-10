# Certificate Generator Mobile: Implementation Specification

> **Audience:** an autonomous AI coding agent (Claude Code, Codex, Cursor, etc.) plus the human owner.
> **Goal:** build a **fully offline** Android + iOS app that does everything the existing web app does (bulk personalised certificates from a template + a list of names), with no server, no network calls, and no data leaving the device.
> **New repo (create this first):** `agni-007/certificate-generator-mobile`
> **Reference implementation (read-only, for behaviour parity):** `https://github.com/agni-007/Certificate-generator` (FastAPI + PyMuPDF backend, Next.js frontend).

---

## 0. How the agent must work (read first)

1. **Work in phases (Section 11), in order.** Finish a phase's Definition of Done (DoD) before starting the next. Commit after every task with a Conventional Commit message (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
2. **Keep `PROGRESS.md` at the repo root.** After each task, append: date, task id, what changed, what was verified, open issues. This is how a new session resumes.
3. **Do not guess library versions or APIs.** At scaffold time, look up the latest stable versions (npm / official docs) and **pin exact versions**. Where this document gives API sketches, treat them as pseudocode and check current docs.
4. **Phase 0 (spikes) decides the risky technology choices.** Record every outcome in `docs/DECISIONS.md` (ADR style: context, options tried, decision, consequences). If a spike fails, use the fallback listed for it. Do not silently change the stack.
5. **Core logic is pure TypeScript with no React Native imports** (`src/core`). It must be unit-testable in Node/Jest. Native or platform-specific code goes behind small interfaces in `src/platform`.
6. **Never add network code.** No `fetch`, `XMLHttpRequest`, WebSocket, analytics, crash reporters, remote fonts, remote images, or CDN scripts. A CI check enforces this (Section 9).
7. **Tests are part of every task.** Core code needs unit tests; UI flows need at least a smoke test. Do not mark a task done with failing tests, type errors, or lint errors.
8. **Do not stop to ask questions.** Where a decision is open, use the default in Section 14 ("Open decisions and defaults"), write it down in `docs/DECISIONS.md`, and continue.
9. **Prefer small, boring, well-maintained dependencies.** Every added dependency needs a one-line justification in `docs/DEPENDENCIES.md` (name, version, license, why, alternative).
10. **When blocked** (native build failure, API missing), log it in `PROGRESS.md`, apply the documented fallback, and continue with unblocked work.

---

## 1. Product overview

### 1.1 Problem
Event organisers, teachers and club leads must issue dozens to thousands of certificates. They have a designed template (PDF/PNG/JPG) and a list of names. They want each name placed precisely on the template and exported as individual files, ideally from a phone, without internet and without uploading personal data anywhere.

### 1.2 Goals
- G1. 100% offline operation after install. Airplane mode works for every feature.
- G2. Feature parity with the web app (Section 2), plus mobile-native conveniences (share sheet, files app, saved projects).
- G3. Correct rendering of Latin **and** complex scripts (Malayalam, Tamil, Devanagari, Arabic as stretch) with proper shaping.
- G4. Handles large batches without running out of memory: memory use must stay flat as the number of names grows.
- G5. Fast, touch-first positioning of the name on a live preview.

### 1.3 Non-goals (v1)
- Accounts, cloud sync, collaboration, analytics, ads, payments.
- Online template marketplace, QR/verification servers, email sending.
- Editing the template itself (we only overlay text on it).
- Web or desktop builds (mobile only; architecture should not preclude them).

### 1.4 Personas
- **Club/event lead (primary):** non-technical, phone-first, 20 to 500 names, needs to finish in minutes.
- **Teacher/admin:** imports names from Excel exported by school software (may be tab-separated), needs Indic-script names to render correctly.
- **Power user:** reuses the same template monthly, wants saved projects and presets.

---

## 2. Behaviour parity reference (the existing web app)

Port these behaviours exactly unless Section 2.2 says otherwise.

### 2.1 Behaviours to preserve

| Area | Behaviour |
|---|---|
| Templates | PDF, PNG, JPG, JPEG. Max 25 MB. Validate extension **and** magic bytes (`%PDF-`, PNG signature `89 50 4E 47 0D 0A 1A 0A`, JPEG `FF D8 FF`). Only page 1 of a PDF is used. |
| Image to page | Image becomes a one-page PDF. DPI from image metadata, clamped to 72 to 600, default 300. Transparent images are flattened onto white. |
| Names input | Typed/pasted one per line, or `.xlsx` / `.csv`. Max 2,000 names (configurable). Max name length 120 chars. |
| Spreadsheet parsing | Column named `name` (case-insensitive; also `names`, `full name`, `fullname`, `student name`), else the first column. Drop a leading header row that equals `name`. Handle UTF-8 BOM. CSV encodings tried in order: utf-8-sig, utf-8, cp1252, latin-1. Detect **tab-separated** files (first line has a tab and no comma). A single cell containing a multi-line block of names is split into lines. Missing-value strings (`nan`, `none`, `null`, `nat`) are dropped. |
| Name cleaning | Replace NBSP with space, collapse whitespace, Unicode NFC, truncate to 120 chars. Spreadsheet imports are de-duplicated case-insensitively, preserving order. |
| Text style | Position `x`, `y` as **percent of page (0 to 100)**; `x` is the alignment anchor, `y` is the **vertical centre** of the text line. Font from the 14 standard PDF fonts (12 offered: Times, Helvetica, Courier in regular/bold/italic/bold-italic variants). Font size 6 to 200 pt (default 37). Colour as hex (default `#ffffff`). Alignment left/center/right (default center). Defaults: x=50, y=52, font `times-italic`. |
| Text placement | `baseline_from_top = pageHeight * (y/100) + fontSize/3`. Start X = anchor (left), anchor minus width/2 (center), anchor minus width (right). Clamp start X and baseline to >= 0. |
| Output | One PDF per name, named `certificate_<safe_name>.pdf`. Safe name keeps letters/digits of any script plus space, `_`, `.`, `-`; repeated separators collapse to `_`; trimmed; max 80 chars; empty becomes `unnamed`; spaces become `_`; collisions get `_2`, `_3`, ... |
| Bundle | All PDFs packed into `certificates.zip` under a `certificates/` folder. |
| Preview | Template shown to scale. Drag or tap to position; arrow keys / nudge buttons move 0.5% (shift = 2%); a "centre" button snaps to x=50, y=52. A live text overlay updates instantly; an exact render replaces it after the user stops (debounced). |
| Errors | User-facing messages listed in Appendix A (reuse verbatim where applicable). |

### 2.2 Intentional deviations (improvements for mobile)

1. **Orientation-aware page fit.** The web app shrinks any image to fit portrait A4 (595.28 x 841.89 pt), so a landscape A4 image becomes about 70% size. Mobile: fit within A4 **in the image's own orientation** (long side <= 841.89, short side <= 595.28), never enlarge. Make this a setting "Normalise image templates to A4" (default on), with an "Original size" option.
2. **Output formats:** PDF (individual, default), **single merged PDF** (one page per name, template embedded once), PNG, JPG.
3. **Complex-script shaping** via the shaped pipeline (Section 7.4). The web app cannot do this.
4. **Auto-fit:** optional "shrink long names to fit a max width" (percent of page width).
5. **Dedupe** is a toggle and also applies to typed names (default: warn and let the user choose).
6. **Saved projects** and presets (template + names + style).

---

## 3. Software Requirements Specification (SRS)

### 3.1 Functional requirements

Priority: **M** = must (v1), **S** = should (v1 if time), **C** = could (v1.1).

| ID | Requirement | Pri |
|---|---|---|
| FR-01 | Pick a template from device storage (Files/Photos) via system picker. Accept PDF, PNG, JPG, JPEG. | M |
| FR-02 | Validate template (type, magic bytes, size <= 25 MB, openable). Show friendly errors. | M |
| FR-03 | Render page 1 of the template as a preview image. | M |
| FR-04 | Enter names manually (multiline text), live count shown. | M |
| FR-05 | Import names from `.xlsx` and `.csv` (incl. tab-separated, BOM, multiple encodings) following Section 2.1 rules. | M |
| FR-06 | Show an imported-names review list: count, duplicates flagged, empty rows removed, truncation warnings. | S |
| FR-07 | Configure style: font, size, colour (picker + hex), alignment. | M |
| FR-08 | Position the name by dragging on the preview; nudge buttons; centre snap; numeric X/Y entry. | M |
| FR-09 | Preview uses a sample (first) name and updates live; cycle through names with prev/next. | M |
| FR-10 | Generate certificates fully on-device with progress, cancel, and no UI freeze. | M |
| FR-11 | Output format options: individual PDFs, merged PDF, PNG, JPG. Image output DPI selectable (150/200/300). | M (PDF), S (others) |
| FR-12 | Package outputs as ZIP, or save into a user-chosen folder, or share via the system share sheet. | M |
| FR-13 | Correct rendering of Latin and complex scripts (Malayalam, Tamil, Devanagari at minimum). Bundled fonts. | M |
| FR-14 | Import custom `.ttf`/`.otf` fonts and use them. | S |
| FR-15 | Save/open/duplicate/delete projects (template, names, style, output settings) locally. | M |
| FR-16 | Style presets (save current style under a name). | S |
| FR-17 | Resume: if the app is killed mid-generation, offer to resume or discard. | S |
| FR-18 | Settings: theme (system/light/dark), language, default output format, A4 normalisation, dedupe behaviour, max names guard. | M |
| FR-19 | Localisation: English at launch; Malayalam as first additional language (i18n infrastructure required in v1). | S |
| FR-20 | Onboarding: three-step first-run walkthrough, skippable. | S |
| FR-21 | Multiple text fields per certificate (name + date + custom text) with per-field style. | C |
| FR-22 | Per-row spreadsheet columns bound to fields (mail-merge). | C |
| FR-23 | QR code field (offline generation) for verification IDs. | C |
| FR-24 | Placeholder-text replacement: detect and remove a placeholder string in the PDF template (feature of the original `script.py`). | C |

### 3.2 Non-functional requirements

| ID | Requirement | Target / measure |
|---|---|---|
| NFR-01 | **Offline** | Release builds request no network permission (Android) and make no network calls (verified by CI scan + manual airplane-mode run). |
| NFR-02 | **Privacy** | No telemetry, no third-party SDKs that phone home. All data stays in the app sandbox or user-chosen locations. Privacy policy: "collects nothing". |
| NFR-03 | **Memory** | Peak memory flat in N (names). 500 certificates must complete on a 3 to 4 GB RAM device without OOM. Outputs are streamed to disk one at a time. |
| NFR-04 | **Performance** | Targets to validate in Phase 0, then lock: 100 certificates (A4, ~2 MB image template, Latin) in <= 60 s on a mid-range Android; UI stays >= 50 fps while generating; cold start <= 3 s. |
| NFR-05 | **Responsiveness** | Dragging the name on the preview updates at display frame rate (no network round trip, no re-render of the template). |
| NFR-06 | **Fidelity** | Preview text position equals output position within 0.5% of page width/height. Verified by automated parity tests. |
| NFR-07 | **Accessibility** | Screen reader labels on all controls; minimum 44 x 44 pt touch targets; contrast ratio >= 4.5:1; supports system font scaling to 200% without clipping; alternatives to dragging (nudge buttons, numeric entry). |
| NFR-08 | **Compatibility** | Support the minimum OS versions of the chosen Expo SDK (check docs at scaffold). Phones and tablets; portrait and landscape. |
| NFR-09 | **Reliability** | No crash on corrupt template, empty names, huge names, emoji, RTL text, or a full disk (show a clear error and stop cleanly). |
| NFR-10 | **App size** | Target <= 60 MB download (fonts dominate; subset where licences allow). |
| NFR-11 | **Maintainability** | TypeScript strict mode, ESLint + Prettier, core coverage >= 85% lines, no `any` in `src/core`. |
| NFR-12 | **Licensing** | Only permissive/OFL-compatible dependencies and fonts. No AGPL/GPL libraries in the shipped binary (PyMuPDF is intentionally **not** used). Record licences in `docs/DEPENDENCIES.md`. |

### 3.3 Constraints and assumptions
- Single codebase for Android and iOS.
- Developer machine: any OS; iOS builds need macOS or a cloud build service (EAS Build).
- Publishing to the App Store needs an Apple Developer account; Play Store needs a Google Play developer account. Check current fees at release time.
- Users may have no internet at the moment of use, but the **install** can be online.

---

## 4. Architecture and tech stack

### 4.1 Decision summary

| Concern | Choice | Why | Fallback / alternative |
|---|---|---|---|
| Framework | **React Native + Expo (TypeScript, managed workflow + development builds / EAS)** | Owner knows React/TS; the web UI concepts (components, state) port directly; one codebase for both OSes. Native modules need a dev build, not Expo Go. | Flutter (rewrite UI; pure-Dart PDF libs exist). Capacitor around a static Next.js export (fast but weak native PDF/zip/file handling). |
| Navigation | Expo Router (file-based) | Standard for Expo | React Navigation |
| Language | TypeScript, `strict: true` | Safety | none |
| Styling | NativeWind (Tailwind for RN) with design tokens from Section 8.2 | Reuses the web app's Tailwind vocabulary | StyleSheet + tokens |
| State | Zustand (+ immer) | Small, simple | Redux Toolkit |
| Persistence | `expo-sqlite` (projects, presets, fonts index) + file system for blobs. Small settings via `expo-sqlite/kv-store` or MMKV | Offline, transactional | AsyncStorage |
| PDF engine | **`pdf-lib`** (MIT) with `@pdf-lib/fontkit` for embedded TTF/OTF | Pure JS, runs offline in Hermes, can embed an existing PDF page once and reuse it | `@cantoo/pdf-lib` (maintained fork) if the original has bugs; native PDF modules (Android `PdfDocument`, iOS `PDFKit`/`UIGraphicsPDFRenderer`) wrapped via Expo Modules API |
| Text shaping + overlay raster | **`@shopify/react-native-skia`** (offscreen surface + Paragraph API, HarfBuzz shaping) | Correct Indic/Arabic shaping; produces a transparent PNG of the name to overlay | Pre-shaped glyph paths via native text layout; WebView canvas (last resort) |
| PDF page to image (preview) | `react-native-pdf-thumbnail` or a thin custom Expo module over Android `PdfRenderer` / iOS `PDFKit` | Needed to show a PDF template in the editor | Embed `react-native-pdf` viewer for preview only |
| Image handling | `expo-image-manipulator`, `expo-image` | Resize/recompress templates, fast display | Skia image decoding |
| File picking | `expo-document-picker` | System picker | none |
| File system | `expo-file-system` (use the current stable API surface; check docs) | Read/write/streaming, SAF on Android | `react-native-blob-util` |
| ZIP | A native streaming zipper (e.g. `react-native-zip-archive`) over a folder on disk | Never holds the whole archive in JS memory | `fflate` streaming in JS (slower, check memory) |
| Spreadsheets | **SheetJS (`xlsx`)** installed from the official SheetJS CDN tarball (the npm registry copy is outdated; check current guidance) for `.xlsx`; **`papaparse`** for CSV | Offline, robust | `read-excel-file`, `exceljs` |
| Charset detection | `jschardet` or a small custom UTF-8/cp1252 fallback | CSV from legacy software | `TextDecoder` with fallbacks |
| Gestures/animation | `react-native-gesture-handler` + `react-native-reanimated` | 60 fps drag | PanResponder |
| Colour picker | Small custom component (hue/sat/brightness + hex input) | No heavy dependency | `reanimated-color-picker` |
| i18n | `i18next` + `react-i18next` + `expo-localization` | Standard | `lingui` |
| Sharing | `expo-sharing`, `expo-media-library` (image outputs to gallery, optional) | System share sheet | none |
| Testing | Jest (+ `ts-jest`/`jest-expo`), React Native Testing Library, **Maestro** for E2E, `pdfjs-dist` in Node tests to assert PDF text positions | Fast core tests + real device flows | Detox |
| Lint/format | ESLint (strict TS rules), Prettier, `tsc --noEmit` | Quality gate | none |
| CI/CD | GitHub Actions + EAS Build/Submit | Reproducible builds | local builds |

### 4.2 Layered architecture

```text
┌──────────────────────────────────────────────────────────┐
│ UI layer (Expo Router screens, components, NativeWind)   │
└───────────────▲──────────────────────────────────────────┘
                │ hooks / stores (Zustand)
┌───────────────┴──────────────────────────────────────────┐
│ Application layer: use-cases                              │
│ importTemplate, importNames, renderPreview, runBatch,     │
│ exportBatch, saveProject, loadProject                     │
└───────────────▲──────────────────────────────────────────┘
                │ pure functions + interfaces
┌───────────────┴──────────────────────────────────────────┐
│ Core (pure TS, no RN imports): geometry, validation,      │
│ filename, parser, style, pdf pipeline (pdf-lib),          │
│ batch planner, error catalogue                            │
└───────────────▲──────────────────────────────────────────┘
                │ interfaces (ports)
┌───────────────┴──────────────────────────────────────────┐
│ Platform adapters (RN/Expo): FileStore, PdfRasteriser,    │
│ ShapedTextRenderer (Skia), Zipper, Picker, Sharer,        │
│ FontRegistry, Storage (SQLite)                            │
└──────────────────────────────────────────────────────────┘
```

Rules: UI never calls pdf-lib or the file system directly. Core never imports `react-native` or `expo-*`. Adapters are injected, so Jest can use in-memory fakes.

### 4.3 Generation pipelines

Two interchangeable pipelines behind one interface (`CertificateRenderer`):

- **Vector pipeline (default for Latin text):** pdf-lib draws the name as real text with an embedded font. Small files, selectable text, crisp at any zoom.
- **Shaped pipeline (auto-selected when the name contains complex-script characters, or when the chosen font requires shaping):** Skia lays out and rasterises **only the name** into a transparent PNG at 300 DPI (tightly cropped), pdf-lib embeds that PNG as an image on the template page at the computed position. The template stays vector; only the name is raster.

Selection rule: per name, `needsShaping(name)` returns true if it contains any code point in Indic blocks (U+0900 to U+0DFF), Arabic blocks (U+0600 to U+06FF, U+0750 to U+077F, U+FB50 to U+FDFF, U+FE70 to U+FEFF), Thai/Lao/Khmer/Myanmar, or any char the selected font lacks. Mixed batches are fine.

### 4.4 Memory strategy (critical)
- Load template bytes **once**. For image templates, recompress/resize once (max long side 3508 px unless "Original size"), cache the result file on disk.
- **Individual PDFs:** per name, create a new `PDFDocument`, embed the template page, draw the name, `save()`, write to disk, drop all references, `await` a macrotask tick. Never accumulate outputs in memory.
- **Merged PDF:** build one document; embed the template page **once** with `embedPage`, then `addPage` + `drawPage` per name (the XObject is shared, so file size grows by only the text). For very large N, split into chunks (e.g. 250 pages per file) and say so in the UI.
- ZIP is built natively from the output folder on disk.
- Process in chunks of 10 to 25 names; yield to the event loop between chunks so progress and cancel remain responsive.

---

## 5. Repository setup

### 5.1 Create the repo
- Name: **`certificate-generator-mobile`** (owner: `agni-007`), public or private (owner's choice; default **private** until licences are reviewed).
- Default branch `main`. Protect `main` after Phase 2 (PRs + CI required). Work on short-lived branches `phase-N/<topic>`.
- Add: `README.md`, `LICENSE` (owner chooses; placeholder `LICENSE_DECISION.md` listing MIT vs Apache-2.0 vs proprietary), `.gitignore` (Node, Expo, iOS/Android build outputs), `.editorconfig`, `.nvmrc`.

### 5.2 Folder structure

```text
certificate-generator-mobile/
├─ app/                          # Expo Router routes
│  ├─ _layout.tsx
│  ├─ index.tsx                  # Projects (home)
│  ├─ onboarding.tsx
│  ├─ settings.tsx
│  └─ project/
│     ├─ [id].tsx                # Editor (tabs: Template | Names | Style | Preview)
│     └─ [id]/generate.tsx       # Generate + export
├─ src/
│  ├─ core/                      # PURE TS (no RN imports)
│  │  ├─ constants.ts            # limits, defaults, font table
│  │  ├─ errors.ts               # AppError + message catalogue
│  │  ├─ validation.ts           # magic bytes, extensions, size
│  │  ├─ names/                  # clean, dedupe, parseText, parseCsv, parseXlsx
│  │  ├─ filename.ts             # safeFilename, uniqueName
│  │  ├─ style.ts                # TextStyle, normalizeColor, buildStyle
│  │  ├─ geometry.ts             # placement math, page fit
│  │  ├─ pdf/                    # vector renderer, merged renderer, image->pdf
│  │  ├─ shaping.ts              # needsShaping(), script detection
│  │  ├─ batch.ts                # planner, chunking, progress events
│  │  └─ types.ts
│  ├─ platform/                  # RN adapters implementing core ports
│  │  ├─ ports.ts                # interfaces
│  │  ├─ fileStore.ts
│  │  ├─ pdfRasteriser.ts
│  │  ├─ shapedText.ts           # Skia
│  │  ├─ zipper.ts
│  │  ├─ picker.ts
│  │  ├─ sharer.ts
│  │  ├─ fonts.ts
│  │  └─ db.ts
│  ├─ app/                       # use-cases + stores
│  │  ├─ usecases/
│  │  └─ stores/
│  ├─ ui/                        # components, theme, hooks
│  │  ├─ components/
│  │  ├─ theme/
│  │  └─ i18n/
│  └─ assets/fonts/              # bundled OFL fonts + LICENSES
├─ __tests__/ (or colocated *.test.ts)
├─ e2e/                          # Maestro flows
├─ docs/
│  ├─ DECISIONS.md
│  ├─ DEPENDENCIES.md
│  ├─ ARCHITECTURE.md
│  └─ SPIKES.md
├─ scripts/                      # offline-audit, font-subset, parity-fixtures
├─ app.config.ts
├─ eas.json
├─ PROGRESS.md
└─ implementation.md             # this file
```

---

## 6. Data model and storage

### 6.1 Types (core)

```ts
export type Alignment = "left" | "center" | "right";
export type FontKey =
  | "times" | "times-italic" | "times-bold" | "times-bolditalic"
  | "helvetica" | "helvetica-bold" | "helvetica-oblique" | "helvetica-boldoblique"
  | "courier" | "courier-bold" | "courier-oblique" | "courier-boldoblique"
  | `custom:${string}`      // user-imported or bundled Unicode font id
  | `bundled:${string}`;

export interface TextStyle {
  x: number;            // 0..100, alignment anchor, percent of page width
  y: number;            // 0..100, vertical centre of the line, percent of page height
  font: FontKey;
  fontSize: number;     // points, 6..200
  color: string;        // normalised "#rrggbb"
  alignment: Alignment;
  maxWidthPct?: number; // optional auto-fit width (10..100)
}

export type OutputFormat = "pdf-individual" | "pdf-merged" | "png" | "jpg";

export interface OutputSettings {
  format: OutputFormat;
  imageDpi: 150 | 200 | 300;
  normaliseToA4: boolean;
  zip: boolean;               // bundle into a ZIP when true
  fileNamePattern: string;    // default "certificate_{name}"
}

export interface Project {
  id: string;                 // uuid
  title: string;
  createdAt: number;
  updatedAt: number;
  template?: { path: string; originalName: string; kind: "pdf" | "image";
               pageWidthPt: number; pageHeightPt: number; previewPath: string };
  names: string[];
  style: TextStyle;
  output: OutputSettings;
}

export interface BatchProgress {
  done: number; total: number; currentName?: string;
  state: "idle" | "running" | "cancelling" | "done" | "error";
  error?: string;
}
```

### 6.2 SQLite schema

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, title TEXT NOT NULL,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  template_json TEXT, style_json TEXT NOT NULL, output_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_names (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL, name TEXT NOT NULL,
  PRIMARY KEY (project_id, idx)
);
CREATE TABLE IF NOT EXISTS presets (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, style_json TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fonts (
  id TEXT PRIMARY KEY, family TEXT NOT NULL, path TEXT NOT NULL,
  scripts TEXT NOT NULL,            -- comma list e.g. "latin,malayalam"
  bundled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS batch_runs (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL, started_at INTEGER NOT NULL,
  total INTEGER NOT NULL, done INTEGER NOT NULL, status TEXT NOT NULL, out_dir TEXT NOT NULL
);
```

Add a `schema_version` pragma and an ordered migrations array from day one.

### 6.3 File layout on device (app sandbox)

```text
<documents>/projects/<id>/template.<ext>      # original copy
<documents>/projects/<id>/template.norm.jpg   # normalised image template (if applicable)
<documents>/projects/<id>/preview.png
<cache>/batch/<runId>/out/…                   # generated files; cleaned after export
<documents>/fonts/<fontId>.ttf                # imported fonts
```

Cleanup rules: delete `<cache>/batch/*` older than 24 h at launch; delete a project's folder on project delete.

---

## 7. Core engine design

### 7.1 Geometry (must match the web app)

```ts
// Page coordinates for pdf-lib use a bottom-left origin; the web app used top-left.
export function placeText(opts: {
  pageW: number; pageH: number; x: number; y: number;
  fontSize: number; textWidth: number; alignment: "left" | "center" | "right";
}) {
  const anchorX = opts.pageW * (opts.x / 100);
  let startX = anchorX;
  if (opts.alignment === "center") startX = anchorX - opts.textWidth / 2;
  if (opts.alignment === "right") startX = anchorX - opts.textWidth;
  const centerY = opts.pageH * (opts.y / 100);
  const baselineFromTop = centerY + opts.fontSize / 3;
  return {
    x: Math.max(0, startX),
    yPdf: opts.pageH - Math.max(0, baselineFromTop), // convert to bottom-left origin
  };
}
```

Unit-test with the same numbers the web backend produces (Section 12.2).

### 7.2 Template ingestion
1. Read bytes; `validateTemplate(name, bytes)` (extension, magic bytes, size).
2. **PDF:** load with pdf-lib, read page 1 width/height (respect `/Rotate`; if rotated 90/270 swap width/height and note it). Rasterise page 1 for preview via `PdfRasteriser`.
3. **Image:** decode dimensions + DPI (read PNG `pHYs` / JPEG JFIF density; default 300, clamp 72 to 600). Flatten transparency on white. Resize/recompress once with `expo-image-manipulator` (cap long side at 3508 px, JPEG quality ~0.88; keep PNG only if the image has flat colours and is small). Page size in pt = `px * 72 / dpi`, then apply the A4 fit rule (Section 2.2 #1).
4. Persist normalised template + preview + page size in the project.

### 7.3 Vector pipeline (pdf-lib)

```ts
// pseudocode, check pdf-lib's current API when implementing
const out = await PDFDocument.create();
out.registerFontkit(fontkit);
const [embeddedPage] = await out.embedPdf(templatePdfBytes, [0]); // or embedJpg/embedPng for images
const page = out.addPage([pageW, pageH]);
page.drawPage(embeddedPage, { x: 0, y: 0, width: pageW, height: pageH });
const font = await out.embedFont(fontBytesOrStandardFont, { subset: true });
const width = font.widthOfTextAtSize(name, fontSize);
const pos = placeText({ pageW, pageH, x, y, fontSize, textWidth: width, alignment });
page.drawText(name, { x: pos.x, y: pos.yPdf, size: fontSize, font, color: rgb(r, g, b) });
const bytes = await out.save({ useObjectStreams: true });
```

Notes: standard fonts use WinAnsi, so names with characters outside it must go to a Unicode font (route to the shaped pipeline or an embedded Unicode TTF). Embed fonts with `subset: true` to keep files small.

### 7.4 Shaped pipeline (Skia overlay)
1. Build a Skia paragraph with the selected font (bundled Noto family for the detected script), font size = `fontSize` pt rendered at 300 DPI (scale factor `300/72`), colour, no wrapping.
2. Measure width/height from the paragraph; apply auto-fit if `maxWidthPct` set.
3. Rasterise to an offscreen transparent surface sized to the text bounds plus a small padding; encode PNG.
4. Compute placement using the **measured width in points** (`widthPx * 72/300`) with `placeText`; embed the PNG with `out.embedPng` and `page.drawImage` at the computed position (height in points likewise; align the visual baseline using the paragraph's alphabetic baseline).
5. Cache overlay PNGs by `(name, font, size, colour)` within a batch run only.

Verification: render "മലയാളം", "தமிழ்", "हिन्दी" and a conjunct-heavy sample; check by eye that conjuncts and vowel signs are correctly formed (not isolated base characters). Record screenshots in `docs/SPIKES.md`.

### 7.5 Names parsing (port from the web app)
- Pure functions: `cleanName`, `dedupeNames`, `parseText(text)`, `parseCsv(bytes)`, `parseXlsx(bytes)`, `selectNameColumn(headers)`, `looksTabSeparated(bytes)`, `enforceLimit(names, max)`.
- Decode CSV: strip BOM; try UTF-8 strictly; on failure try cp1252 then latin-1 (use a decoder table for cp1252).
- XLSX: read the first sheet, force every cell to string (preserve leading zeros, no date coercion for text cells).
- Guard: reject files > 10 MB; guard against pathological XLSX (cap sheet rows scanned at e.g. 100,000).

### 7.6 Batch runner
```ts
interface BatchJob { runId: string; project: Project; names: string[]; outDir: string; }
async function runBatch(job: BatchJob, deps: Ports, onProgress: (p: BatchProgress) => void, signal: AbortSignal) {
  // chunk loop: render -> write -> release -> progress -> yield
}
```
- Cancellation via `AbortSignal`; on cancel, stop after the current item, keep produced files, offer "export what was generated".
- Persist `batch_runs` row every chunk for resume (FR-17).
- Keep the screen awake during a run (`expo-keep-awake`). Declare that long runs may be interrupted when the app is backgrounded and rely on resume; do not promise background execution in v1.

### 7.7 Export
- **ZIP:** zip `<cache>/batch/<runId>/out` natively to `certificates.zip`, then open the share sheet.
- **Folder (Android):** Storage Access Framework directory permission; copy files into the chosen directory.
- **iOS:** share sheet / "Save to Files"; additionally expose the app's documents folder in Files (`UIFileSharingEnabled`, `LSSupportsOpeningDocumentsInPlace`).
- **Images:** optionally save PNG/JPG to the photo library (ask permission only at that moment).

---

## 8. UX and design document

### 8.1 Principles
Clarity over cleverness; one primary action per screen; never lose the user's work (autosave); explain errors in plain language with a next step; preview is the hero.

### 8.2 Design tokens (carry over the web app's look)

| Token | Light | Dark |
|---|---|---|
| `accent-600` | `#4f46e5` | `#818cf8` |
| `accent-700` | `#4338ca` | `#6366f1` |
| `accent-50/100` | `#eef2ff` / `#e0e7ff` | `#1e1b4b` / `#312e81` |
| `bg` | `#f8fafc` | `#0b1220` |
| `surface` | `#ffffff` | `#111827` |
| `border` | `#e2e8f0` | `#243044` |
| `text` / `text-muted` | `#0f172a` / `#64748b` | `#e5e7eb` / `#94a3b8` |
| `danger` / `success` | `#dc2626` / `#047857` | `#f87171` / `#34d399` |

Type scale: system font; 12/14/16/20/24. Radius: 12 (cards), 16 (sheets), full (pills). Spacing: 4-pt grid. Minimum touch target 44 pt.

### 8.3 Screen map

```text
Onboarding (first run) ─▶ Projects (home) ─▶ Editor ─▶ Generate/Export
                              │                ▲
                              ├─▶ Settings     └─ tabs: Template | Names | Style | Preview
                              └─▶ New project
```

### 8.4 Screens

**Projects (home).** List of saved projects (thumbnail from preview, title, name count, updated date). FAB "New certificate batch". Swipe actions: duplicate, delete (with undo snackbar). Empty state: illustration + "Create your first batch".

**Editor.** Top: project title (editable). Segmented tabs, but on tablets/landscape show a two-pane layout (controls left, preview right).
- *Template tab:* big dropzone-style button "Choose template (PDF/PNG/JPG)", file info, replace/remove, size warning, A4 normalisation switch.
- *Names tab:* multiline input with live count; buttons "Import Excel/CSV" and "Clear"; dedupe banner ("12 duplicates, remove?"); a review sheet listing names with search, edit, delete.
- *Style tab:* font picker (grouped: Standard, Indian scripts, Custom), size slider + numeric field, colour swatches + hex, alignment segmented control, optional "shrink to fit width", preset save/apply.
- *Preview tab (also persistent above controls on phones):* template to scale; draggable name chip; X/Y readout; nudge pad (0.5%, long-press repeat, 2% step toggle); "Centre" button; sample-name stepper (prev/next); pinch-zoom the preview for precision.

**Generate/Export.** Summary (N certificates, format, template), format picker, ZIP toggle, big "Generate" button. During run: progress bar, "42 / 300", current name, Cancel. On done: success card with **Share ZIP**, **Save to folder**, **Open folder** and "Start new batch". Error state: reason + Retry + "Keep what was generated".

**Settings.** Theme, language, default output, A4 normalisation, dedupe behaviour, manage fonts (import/remove), storage usage + "Clear cache", About (version, licences, "No data leaves your device").

### 8.5 Wireframes (phone, Editor / Preview)

```text
┌─────────────────────────────┐
│ ‹  Annual Day Certificates ✎│
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │      [template image]   │ │
│ │                         │ │
│ │     ⟦ Sample Name ⟧     │ │  ← draggable
│ │                         │ │
│ └─────────────────────────┘ │
│ X 50.0%  Y 52.0%   ‹ 1/120 ›│
│      ▲                      │
│   ◀ ⊕ Center ▶              │
│      ▼                      │
├─────────────────────────────┤
│ Template │ Names │ Style │ ▶│
└─────────────────────────────┘
```

### 8.6 Interaction details
- Drag: pan gesture on the preview; the name chip follows the finger with an offset so it is not hidden under it; haptic tick at 50% guides (centre lines appear when within 1%).
- Live overlay is a Skia/Text element drawn above the template image; the **exact** render (same code path as export) replaces it after 300 ms of inactivity. If the exact render fails, keep the overlay and show a subtle warning icon.
- Autosave on every change (debounced 500 ms).
- Destructive actions confirm with undo where possible.

### 8.7 States to implement everywhere
Empty, loading (skeleton), error (message + action), disabled (explain why via helper text), success, offline (no-op: the app is always offline; never show "no connection" messages).

### 8.8 Accessibility and i18n
- Labels/roles/hints for all controls; announce progress milestones; respect reduce-motion; support dynamic type.
- All strings in `src/ui/i18n/<lang>.json`; no concatenated sentences; plural rules via i18next; dates/numbers via `Intl`.
- RTL-ready layout (logical start/end) even if no RTL UI language ships in v1.

---

## 9. Offline guarantee and privacy

1. **Android:** block `INTERNET` (and `ACCESS_NETWORK_STATE`) in the production manifest. In `app.config.ts`, use `android.blockedPermissions`. Development builds need network for Metro, so apply the block only when `process.env.EAS_BUILD_PROFILE === "production"` (or `APP_VARIANT=release`). Verify debug still works.
2. **iOS:** no App Transport Security exceptions; no background modes; no tracking-usage description; `PrivacyInfo.xcprivacy` declares no collected data and lists required-reason API usage honestly.
3. **CI "offline audit" script (`scripts/offline-audit.ts`)** fails the build if the source or dependency tree includes: `fetch(`, `XMLHttpRequest`, `WebSocket`, `axios`, `sentry`, `firebase`, `analytics`, `expo-updates`/OTA configuration, remote URLs in assets (`http://`, `https://` in `src/` except in licence text and docs). Maintain an allow-list file with justifications.
4. **Manual check (Phase 9):** run the full flow in airplane mode on one Android and one iOS device.
5. Disable OTA updates (`expo-updates`) in v1 to keep the "no network" claim literal.
6. **Store listing / privacy policy:** "Data not collected. Everything is processed on your device."

---

## 10. Configuration snippets

```ts
// app.config.ts (sketch; verify keys against current Expo docs)
import { ExpoConfig } from "expo/config";
const isProd = process.env.EAS_BUILD_PROFILE === "production";

const config: ExpoConfig = {
  name: "Certificate Generator",
  slug: "certificate-generator-mobile",
  scheme: "certgen",
  version: "1.0.0",
  orientation: "default",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.agni.certificategenerator", // owner may change
    supportsTablet: true,
    infoPlist: {
      UIFileSharingEnabled: true,
      LSSupportsOpeningDocumentsInPlace: true,
    },
  },
  android: {
    package: "com.agni.certificategenerator",
    blockedPermissions: isProd
      ? ["android.permission.INTERNET", "android.permission.ACCESS_NETWORK_STATE"]
      : [],
  },
  plugins: ["expo-router", "expo-font", "expo-sqlite", "expo-document-picker"],
  experiments: { typedRoutes: true },
};
export default config;
```

```json
// eas.json (sketch)
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal" },
    "production": { "autoIncrement": true }
  }
}
```

Scripts in `package.json`: `start`, `android`, `ios`, `lint`, `typecheck`, `test`, `test:core`, `offline-audit`, `e2e`.

---

## 11. Step-by-step implementation plan

Each task: do it, add tests, run `lint + typecheck + test`, commit, update `PROGRESS.md`.

### Phase 0: De-risking spikes (do not skip)
Build throwaway code in `spikes/` (not shipped) and write results into `docs/SPIKES.md`.

- **S1: PDF page to image on-device.** Try `react-native-pdf-thumbnail`. Success: a 1-page A4 PDF renders to a PNG in < 1.5 s on both OSes at ~1600 px width. Fallback: custom Expo module over `PdfRenderer` (Android) and `PDFKit` (iOS), or preview-only `react-native-pdf`.
- **S2: pdf-lib on Hermes.** Embed a PDF page and a 2 MB JPEG template, draw text with an embedded TTF, save 100 individual PDFs. Record time per file and peak memory. Also test merged-PDF with shared `embedPage` (100 and 500 pages) and confirm the template is stored once (file size). Fallback: `@cantoo/pdf-lib`; then native PDF modules.
- **S3: Skia shaping.** Offscreen render Malayalam, Tamil and Devanagari names to a transparent PNG with bundled Noto fonts; embed in a PDF; confirm correct conjuncts. Fallback: native text rendering to bitmap via Expo module.
- **S4: ZIP + export.** Zip a folder of 300 PDFs natively, share it (iOS + Android), and write to a SAF folder on Android. Fallback: `fflate` streaming.
- **S5: Spreadsheet parsing.** Parse `.xlsx` (5,000 rows), UTF-8 BOM CSV, cp1252 CSV, tab-separated file, in Hermes. Fallback library per Section 4.1.
- **S6: Offline build.** Produce a release-profile Android build with `INTERNET` blocked; confirm install and a PDF round trip works (`adb shell dumpsys package <pkg> | grep -i permission`).

**DoD:** `docs/SPIKES.md` records result, numbers, screenshots and the final decision for S1 to S6; `docs/DECISIONS.md` updated; performance targets in NFR-04 confirmed or revised.

### Phase 1: Scaffold and tooling
1. Create the repo, add base files (Section 5.1). Scaffold Expo + TypeScript + Expo Router with a development build. Pin exact versions.
2. Configure ESLint, Prettier, `tsc --noEmit`, Jest (core), React Native Testing Library, path aliases (`@core/*`, `@platform/*`, `@ui/*`).
3. GitHub Actions: install, lint, typecheck, `test:core`, offline-audit on every push/PR.
4. Add `docs/` skeletons, `PROGRESS.md`, `DEPENDENCIES.md`.
5. NativeWind + theme tokens + light/dark. A "Hello" screen renders on both OSes via dev build.

**DoD:** CI green; app launches on Android and iOS (or simulator/emulator) in light and dark.

### Phase 2: Core engine (pure TS, fully tested in Node)
1. `constants.ts`, `errors.ts` (Appendix A messages), `types.ts`.
2. `validation.ts` (extension, magic bytes, size) + tests.
3. `names/*` (clean, dedupe, text, csv, xlsx, column select, tab detection, limits) + tests including: BOM, cp1252, tab-separated, header row removal, single multi-line cell, `nan` strings, 2,000+ names, emoji, NFC normalisation.
4. `filename.ts` (safe name, collisions, Unicode kept, path separators removed, 80-char cap) + tests.
5. `style.ts` (`normalizeColor` accepts `#fff`, `#ffffff`, `rgb(…)`; clamps) + tests.
6. `geometry.ts` (`placeText`, `fitPage`, DPI clamp) + tests with numeric fixtures.
7. `pdf/vector.ts`, `pdf/merged.ts`, `pdf/imageToPdf.ts` using pdf-lib; Node-runnable. Standard fonts first, then bundled Unicode TTFs.
8. **Parity tests** (Section 12.2) comparing placement against fixtures produced by the web app.

**DoD:** `npm run test:core` green, coverage >= 85% on `src/core`; generating a 10-name PDF in Node opens correctly in a PDF viewer; parity tolerance <= 0.5 pt.

### Phase 3: Fonts and shaped pipeline
1. Bundle fonts (all OFL): Latin text families (a serif, a sans, a script/calligraphic, a monospace) and Noto Sans for Malayalam, Tamil, Devanagari, Bengali, Telugu, Kannada, Gujarati, Gurmukhi (add more later). Subset where licence permits to control size. Include each font's licence in `src/assets/fonts/LICENSES/`.
2. `FontRegistry`: load fonts at startup; map `FontKey` to bytes/paths; script coverage table; `fontSupports(fontKey, text)`.
3. `needsShaping()` + routing logic in `core/shaping.ts` (pure).
4. `platform/shapedText.ts` (Skia) implementing `ShapedTextRenderer`; overlay embed in pdf-lib; wire into the renderer by dependency injection.
5. Custom font import (FR-14): validate by magic bytes (`00 01 00 00`, `OTTO`, `true`, `ttcf`), copy into app storage, parse family name, register.
6. Visual verification fixtures in `docs/SPIKES.md` or `docs/FONT-TESTS.md` with screenshots.

**DoD:** Latin, Malayalam, Tamil, Devanagari names render correctly in generated PDFs on both OSes; mixed-script batch works; file sizes sane.

### Phase 4: Storage and state
1. `platform/db.ts` with migrations; repositories for projects, names, presets, fonts, batch runs.
2. `platform/fileStore.ts` with project folder management and cleanup rules (Section 6.3).
3. Zustand stores (`editorStore`, `settingsStore`, `batchStore`) with autosave subscriptions.
4. Use-cases: `createProject`, `importTemplate`, `importNames`, `updateStyle`, `duplicateProject`, `deleteProject`.

**DoD:** projects survive app restart; 2,000 names round-trip; delete removes files; migration test from v1 to v2 stub passes.

### Phase 5: UI (screens and components)
1. Shared components: `Button`, `Card`, `Section`, `Segmented`, `Slider`, `ColorPicker`, `FontPicker`, `Snackbar`, `EmptyState`, `ProgressBar`, `Sheet`.
2. Projects screen (list, FAB, swipe, empty state).
3. Editor shell with tabs/two-pane layout; Template tab (picker, validation, preview, errors).
4. Names tab (input, import, dedupe banner, review sheet).
5. Style tab (font, size, colour, alignment, presets, auto-fit).
6. Preview component: gesture-driven draggable name, guides, nudge pad (with long-press repeat), numeric X/Y, centre snap, sample stepper, pinch-zoom.
7. Exact-render debounce hook that uses the **same** renderer as export.
8. Settings screen; onboarding.

**DoD:** the whole editing flow works offline on device; drag is smooth (>= 50 fps on a mid-range device); every control has an accessibility label; screens match Section 8.

### Phase 6: Batch generation
1. `core/batch.ts`: chunk planner, cancellation, progress events; unit-tested with fake renderer.
2. Platform glue: per-item render, write, free, yield; wake lock; low-storage check before start (estimate `templateBytes * N` for individual PDFs; warn if > available).
3. Output formats: individual PDF, merged PDF (chunked), PNG, JPG.
4. Resume/discard flow from `batch_runs`.
5. Generate screen: summary, progress, cancel, error and partial-success states.

**DoD:** 500 names (Latin) complete without OOM on a 3 to 4 GB device; memory graph flat; cancel works within one item; killing and relaunching offers resume.

### Phase 7: Export and sharing
1. Native ZIP from folder, with progress.
2. Share sheet (`expo-sharing`), Android SAF "Save to folder", iOS Files exposure, optional gallery save for images.
3. Post-export cleanup of cache.

**DoD:** exported ZIP opens on a desktop with correct filenames (incl. non-Latin) in a `certificates/` folder; works on both OSes.

### Phase 8: Polish
1. i18n wiring; English complete; Malayalam translation file (machine-draft, flagged for human review in `docs/TRANSLATION.md`).
2. Dark mode audit, contrast audit, dynamic type at 200%, screen-reader pass (TalkBack + VoiceOver).
3. App icon, splash, store screenshots; empty/error copy review.
4. Error catalogue audit against Appendix A.

**DoD:** accessibility checklist (Appendix C) fully ticked.

### Phase 9: QA, hardening, release
1. E2E Maestro flows (Section 12.3) green on an Android emulator and an iOS simulator.
2. Fuzz/edge tests: corrupt PDF/PNG, 0-byte file, 25 MB template, 2,000 names, 120-char names, emoji, RTL, full-disk simulation.
3. Performance pass vs NFR-04; profile and fix hotspots.
4. Offline audit + airplane-mode manual run on real devices.
5. Licence review (`docs/DEPENDENCIES.md` complete); privacy policy text; store metadata.
6. EAS production builds; internal testing track / TestFlight; fix findings; tag `v1.0.0`.

**DoD:** all NFRs verified or consciously waived in `docs/DECISIONS.md`; release candidate installed from a store test track and used offline end to end.

---

## 12. Testing strategy

### 12.1 Unit (Jest, Node)
All of `src/core`. Table-driven tests for parsing, filenames, colour, geometry. Property-style tests for `safeFilename` (never contains path separators, never empty, max length) and `cleanName` (idempotent).

### 12.2 Parity tests against the web app
- In `scripts/parity-fixtures/`, store: a sample template PDF, a names CSV, style parameters, and **expected numbers** (start X, baseline Y, text width) derived from the reference backend (or computed by hand from the formula in Section 2.1).
- Test: generate with the TS engine, parse the output with `pdfjs-dist` (Node), extract text item coordinates, and assert they match expectations within 0.5 pt.
- Add a fixture for each alignment and for corner positions (x=0/100, y=0/100) to exercise clamping.

### 12.3 E2E (Maestro, real app)
Flows: (a) onboarding skip; (b) create project, pick template, paste 3 names, generate, share sheet appears; (c) import CSV, review duplicates; (d) change style and verify preview readout; (e) cancel mid-run; (f) resume after kill; (g) airplane mode full flow.

### 12.4 Manual device matrix
Android: one low-end (<= 3 GB RAM), one recent flagship. iOS: one older supported iPhone, one recent iPhone, one iPad. Test light/dark, 200% font scale, TalkBack/VoiceOver.

### 12.5 Quality gates (CI)
`lint`, `typecheck`, `test:core` (with coverage threshold), `offline-audit`, dependency licence check script. E2E on nightly or manual dispatch.

---

## 13. CI/CD and release

- **Branching:** trunk-based with short-lived feature branches; squash merge; Conventional Commits; auto-generated `CHANGELOG.md`.
- **Workflows:** `ci.yml` (quality gates), `build-preview.yml` (EAS preview build on demand), `release.yml` (tag to production build + submit).
- **Versioning:** semver; `versionCode`/`buildNumber` auto-incremented by EAS.
- **Secrets:** only store signing credentials in EAS/GitHub secrets; never commit keystores or provisioning profiles.
- **Distribution:** Android internal testing (and optional direct APK for sideloading); iOS TestFlight. Public listing after Phase 9 sign-off.
- **Store assets:** icon, 6.7"/6.5" and tablet screenshots, short/long description, privacy policy URL (a static page the owner hosts; the app itself never fetches it).

---

## 14. Open decisions and defaults

| Decision | Default (use this unless the owner overrides) |
|---|---|
| App name | "Certificate Generator" |
| Bundle/package id | `com.agni.certificategenerator` |
| Repo visibility | Private until licence review, then owner decides |
| Repo licence | Not chosen; ship `LICENSE_DECISION.md` and leave the owner to pick |
| Default output | Individual PDFs inside a ZIP |
| Image template normalisation | On (orientation-aware A4 fit) |
| Dedupe typed names | Warn, offer "Remove duplicates", default keep |
| Max names | 2,000 (setting, bounded by estimated disk usage) |
| UI languages v1 | English + Malayalam scaffold |
| Fonts | Noto family + 3 Latin display fonts, all OFL |
| Analytics / crash reporting | None |
| OTA updates | Disabled |

---

## 15. Risks and mitigations

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R1 | PDF page rasterisation for preview is unreliable across OSes | Medium / High | Spike S1; fallback custom Expo module over `PdfRenderer`/`PDFKit` |
| R2 | `pdf-lib` is slow or unmaintained | Medium / Medium | Spike S2; `@cantoo/pdf-lib`; native PDF module fallback behind `CertificateRenderer` |
| R3 | Skia shaping gaps for some scripts | Low-Med / Medium | Spike S3; per-script fonts; native text-to-bitmap fallback |
| R4 | OOM on large batches | Medium / High | Streaming per item, merged PDF with shared XObject, chunked yield, memory checks in Phase 6 |
| R5 | iOS background suspension kills long runs | Medium / Medium | Resume support; keep-awake; chunk persistence |
| R6 | Android scoped storage complexities | Medium / Medium | SAF directory picker; share-sheet fallback |
| R7 | Font/licence compliance | Low / High | Only OFL/Apache fonts; keep licence files; `DEPENDENCIES.md` audit |
| R8 | "Offline" claim broken by a dependency | Low / High | Offline-audit script + manifest checks + airplane-mode test |
| R9 | Expo/RN upgrade churn | Medium / Low | Pin versions; upgrade deliberately between phases only |
| R10 | Preview/export mismatch | Medium / High | Single renderer for preview-exact and export; parity tests |

---

## 16. Backlog (v1.1 and beyond)
Multiple text fields and mail-merge columns (FR-21/22); QR/verification code field (FR-23); placeholder-text replacement (FR-24); template library with bundled free templates; per-certificate PDF metadata (title, author); batch rename pattern builder; tablet-optimised multi-pane; watch-folder style "re-run last batch"; Android/iOS widgets; web/desktop builds sharing `src/core`; optional encrypted project export/import (still offline, file-based).

---

## Appendix A: Error message catalogue (reuse verbatim)

| Key | Message |
|---|---|
| `NO_TEMPLATE` | Please upload a certificate template. |
| `BAD_TEMPLATE` | Unsupported template format. Please upload PDF, PNG, JPG, or JPEG. |
| `NO_NAMES` | Please enter at least one name. |
| `EMPTY_SHEET` | No valid names were found in the uploaded file. |
| `BAD_SHEET` | Unable to read the uploaded Excel file. Please check the file and try again. |
| `BAD_SHEET_FORMAT` | Unsupported file format. Please upload an .xlsx or .csv file. |
| `GENERATION_FAILED` | Something went wrong while generating the certificates. Please try again. |
| `TEMPLATE_TOO_LARGE` | The certificate template is too large. |
| `SHEET_TOO_LARGE` | The uploaded Excel/CSV file is too large. |
| `TOO_MANY_NAMES` | Too many names in one request. |
| `BAD_FILE` | The uploaded file appears to be corrupted or is not a valid file. |
| `BAD_COLOR` | Invalid text colour. Please choose a colour. |
| `BAD_FONT` | Unsupported font. Please choose one of the listed fonts. |
| `BAD_ALIGNMENT` | Unsupported alignment. Use left, center or right. |
| `NO_UNICODE_FONT` (new) | This name uses characters the selected font cannot show. Choose a font that supports this script. |
| `LOW_STORAGE` (new) | Not enough free space for this batch. Free up space or reduce the number of names. |

(Adapt wording for mobile where "uploaded" does not fit, e.g. "selected", but keep the meaning.)

## Appendix B: Definition of Done (global)
- Code compiles in strict TS; lint and format clean.
- Unit tests for all new core logic; UI smoke test for new screens.
- No new network access; offline-audit passes.
- Accessibility labels present; works at 200% font scale.
- `PROGRESS.md` and relevant docs updated; dependency added to `DEPENDENCIES.md` with licence.
- Verified on at least one Android and one iOS target for any platform-touching change.

## Appendix C: Acceptance checklist for v1.0
- [ ] Airplane mode: complete flow works on Android and iOS.
- [ ] Release Android manifest has no `INTERNET` permission.
- [ ] Template: PDF, PNG, JPG, JPEG all work; corrupt files show friendly errors.
- [ ] Names: typed, CSV (UTF-8 BOM, cp1252, tab-separated), XLSX; duplicates handled.
- [ ] Style: all 12 standard fonts + bundled Unicode fonts; size, colour, alignment work.
- [ ] Preview position matches output within 0.5% (parity tests pass).
- [ ] Malayalam, Tamil, Devanagari names render with correct shaping.
- [ ] 500-name batch finishes without OOM on a low-end Android; memory flat.
- [ ] Cancel and resume work.
- [ ] ZIP, folder save (Android) and share sheet export work; non-Latin filenames intact.
- [ ] Projects persist across restarts; delete cleans files.
- [ ] Light/dark, TalkBack/VoiceOver, 200% font scale verified.
- [ ] Licences audited; privacy policy says no data collected.
- [ ] `docs/DECISIONS.md` records every spike outcome and deviation.

## Appendix D: `PROGRESS.md` template

```md
# Progress log

## Current phase: <N: name>
## Next task: <id and title>

### YYYY-MM-DD <task id>: <title>
- Changes: …
- Verified: tests / device / screenshots …
- Open issues: …
- Decisions logged: docs/DECISIONS.md#…
```
