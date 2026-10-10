/**
 * Case-insensitive de-duplication preserving first-seen order
 * (implementation.md 2.1). Pure.
 */

export function dedupeNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Number of entries that would be removed by `dedupeNames`. */
export function countDuplicates(names: readonly string[]): number {
  return names.length - dedupeNames(names).length;
}
