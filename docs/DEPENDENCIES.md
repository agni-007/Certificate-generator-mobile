# Dependencies

Every runtime dependency: name, pinned version, licence, one-line justification, and the
alternative considered. Only permissive (MIT/BSD/ISC/Apache-2.0) and OFL-1.1 fonts are allowed
(no AGPL/GPL in the shipped binary).

> Versions were resolved from the npm registry (`npm view <pkg> version`) on 2026-10-10 and are
> pinned exactly in `package.json` / `spikes/package.json`.

| Package | Version | Licence | Why | Alternative considered |
|---|---|---|---|---|
| expo | 57.0.27 | MIT | Managed RN toolchain, EAS builds, native config plugins. | bare RN CLI |
| react | 19.3.0 | MIT | UI runtime required by RN 0.87. | — |
| react-native | 0.87.1 | MIT | Cross-platform native runtime. | Flutter |
| typescript | 7.0.2 | Apache-2.0 | Strict typing across core, platform and UI. | JSDoc + tsc |
| expo-router | 57.0.25 | MIT | File-based routing, standard for Expo. | react-navigation |
| zustand | 5.0.15 | MIT | Small state store. | Redux Toolkit |
| immer | 11.1.21 | MIT | Immutable updates in stores. | manual spreads |
| expo-sqlite | 57.0.4 | MIT | Offline transactional storage for projects/presets/fonts. | AsyncStorage |
| nativewind | 4.2.7 | MIT | Tailwind token styling reused from the web app. | StyleSheet |
| tailwindcss | 4.3.3 | MIT | Utility engine behind NativeWind. | — |
| pdf-lib | 1.17.1 | MIT | Pure-JS PDF creation/editing; embeds template page once, draws text. | @cantoo/pdf-lib |
| @pdf-lib/fontkit | 1.1.1 | MIT | TTF/OTF embedding + subsetting for `pdf-lib`. | fontkit (larger API) |
| @shopify/react-native-skia | 2.14.0 | MIT | HarfBuzz shaping + offscreen raster for complex scripts. | native text-to-bitmap |
| expo-document-picker | 57.0.3 | MIT | System file picker for templates/sheets. | react-native-document-picker |
| expo-file-system | 57.0.7 | MIT | Sandbox read/write + streaming; SAF on Android. | react-native-blob-util |
| expo-image-manipulator | 57.0.21 | MIT | One-time template resize/recompress. | Skia decode |
| expo-sharing | 57.0.22 | MIT | System share sheet for exports. | none needed |
| expo-localization | 57.0.4 | MIT | Locale detection for i18n. | — |
| xlsx (SheetJS) | 0.18.5 | Apache-2.0 | Robust `.xlsx` parsing offline. (Registry copy; CDN tarball is newer — see ADR-0006.) | exceljs |
| papaparse | 5.7.0 | MIT | Robust CSV parsing. | custom parser |
| fflate | 0.8.3 | MIT | Pure-JS streaming ZIP fallback (spike S4, ADR-0005). | native zipper |

> **Removed:** `jschardet@4.0.0` (LGPL-2.1+) was evaluated in spike S5 but is **not shipped**:
> it misdetected cp1252 (confidence 0.06) and its licence conflicts with NFR-12. The custom
> UTF-8-strict → cp1252 → latin-1 fallback in `src/core` replaces it (ADR-0006).

## Dev / test

| Package | Version | Licence | Why |
|---|---|---|---|
| jest | 30.5.2 | MIT | Test runner for core. |
| ts-jest | 29.4.14 | MIT | TypeScript transform for Jest. |
| typescript-eslint | pinned at Phase 1 | MIT | Strict TS lint rules. |
| prettier | pinned at Phase 1 | MIT | Formatting. |

## Phase 0 spike-only dev dependencies (`spikes/package.json`, never shipped)

| Package | Version | Licence | Why |
|---|---|---|---|
| canvaskit-wasm | 0.42.0 | BSD-3-Clause | Skia (WASM) proxy to validate complex-script shaping without a device. |
| harfbuzzjs | 1.6.3 | MIT (HarfBuzz "Old MIT") | Independent glyph-level shaping verification (spike S3). |
| jpeg-js | 0.4.4 | BSD-3-Clause | Encode a realistic multi-MB JPEG template fixture (CanvasKit's JPEG encoder is absent). |
| jschardet | 4.0.0 | LGPL-2.1+ | Evaluated then rejected (spike S5); not shipped. |
| pdfjs-dist | 6.4.299 (planned dev) | Apache-2.0 | Phase 2 parity tests parse output PDF text positions. Requires Node ≥22.13 (CI Node 24). |

## Fonts (all OFL-1.1, bundled)

Added in Phase 3; licences stored in `src/assets/fonts/LICENSES/`. Noto Sans family for Malayalam,
Tamil, Devanagari, Bengali, Telugu, Kannada, Gujarati, Gurmukhi + Latin display fonts.
