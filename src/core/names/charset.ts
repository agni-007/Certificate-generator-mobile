/**
 * Character-set decoding for imported spreadsheets (implementation.md 2.1/7.5).
 * Order: utf-8-sig, utf-8, cp1252, latin-1.
 *
 * Implemented by hand (no `TextDecoder`) so the pure core behaves identically in
 * Node and Hermes, and so tests can force each branch.
 */

export type DecodedEncoding = "utf-8" | "cp1252";

/** Windows-1252 additions for bytes 0x80-0x9F (undefined slots fall through). */
const CP1252_HIGH: Record<number, string> = {
  0x80: "\u20ac",
  0x82: "\u201a",
  0x83: "\u0192",
  0x84: "\u201e",
  0x85: "\u2026",
  0x86: "\u2020",
  0x87: "\u2021",
  0x88: "\u02c6",
  0x89: "\u2030",
  0x8a: "\u0160",
  0x8b: "\u2039",
  0x8c: "\u0152",
  0x8e: "\u017d",
  0x91: "\u2018",
  0x92: "\u2019",
  0x93: "\u201c",
  0x94: "\u201d",
  0x95: "\u2022",
  0x96: "\u2013",
  0x97: "\u2014",
  0x98: "\u02dc",
  0x99: "\u2122",
  0x9a: "\u0161",
  0x9b: "\u203a",
  0x9c: "\u0153",
  0x9e: "\u017e",
  0x9f: "\u0178",
};

export const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

export function stripBom(bytes: Uint8Array): { bytes: Uint8Array; hadBom: boolean } {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { bytes: bytes.subarray(3), hadBom: true };
  }
  return { bytes, hadBom: false };
}

/**
 * Strict UTF-8 decode. Returns null on any malformed sequence (overlong, lone
 * surrogate, out-of-range, truncated), which is how we detect non-UTF-8 input.
 */
export function decodeUtf8Strict(input: Uint8Array): string | null {
  const bytes = stripBom(input).bytes;
  const codePoints: number[] = [];

  for (let i = 0; i < bytes.length; i++) {
    const b0 = bytes[i] as number;
    if (b0 < 0x80) {
      codePoints.push(b0);
      continue;
    }
    let needed: number;
    let cp: number;
    let min: number;
    if ((b0 & 0xe0) === 0xc0) {
      needed = 1;
      cp = b0 & 0x1f;
      min = 0x80;
    } else if ((b0 & 0xf0) === 0xe0) {
      needed = 2;
      cp = b0 & 0x0f;
      min = 0x800;
    } else if ((b0 & 0xf8) === 0xf0) {
      needed = 3;
      cp = b0 & 0x07;
      min = 0x10000;
    } else {
      return null;
    }
    if (i + needed >= bytes.length) return null;
    for (let k = 0; k < needed; k++) {
      const b = bytes[++i] as number;
      if ((b & 0xc0) !== 0x80) return null;
      cp = (cp << 6) | (b & 0x3f);
    }
    if (cp < min || cp > 0x10ffff) return null;
    if (cp >= 0xd800 && cp <= 0xdfff) return null;
    codePoints.push(cp);
  }

  let out = "";
  for (const cp of codePoints) out += String.fromCodePoint(cp);
  return out;
}

export function decodeCp1252(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] as number;
    if (b >= 0x80 && b <= 0x9f && CP1252_HIGH[b] !== undefined) {
      out += CP1252_HIGH[b];
    } else {
      out += String.fromCharCode(b);
    }
  }
  return out;
}

export function decodeLatin1(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i] as number);
  return out;
}

/**
 * Decode bytes in the documented order. UTF-8 (with or without BOM) wins when
 * valid; otherwise Windows-1252 is used (its undefined slots behave as latin-1).
 */
export function decodeBytes(bytes: Uint8Array): { text: string; encoding: DecodedEncoding } {
  const utf8 = decodeUtf8Strict(bytes);
  if (utf8 !== null) return { text: utf8, encoding: "utf-8" };
  return { text: decodeCp1252(bytes), encoding: "cp1252" };
}
