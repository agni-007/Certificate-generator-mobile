/**
 * Core data model (implementation.md Section 6.1).
 * This module is pure TypeScript: no react-native/expo imports.
 */

export type Alignment = "left" | "center" | "right";

export type StandardFontKey =
  | "times"
  | "times-italic"
  | "times-bold"
  | "times-bolditalic"
  | "helvetica"
  | "helvetica-bold"
  | "helvetica-oblique"
  | "helvetica-boldoblique"
  | "courier"
  | "courier-bold"
  | "courier-oblique"
  | "courier-boldoblique";

export type FontKey = StandardFontKey | `custom:${string}` | `bundled:${string}`;

export interface TextStyle {
  /** 0..100, alignment anchor, percent of page width. */
  x: number;
  /** 0..100, vertical centre of the line, percent of page height. */
  y: number;
  font: FontKey;
  /** Points, 6..200. */
  fontSize: number;
  /** Normalised "#rrggbb". */
  color: string;
  alignment: Alignment;
  /** Optional auto-fit max width, 10..100 (percent of page width). */
  maxWidthPct?: number;
}

export type OutputFormat = "pdf-individual" | "pdf-merged" | "png" | "jpg";

export type ImageDpi = 150 | 200 | 300;

export interface OutputSettings {
  format: OutputFormat;
  imageDpi: ImageDpi;
  normaliseToA4: boolean;
  /** Bundle outputs into a ZIP when true. */
  zip: boolean;
  /** Default: "certificate_{name}". */
  fileNamePattern: string;
}

export type TemplateKind = "pdf" | "image";

export interface TemplateRef {
  /** Absolute path in the app sandbox. */
  path: string;
  originalName: string;
  kind: TemplateKind;
  pageWidthPt: number;
  pageHeightPt: number;
  /** Path to a rasterised preview of page 1. */
  previewPath: string;
}

export interface Project {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  template?: TemplateRef;
  names: string[];
  style: TextStyle;
  output: OutputSettings;
}

export type BatchState = "idle" | "running" | "cancelling" | "done" | "error";

export interface BatchProgress {
  done: number;
  total: number;
  currentName?: string;
  state: BatchState;
  error?: string;
}
