/**
 * Template and spreadsheet validation: extension, magic bytes and size
 * (implementation.md Sections 2.1 and 7.2). Pure TypeScript: no RN imports.
 */

import { LIMITS } from "./constants";
import { AppError } from "./errors";
import type { TemplateKind } from "./types";

export type TemplateFormat = "pdf" | "png" | "jpeg";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]; // SOI + first marker byte
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // xlsx (OOXML) container

const EXT_TO_TEMPLATE_FORMAT: Record<string, TemplateFormat> = {
  pdf: "pdf",
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
};

const SHEET_EXTENSIONS = new Set(["xlsx", "csv", "tsv", "txt"]);

export function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

/** Lower-case extension without the dot, ignoring any directory components. */
export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** Sniff a template format from its leading magic bytes, or null if unknown. */
export function detectTemplateFormat(bytes: Uint8Array): TemplateFormat | null {
  if (startsWith(bytes, PDF_SIGNATURE)) return "pdf";
  if (startsWith(bytes, PNG_SIGNATURE)) return "png";
  if (startsWith(bytes, JPEG_SIGNATURE)) return "jpeg";
  return null;
}

export function isZipContainer(bytes: Uint8Array): boolean {
  return startsWith(bytes, ZIP_SIGNATURE);
}

export interface TemplateValidation {
  format: TemplateFormat;
  kind: TemplateKind;
}

/**
 * Validate a template by extension AND magic bytes, and size.
 * Throws `AppError("BAD_TEMPLATE")` / `AppError("TEMPLATE_TOO_LARGE")`.
 */
export function validateTemplate(name: string, bytes: Uint8Array): TemplateValidation {
  const byExt = EXT_TO_TEMPLATE_FORMAT[extensionOf(name)];
  if (!byExt) throw new AppError("BAD_TEMPLATE");
  if (bytes.length > LIMITS.maxTemplateBytes) throw new AppError("TEMPLATE_TOO_LARGE");

  const byBytes = detectTemplateFormat(bytes);
  if (!byBytes || byBytes !== byExt) throw new AppError("BAD_TEMPLATE");

  return { format: byBytes, kind: byBytes === "pdf" ? "pdf" : "image" };
}

export interface SheetValidation {
  /** Normalised extension: xlsx | csv | tsv | txt. */
  extension: string;
}

/**
 * Validate a names spreadsheet by extension and size; for `.xlsx`, also require
 * a ZIP container signature. Throws `AppError`.
 */
export function validateSheet(name: string, bytes: Uint8Array): SheetValidation {
  const extension = extensionOf(name);
  if (!SHEET_EXTENSIONS.has(extension)) throw new AppError("BAD_SHEET_FORMAT");
  if (bytes.length > LIMITS.maxSheetBytes) throw new AppError("SHEET_TOO_LARGE");
  if (extension === "xlsx" && !isZipContainer(bytes)) throw new AppError("BAD_SHEET");
  return { extension };
}

/** True when the extension maps to a supported template type. */
export function isSupportedTemplateName(name: string): boolean {
  return EXT_TO_TEMPLATE_FORMAT[extensionOf(name)] !== undefined;
}
