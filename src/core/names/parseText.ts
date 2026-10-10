/**
 * Multiline text input parsing (implementation.md FR-04/FR-05). Pure.
 * One name per line; blank lines and missing-value placeholders are dropped.
 */

import { cleanName, isDroppableName } from "./clean";

export function parseText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(cleanName)
    .filter((name) => !isDroppableName(name));
}
