# Architecture

Mirrors `implementation.md` Section 4. Updated as the build progresses.

## Layers

```text
UI layer (Expo Router screens, components, NativeWind)
  ▲ hooks / stores (Zustand)
Application layer: use-cases (importTemplate, importNames, renderPreview, runBatch, exportBatch, saveProject, loadProject)
  ▲ pure functions + interfaces
Core (pure TS, no RN/expo imports): geometry, validation, filename, parser, style, pdf pipeline (pdf-lib), batch planner, error catalogue
  ▲ interfaces (ports)
Platform adapters (RN/Expo): FileStore, PdfRasteriser, ShapedTextRenderer (Skia), Zipper, Picker, Sharer, FontRegistry, Storage (SQLite)
```

## Rules

1. UI never calls `pdf-lib` or the file system directly.
2. `src/core` never imports `react-native` or `expo-*`.
3. Adapters are injected through `src/platform/ports.ts`, so Jest runs core against in-memory fakes.

## Generation pipelines

Two interchangeable implementations behind one `CertificateRenderer` interface:

- **Vector pipeline (default, Latin):** `pdf-lib` draws real text with an embedded font.
- **Shaped pipeline (complex scripts):** Skia lays out + rasterises only the name to a transparent
  PNG at 300 DPI; `pdf-lib` embeds that PNG onto the template page. Template stays vector.

Selection is per name via `needsShaping(name)` (`src/core/shaping.ts`).

## Memory strategy

- Template bytes loaded once; image templates normalised once and cached on disk.
- Individual PDFs: one document per name, write, drop references, yield to the event loop.
- Merged PDF: template embedded once as a shared XObject (`embedPage` + `drawPage` per page).
- ZIP built natively from the output folder on disk.
- Chunk size 10–25 names; yield between chunks for progress/cancel.
