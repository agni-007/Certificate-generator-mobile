/**
 * Name cleaning (implementation.md 2.1): NBSP -> space, collapse whitespace,
 * Unicode NFC, trim, truncate to 120 chars. Pure and idempotent.
 */

import { LIMITS } from "../constants";

const MISSING_VALUES = new Set(["nan", "none", "null", "nat"]);

export function cleanName(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .normalize("NFC")
    .trim()
    .slice(0, LIMITS.maxNameLength);
}

/** True for placeholder strings a spreadsheet may put in a name cell. */
export function isMissingValue(value: string): boolean {
  return MISSING_VALUES.has(value.trim().toLowerCase());
}

/** True when a cleaned name is empty or a missing-value placeholder. */
export function isDroppableName(value: string): boolean {
  return value.length === 0 || isMissingValue(value);
}
