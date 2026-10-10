/**
 * Header detection and name-column selection (implementation.md 2.1). Pure.
 */

export const NAME_HEADERS = ["name", "names", "full name", "fullname", "student name"] as const;

export function normalizeHeader(header: unknown): string {
  return String(header ?? "")
    .trim()
    .toLowerCase();
}

/** Index of the name column, or 0 when no known header is present. */
export function selectNameColumn(headers: readonly unknown[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of NAME_HEADERS) {
    const index = normalized.indexOf(candidate);
    if (index !== -1) return index;
  }
  return 0;
}

/** True when the first row looks like a header containing a known name column. */
export function headerLooksReal(headers: readonly unknown[]): boolean {
  const known: readonly string[] = NAME_HEADERS;
  return headers.some((header) => known.includes(normalizeHeader(header)));
}
