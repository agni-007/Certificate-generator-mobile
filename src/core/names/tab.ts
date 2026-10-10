/**
 * Tab-separated detection: the first line has a tab and no comma
 * (implementation.md 2.1). Pure.
 */

import { decodeBytes } from "./charset";

export function looksTabSeparated(bytes: Uint8Array): boolean {
  const firstLine = decodeBytes(bytes).text.split(/\r?\n/)[0] ?? "";
  return firstLine.includes("\t") && !firstLine.includes(",");
}
