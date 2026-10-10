/**
 * Platform ports (implementation.md Section 4.2). Core and use-cases depend on
 * these interfaces only; concrete RN/Expo adapters live alongside this file and
 * are injected. Tests use in-memory fakes.
 *
 * These interfaces are pure TypeScript declarations — no react-native/expo imports.
 */

import type { Project, TemplateRef } from "@core/types";

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export interface FilePicker {
  /** System document picker (Files/Photos). */
  pickTemplate(): Promise<PickedFile | null>;
  pickSpreadsheet(): Promise<PickedFile | null>;
  /** Optional custom .ttf/.otf import (FR-14). */
  pickFont(): Promise<PickedFile | null>;
}

export interface FileStore {
  /** Read a file into memory (template bytes, sheet bytes). */
  readBytes(uri: string): Promise<Uint8Array>;
  writeBytes(path: string, bytes: Uint8Array): Promise<void>;
  /** Append/stream a chunk (used by batch output). */
  appendBytes(path: string, bytes: Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
  remove(path: string): Promise<void>;
  makeDir(path: string): Promise<void>;
  removeDir(path: string): Promise<void>;
  listDir(path: string): Promise<string[]>;
  /** Free bytes available on the volume holding `path`. */
  availableBytes(path: string): Promise<number>;
  /** App sandbox directories. */
  paths: {
    documents: string;
    cache: string;
  };
  join(...parts: string[]): string;
}

export interface RasterisedPage {
  /** Absolute path to the rendered PNG. */
  path: string;
  widthPx: number;
  heightPx: number;
}

export interface PdfRasteriser {
  /** Rasterise page 1 of a PDF (path or bytes) for the editor preview. */
  renderFirstPage(pdfUri: string, targetWidthPx: number): Promise<RasterisedPage>;
}

export interface ShapedTextResult {
  /** Transparent PNG bytes of the tightly-cropped shaped name. */
  png: Uint8Array;
  /** Measured width in points at the requested fontSize. */
  widthPt: number;
  /** Measured height in points at the requested fontSize. */
  heightPt: number;
  /** Distance from the top of the image to the alphabetic baseline, in points. */
  baselinePt: number;
}

export interface ShapedTextRenderer {
  /** Lay out + rasterise a name at `fontSizePt` and `dpi`. */
  render(
    text: string,
    font: string,
    fontSizePt: number,
    color: string,
    dpi: number,
  ): Promise<ShapedTextResult>;
  /** Whether the loaded font set can display every code point in `text`. */
  supports(text: string, font: string): boolean;
}

export interface Zipper {
  /** Zip a directory into `outZipPath`; report 0..1 progress. */
  zipDirectory(dir: string, outZipPath: string, onProgress?: (p: number) => void): Promise<void>;
}

export interface Sharer {
  shareFile(uri: string, mimeType: string, title?: string): Promise<void>;
  /** Android SAF: copy `files` into a user-chosen directory. */
  saveToDirectory?(files: string[], mimeType: string): Promise<void>;
  saveImagesToLibrary?(files: string[]): Promise<void>;
}

export interface FontAsset {
  id: string;
  family: string;
  /** App-sandbox path to the .ttf/.otf. */
  path: string;
  /** Comma-separated scripts, e.g. "latin,malayalam". */
  scripts: string;
  bundled: boolean;
}

export interface FontRegistryPort {
  /** Load all bundled + imported fonts at startup. */
  load(): Promise<void>;
  list(): Promise<FontAsset[]>;
  get(id: string): FontAsset | undefined;
  /** Whether the font can display every code point in `text`. */
  fontSupports(fontId: string, text: string): boolean;
  /** Register and persist a newly imported font file. */
  register(picked: PickedFile): Promise<FontAsset>;
  remove(id: string): Promise<void>;
}

export interface StoragePort {
  run(sql: string, params?: unknown[]): Promise<void>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export interface IdGenerator {
  uuid(): string;
}

export interface Clock {
  now(): number;
}

export interface Ports {
  picker: FilePicker;
  fileStore: FileStore;
  pdfRasteriser: PdfRasteriser;
  shapedText: ShapedTextRenderer;
  zipper: Zipper;
  sharer: Sharer;
  fonts: FontRegistryPort;
  storage: StoragePort;
  ids: IdGenerator;
  clock: Clock;
}

export type { Project, TemplateRef };
