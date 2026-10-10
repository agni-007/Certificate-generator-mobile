import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { fontContainer, isSupportedFontFile, parseFontFamily, parseFontNames } from "./fontFile";

const FONT_DIR = join(process.cwd(), "src", "assets", "fonts");

function readFont(fileName: string): Uint8Array | null {
  const path = join(FONT_DIR, fileName);
  if (!existsSync(path)) return null;
  return Uint8Array.from(readFileSync(path));
}

interface NameEntry {
  platform: number;
  encoding: number;
  lang: number;
  nameId: number;
  text: string;
  utf16: boolean;
}

function u16b(n: number): number[] {
  return [(n >> 8) & 0xff, n & 0xff];
}

function u32b(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

function utf16be(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp <= 0xffff) {
      out.push((cp >> 8) & 0xff, cp & 0xff);
    } else {
      const c = cp - 0x10000;
      const hi = 0xd800 + (c >> 10);
      const lo = 0xdc00 + (c & 0x3ff);
      out.push((hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff);
    }
  }
  return out;
}

function latin1(s: string): number[] {
  return [...s].map((c) => c.charCodeAt(0) & 0xff);
}

/** Build a minimal sfnt (TTF) with a single `name` table. */
function buildTtf(entries: NameEntry[], sfntVersion = 0x00010000): Uint8Array {
  const stringsOffset = 6 + entries.length * 12;
  const strings = entries.map((e) => (e.utf16 ? utf16be(e.text) : latin1(e.text)));
  const nameBody: number[] = [...u16b(0), ...u16b(entries.length), ...u16b(stringsOffset)];
  let cursor = 0; // offsets are relative to the string storage area
  entries.forEach((e, i) => {
    nameBody.push(
      ...u16b(e.platform),
      ...u16b(e.encoding),
      ...u16b(e.lang),
      ...u16b(e.nameId),
      ...u16b(strings[i]?.length ?? 0),
      ...u16b(cursor),
    );
    cursor += strings[i]?.length ?? 0;
  });
  for (const s of strings) nameBody.push(...s);

  const tableOffset = 12 + 16;
  const header = [
    ...u32b(sfntVersion),
    ...u16b(1),
    ...u16b(0),
    ...u16b(0),
    ...u16b(0),
    // name table record: tag, checksum, offset, length
    0x6e,
    0x61,
    0x6d,
    0x65,
    ...u32b(0),
    ...u32b(tableOffset),
    ...u32b(nameBody.length),
  ];
  return Uint8Array.from([...header, ...nameBody]);
}

function readU32(bytes: Uint8Array, i: number): number {
  return (
    (((bytes[i] ?? 0) << 24) |
      ((bytes[i + 1] ?? 0) << 16) |
      ((bytes[i + 2] ?? 0) << 8) |
      (bytes[i + 3] ?? 0)) >>>
    0
  );
}

function writeU32(bytes: Uint8Array, i: number, value: number): void {
  bytes[i] = (value >>> 24) & 0xff;
  bytes[i + 1] = (value >>> 16) & 0xff;
  bytes[i + 2] = (value >>> 8) & 0xff;
  bytes[i + 3] = value & 0xff;
}

/** Wrap a TTF into a one-font TTC collection. */
function buildTtc(ttf: Uint8Array): Uint8Array {
  const copy = Uint8Array.from(ttf);
  const recordOffset = 12 + 8; // first table record's offset field
  writeU32(copy, recordOffset, readU32(copy, recordOffset) + 16);
  const header = [...u32b(0x74746366), ...u16b(1), ...u16b(0), ...u32b(1), ...u32b(16)];
  return Uint8Array.from([...header, ...copy]);
}

const WINDOWS = { platform: 3, encoding: 1, lang: 0x409, utf16: true };

