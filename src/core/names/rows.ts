/**
 * Shared extraction of names from a table of already-parsed rows
 * (used by both CSV and XLSX importers). Pure.
 */

import { cleanName, isDroppableName } from "./clean";
import { headerLooksReal, selectNameColumn } from "./headers";

export interface ExtractedNames {
  names: string[];
  /** Original header cells (first row), for callers that want to show them. */
  headers: string[];
}

export function extractNamesFromRows(rows: readonly (readonly unknown[])[]): ExtractedNames {
  if (rows.length === 0) return { names: [], headers: [] };

  const headers = (rows[0] ?? []).map((cell) => String(cell ?? ""));
  const real = headerLooksReal(headers);
  const dataRows = real ? rows.slice(1) : rows;
  const columnIndex = real ? selectNameColumn(headers) : 0;

  const names = dataRows
    .map((row) => String((row ?? [])[columnIndex] ?? ""))
    .flatMap((cell) => cell.split(/\r?\n/))
    .map(cleanName)
    .filter((name) => !isDroppableName(name));

  return { names, headers };
}
