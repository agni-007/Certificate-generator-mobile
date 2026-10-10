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
| jschardet | 4.0.0 | LGPL-2.1+ | Charset detection for legacy CSVs. **Licence review required** (LGPL dynamic link OK, but flagged) — see ADR-0006. | small custom UTF-8/cp1252 fallback |
| fflate | 0.8.3 | MIT | Pure-JS streaming ZIP fallback (spike S4). | native zipper |

## Dev / test

| Package | Version | Licence | Why |
|---|---|---|---|
| jest | 30.5.2 | MIT | Test runner for core. |
| ts-jest | 29.4.14 | MIT | TypeScript transform for Jest. |
| typescript-eslint | pinned at Phase 1 | MIT | Strict TS lint rules. |
| prettier | pinned at Phase 1 | MIT | Formatting. |

## Fonts (all OFL-1.1, bundled)

Added in Phase 3; licences stored in `src/assets/fonts/LICENSES/`. Noto Sans family for Malayalam,
Tamil, Devanagari, Bengali, Telugu, Kannada, Gujarati, Gurmukhi + Latin display fonts.