describe("fontContainer", () => {
  it("detects TrueType, OpenType and collection magic", () => {
    expect(fontContainer(Uint8Array.from([0x00, 0x01, 0x00, 0x00]))).toBe("truetype");
    expect(fontContainer(Uint8Array.from([0x4f, 0x54, 0x54, 0x4f]))).toBe("opentype"); // OTTO
    expect(fontContainer(Uint8Array.from([0x74, 0x72, 0x75, 0x65]))).toBe("truetype-apple"); // true
    expect(fontContainer(Uint8Array.from([0x74, 0x74, 0x63, 0x66]))).toBe("collection"); // ttcf
  });

  it("rejects empty, short and unknown magic", () => {
    expect(fontContainer(new Uint8Array(0))).toBeNull();
    expect(fontContainer(Uint8Array.from([0x00, 0x01, 0x00]))).toBeNull();
    expect(fontContainer(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull(); // PNG
    expect(isSupportedFontFile(Uint8Array.from([0x00, 0x01, 0x00, 0x00]))).toBe(true);
    expect(isSupportedFontFile(Uint8Array.from([1, 2, 3, 4]))).toBe(false);
  });

  it("parses family names from real bundled fonts", () => {
    const cases: [string, string][] = [
      ["NotoSansMalayalam-Regular.ttf", "Noto Sans Malayalam"],
      ["NotoSansTamil-Regular.ttf", "Noto Sans Tamil"],
      ["NotoSansDevanagari-Regular.ttf", "Noto Sans Devanagari"],
      ["GreatVibes-Regular.ttf", "Great Vibes"],
      ["NotoSerif-Regular.ttf", "Noto Serif"],
    ];
    for (const [file, expected] of cases) {
      const bytes = readFont(file);
      if (!bytes) continue; // assets not present in this checkout
      expect(parseFontFamily(bytes)).toBe(expected);
      const names = parseFontNames(bytes);
      expect(names?.family).toBe(expected);
      expect(names?.fullName?.length).toBeGreaterThan(0);
    }
  });
});

describe("parseFontNames (synthetic sfnt)", () => {
  it("reads a Windows UTF-16BE family name", () => {
    const ttf = buildTtf([
      { ...WINDOWS, nameId: 1, text: "Test Family" },
      { ...WINDOWS, lang: 0, nameId: 2, text: "Regular" },
      { ...WINDOWS, nameId: 4, text: "Test Family Regular" },
    ]);
    expect(parseFontFamily(ttf)).toBe("Test Family");
    expect(parseFontNames(ttf)?.subfamily).toBe("Regular");
  });

  it("prefers the typographic family over the legacy family", () => {
    const ttf = buildTtf([
      { ...WINDOWS, nameId: 1, text: "Legacy Family" },
      { ...WINDOWS, nameId: 16, text: "Typographic Family" },
    ]);
    expect(parseFontFamily(ttf)).toBe("Typographic Family");
  });

  it("falls back to Unicode and Mac records and prefers Windows", () => {
    const unicodeOnly = buildTtf([
      { platform: 0, encoding: 3, lang: 0, nameId: 1, text: "Unicode Only", utf16: true },
    ]);
    expect(parseFontFamily(unicodeOnly)).toBe("Unicode Only");

    const macOnly = buildTtf([
      { platform: 1, encoding: 0, lang: 0, nameId: 1, text: "Mac Family", utf16: false },
    ]);
    expect(parseFontFamily(macOnly)).toBe("Mac Family");

    const mixed = buildTtf([
      { platform: 1, encoding: 0, lang: 0, nameId: 1, text: "Mac Family", utf16: false },
      { ...WINDOWS, nameId: 1, text: "Windows Family" },
    ]);
    expect(parseFontFamily(mixed)).toBe("Windows Family");
  });

  it("ignores unsupported platforms and empty strings", () => {
    const ttf = buildTtf([
      { platform: 2, encoding: 0, lang: 0, nameId: 1, text: "Deprecated", utf16: false },
      { ...WINDOWS, nameId: 1, text: "   " },
    ]);
    expect(parseFontFamily(ttf)).toBeUndefined();
  });

  it("parses the first font in a TTC collection", () => {
    const ttf = buildTtf([{ ...WINDOWS, nameId: 1, text: "Collection Face" }]);
    const ttc = buildTtc(ttf);
    expect(fontContainer(ttc)).toBe("collection");
    expect(parseFontFamily(ttc)).toBe("Collection Face");
  });

  it("returns undefined for a truncated or corrupt table directory", () => {
    const ttf = buildTtf([{ ...WINDOWS, nameId: 1, text: "Broken" }]);
    const corrupt = Uint8Array.from(ttf);
    writeU32(corrupt, 12 + 8, 0xfffffff0); // name table offset beyond EOF
    expect(parseFontFamily(corrupt)).toBeUndefined();

    const truncated = Uint8Array.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x01]);
    expect(parseFontFamily(truncated)).toBeUndefined();

    const ttcTooShort = Uint8Array.from([0x74, 0x74, 0x63, 0x66, 0x00, 0x01]);
    expect(parseFontFamily(ttcTooShort)).toBeUndefined();
  });
});
