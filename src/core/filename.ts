/**
 * Safe output filenames and collision handling (implementation.md 2.1). Pure.
 *
 * Keeps letters/digits of any script plus space, `_`, `.`, `-`; collapses runs
 * of separators to `_`; trims; caps length (default 80); empty becomes `unnamed`.
 */

import { LIMITS } from "./constants";

const ALLOWED = /[\p{L}\p{M}\p{N} ._-]/u;
const SEPARATORS = /[\s._-]+/gu;
const EDGE_UNDERSCORES = /^_+|_+$/g;

export function safeFilename(input: string, maxLength: number = LIMITS.safeNameMaxLength): string {
  let filtered = "";
  for (const ch of input.normalize("NFC")) {
    if (ALLOWED.test(ch)) filtered += ch;
  }

  let out = filtered.replace(SEPARATORS, "_").replace(EDGE_UNDERSCORES, "");
  out = Array.from(out).slice(0, maxLength).join("");
  out = out.replace(EDGE_UNDERSCORES, "");
  return out.length > 0 ? out : "unnamed";
}

/**
 * Return `base` if unused, otherwise `base_2`, `base_3`, ... The chosen name is
 * added to `used` so callers can dedupe a batch in one pass.
 */
export function uniqueName(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  let candidate = `${base}_${n}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base}_${n}`;
  }
  used.add(candidate);
  return candidate;
}

/**
 * Apply a filename pattern containing `{name}`. When there is no placeholder the
 * safe name is returned on its own.
 */
export function buildFileName(pattern: string, safeName: string): string {
  return pattern.includes("{name}") ? pattern.replace(/\{name\}/g, safeName) : safeName;
}

/** Convenience: clean + pattern + collision handling for one name. */
export function certificateBaseName(
  pattern: string,
  rawName: string,
  used: Set<string>,
  maxLength?: number,
): string {
  const safe = safeFilename(rawName, maxLength);
  return uniqueName(buildFileName(pattern, safe), used);
}
