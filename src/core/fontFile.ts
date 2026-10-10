/**
 * Custom font import validation and metadata parsing (implementation.md Phase 3
 * step 5, FR-14). Pure: parses TTF/OTF magic bytes and the OpenType `name`
 * table so the UI can show a family name and dedupe imports.
 */

export type FontContainer = "truetype" | "opentype" | "truetype-apple" | "collection";

const SFNT_TRUETYPE = 0x00010000;
const SFNT_OPENTYPE = 0x4f54544f; // "OTTO"
const SFNT_TRUE = 0x74727565; // "true"
const SFNT_TTCF = 0x74746366; // "ttcf"
const SFNT_VERSION_1 = 0x74727565; // "true" (Apple)

/** OpenType name IDs we care about. */
export const NAME_ID = {
  family: 1,
  subfamily: 2,
  fullName: 4,
  typographicFamily: 16,
  typographicSubfamily: 17,
} as const;

export interface FontNames {
  family?: string;
  subfamily?: string;
  fullName?: string;
}

function u8(bytes: Uint8Array, i: number): number {
  return bytes[i] ?? 0;
}

function u16(bytes: Uint8Array, i: number): number {
  return (u8(bytes, i) << 8) | u8(bytes, i + 1);
}

function u32(bytes: Uint8Array, i: number): number {
  return (
    ((u8(bytes, i) << 24) |
      (u8(bytes, i + 1) << 16) |
      (u8(bytes, i + 2) << 8) |
      u8(bytes, i + 3)) >>>
    0
  );
}

function tag(bytes: Uint8Array, i: number): number {
  return u32(bytes, i);
}

/** Detect the font container from its 4-byte magic; null when unsupported. */
export function fontContainer(bytes: Uint8Array): FontContainer | null {
  if (bytes.length < 4) return null;
  const magic = u32(bytes, 0);
  switch (magic) {
    case SFNT_TRUETYPE:
      return "truetype";
    case SFNT_OPENTYPE:
      return "opentype";
    case SFNT_TRUE:
    case SFNT_VERSION_1:
      return "truetype-apple";
    case SFNT_TTCF:
      return "collection";
    default:
      return null;
  }
}

/** Magic-byte check for `.ttf`/`.otf`/`.ttc` imports. */
export function isSupportedFontFile(bytes: Uint8Array): boolean {
  return fontContainer(bytes) !== null;
}

interface TableRecord {
  offset: number;
  length: number;
}

/** Offset of the first font's table directory (handles TTC collections). */
function tableDirectoryOffset(bytes: Uint8Array): number | null {
  const magic = u32(bytes, 0);
  if (magic === SFNT_TTCF) {
    if (bytes.length < 16) return null;
    const numFonts = u32(bytes, 8);
    if (numFonts < 1 || bytes.length < 12 + 4) return null;
    return u32(bytes, 12);
  }
  return 0;
}

function findTable(bytes: Uint8Array, sfntOffset: number, wanted: number): TableRecord | null {
  if (bytes.length < sfntOffset + 12) return null;
  const numTables = u16(bytes, sfntOffset + 4);
  const recordsStart = sfntOffset + 12;
  for (let i = 0; i < numTables; i += 1) {
    const rec = recordsStart + i * 16;
    if (rec + 16 > bytes.length) return null;
    if (tag(bytes, rec) === wanted) {
      const offset = u32(bytes, rec + 8);
      const length = u32(bytes, rec + 12);
      if (offset + length > bytes.length) return null;
      return { offset, length };
    }
  }
  return null;
}

function decodeUtf16Be(bytes: Uint8Array, start: number, length: number): string {
  let out = "";
  const end = Math.min(start + length, bytes.length);
  for (let i = start; i + 1 < end; i += 2) {
    out += String.fromCharCode(u16(bytes, i));
  }
  return out;
}

function decodeLatin1(bytes: Uint8Array, start: number, length: number): string {
  let out = "";
  const end = Math.min(start + length, bytes.length);
  for (let i = start; i < end; i += 1) out += String.fromCharCode(u8(bytes, i));
  return out;
}

const NAME_TABLE = 0x6e616d65; // "name"

/**
 * Read family/subfamily/full names from the OpenType `name` table. Prefers
 * Windows (UTF-16BE) records, then Unicode, then Mac (Latin-1).
 */
export function parseFontNames(bytes: Uint8Array): FontNames | undefined {
  if (!isSupportedFontFile(bytes)) return undefined;
  const sfntOffset = tableDirectoryOffset(bytes);
  if (sfntOffset === null) return undefined;
  const table = findTable(bytes, sfntOffset, NAME_TABLE);
  if (!table) return undefined;

  const nameOffset = table.offset;
  if (nameOffset + 6 > bytes.length) return undefined;
  const count = u16(bytes, nameOffset + 2);
  const stringsOffset = u16(bytes, nameOffset + 4);
  const storage = nameOffset + stringsOffset;

  // Prefer Windows (UTF-16BE) > Unicode > Mac records for the same name id.
  const byNameId = new Map<number, { value: string; priority: number }>();
  for (let i = 0; i < count; i += 1) {
    const rec = nameOffset + 6 + i * 12;
    if (rec + 12 > bytes.length) break;
    if (i >= 4096) break; // pathological guard
    const platformId = u16(bytes, rec);
    const encodingId = u16(bytes, rec + 2);
    const nameId = u16(bytes, rec + 6);
    const length = u16(bytes, rec + 8);
    const offset = u16(bytes, rec + 10);
    const start = storage + offset;

    let priority: number;
    let value: string;
    if (platformId === 3) {
      priority = 3;
      value = decodeUtf16Be(bytes, start, length);
    } else if (platformId === 0) {
      priority = 2;
      value = decodeUtf16Be(bytes, start, length);
    } else if (platformId === 1 && encodingId === 0) {
      priority = 1;
      value = decodeLatin1(bytes, start, length);
    } else {
      continue;
    }

    const cleaned = value.replace(/\0/g, "").trim();
    if (cleaned.length === 0) continue;
    const existing = byNameId.get(nameId);
    if (!existing || priority > existing.priority) {
      byNameId.set(nameId, { value: cleaned, priority });
    }
  }

  if (byNameId.size === 0) return undefined;
  const pick = (id: number): string | undefined => byNameId.get(id)?.value;
  return {
    family: pick(NAME_ID.typographicFamily) ?? pick(NAME_ID.family),
    subfamily: pick(NAME_ID.typographicSubfamily) ?? pick(NAME_ID.subfamily),
    fullName: pick(NAME_ID.fullName),
  };
}

/** Family name (typographic preferred), or undefined for malformed fonts. */
export function parseFontFamily(bytes: Uint8Array): string | undefined {
  return parseFontNames(bytes)?.family;
}
