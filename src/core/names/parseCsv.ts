/**
 * CSV / TSV import (implementation.md 2.1/7.5). Pure.
 * Decodes bytes (utf-8-sig/utf-8/cp1252/latin-1), detects tab separation,
 * selects the name column, drops a header row, splits multi-line cells,
 * cleans names and drops missing values.
 */

import Papa from "papaparse";

import { decodeBytes, type DecodedEncoding } from "./charset";
import { extractNamesFromRows } from "./rows";
import { looksTabSeparated } from "./tab";

export interface ParsedNames {
  names: string[];
  headers: string[];
  encoding: DecodedEncoding;
  delimiter: "comma" | "tab";
}

export function parseCsv(bytes: Uint8Array): ParsedNames {
  const { text, encoding } = decodeBytes(bytes);
  const tab = looksTabSeparated(bytes);
  const result = Papa.parse<string[]>(text, {
    delimiter: tab ? "\t" : ",",
    skipEmptyLines: true,
  });
  const { names, headers } = extractNamesFromRows(result.data);
  return { names, headers, encoding, delimiter: tab ? "tab" : "comma" };
}
