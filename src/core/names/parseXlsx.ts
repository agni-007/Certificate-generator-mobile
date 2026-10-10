/**
 * XLSX import (implementation.md 2.1/7.5). Pure.
 * Reads the first sheet only, forces cells to text (preserving leading zeros),
 * scans at most `LIMITS.sheetRowScanCap` rows.
 */

import * as XLSX from "xlsx";

import { LIMITS } from "../constants";
import { extractNamesFromRows } from "./rows";

export interface ParsedXlsx {
  names: string[];
  headers: string[];
}

export function parseXlsx(bytes: Uint8Array): ParsedXlsx {
  const workbook = XLSX.read(bytes, {
    type: "array",
    sheetRows: LIMITS.sheetRowScanCap,
    cellText: true,
    cellDates: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) return { names: [], headers: [] };

  const sheet = workbook.Sheets[sheetName];
  if (sheet === undefined) return { names: [], headers: [] };

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  return extractNamesFromRows(rows);
}
