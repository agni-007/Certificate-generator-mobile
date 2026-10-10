import * as XLSX from "xlsx";

import {
  cleanName,
  countDuplicates,
  decodeBytes,
  decodeCp1252,
  decodeLatin1,
  decodeUtf8Strict,
  dedupeNames,
  enforceLimit,
  excessCount,
  extractNamesFromRows,
  headerLooksReal,
  isDroppableName,
  isMissingValue,
  isWithinLimit,
  looksTabSeparated,
  normalizeHeader,
  parseCsv,
  parseText,
  parseXlsx,
  selectNameColumn,
  stripBom,
} from "./index";

const utf8 = (s: string): Uint8Array => Uint8Array.from(Buffer.from(s, "utf8"));
const withBom = (s: string): Uint8Array => {
  const body = Buffer.from(s, "utf8");
  return Uint8Array.from(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]));
};
const cp1252Bytes = (points: number[]): Uint8Array => Uint8Array.from(points);

describe("charset", () => {
  it("strips a UTF-8 BOM", () => {
    const { bytes, hadBom } = stripBom(withBom("hi"));
    expect(hadBom).toBe(true);
    expect(Array.from(bytes)).toEqual([0x68, 0x69]);
    expect(stripBom(utf8("hi")).hadBom).toBe(false);
  });

  it("decodes valid UTF-8 strictly, with or without BOM", () => {
    expect(decodeUtf8Strict(utf8("María"))).toBe("María");
    expect(decodeUtf8Strict(withBom("María"))).toBe("María");
    expect(decodeUtf8Strict(utf8("मलयालम"))).toBe("मलयालम");
  });

  it("returns null on malformed UTF-8 (lone continuation, overlong, truncated)", () => {
    expect(decodeUtf8Strict(Uint8Array.from([0x80]))).toBeNull();
    expect(decodeUtf8Strict(Uint8Array.from([0xc0, 0xaf]))).toBeNull(); // overlong
    expect(decodeUtf8Strict(Uint8Array.from([0xe2, 0x82]))).toBeNull(); // truncated
    expect(decodeUtf8Strict(Uint8Array.from([0xed, 0xa0, 0x80]))).toBeNull(); // surrogate
  });

  it("decodes cp1252 high range and falls back to latin-1", () => {
    expect(decodeCp1252(cp1252Bytes([0x4a, 0x6f, 0x73, 0xe9]))).toBe("José");
    expect(decodeCp1252(cp1252Bytes([0x80]))).toBe("\u20ac");
    expect(decodeCp1252(cp1252Bytes([0x93, 0x94]))).toBe("\u201c\u201d");
    expect(decodeLatin1(cp1252Bytes([0xe9, 0xfc]))).toBe("éü");
  });

  it("picks utf-8 when valid, else cp1252", () => {
    expect(decodeBytes(utf8("Asha")).encoding).toBe("utf-8");
    expect(decodeBytes(cp1252Bytes([0x4a, 0x6f, 0x73, 0xe9]))).toEqual({
      text: "José",
      encoding: "cp1252",
    });
  });
});

describe("cleanName", () => {
  it("replaces NBSP, collapses whitespace, trims and normalises NFC", () => {
    expect(cleanName("  A\u00a0\u00a0B   C  ")).toBe("A B C");
    expect(cleanName("e\u0301".normalize("NFD"))).toBe("é");
  });

  it("truncates to 120 chars and is idempotent", () => {
    const long = "x".repeat(200);
    expect(cleanName(long)).toHaveLength(120);
    expect(cleanName(cleanName(long))).toBe(cleanName(long));
    expect(cleanName("Asha")).toBe(cleanName(cleanName("Asha")));
  });

  it("keeps emoji and non-Latin scripts", () => {
    expect(cleanName("Asha 😀")).toBe("Asha 😀");
    expect(cleanName("മലയാളം")).toBe("മലയാളം");
  });

  it("flags missing-value placeholders (case-insensitive)", () => {
    for (const v of ["nan", "NaN", "none", "null", "NAT", " undefined "]) {
      if (v === " undefined ") {
        expect(isMissingValue(v)).toBe(false);
        continue;
      }
      expect(isMissingValue(v)).toBe(true);
    }
    expect(isMissingValue("Nair")).toBe(false);
    expect(isDroppableName("")).toBe(true);
    expect(isDroppableName("nan")).toBe(true);
    expect(isDroppableName("Asha")).toBe(false);
  });
});

describe("dedupe", () => {
  it("removes case-insensitive duplicates preserving first-seen order", () => {
    const out = dedupeNames(["Asha", "asha", "Bharat", "ASHA", "Chandra"]);
    expect(out).toEqual(["Asha", "Bharat", "Chandra"]);
    expect(countDuplicates(["Asha", "asha", "Bharat"])).toBe(1);
  });
});

describe("headers", () => {
  it("normalises and recognises known name headers", () => {
    expect(normalizeHeader("  Full Name ")).toBe("full name");
    expect(headerLooksReal(["Class", "Full Name"])).toBe(true);
    expect(headerLooksReal(["Class", "Roll"])).toBe(false);
  });

  it("selects the matching column, else the first", () => {
    expect(selectNameColumn(["Roll", "Name", "Class"])).toBe(1);
    expect(selectNameColumn(["Class", "Student Name"])).toBe(1);
    expect(selectNameColumn(["Roll", "Class"])).toBe(0);
  });

  it("extracts names selecting the right column and dropping a header", () => {
    const rows = [
      ["Roll", "Names"],
      ["1", "Asha"],
      ["2", "Bharat"],
    ];
    expect(extractNamesFromRows(rows).names).toEqual(["Asha", "Bharat"]);
    expect(extractNamesFromRows([]).names).toEqual([]);
  });
});

describe("limits", () => {
  it("caps and reports excess", () => {
    const names = Array.from({ length: 10 }, (_, i) => `N${i}`);
    expect(enforceLimit(names, 4)).toEqual(["N0", "N1", "N2", "N3"]);
    expect(excessCount(names, 4)).toBe(6);
    expect(isWithinLimit(names, 10)).toBe(true);
    expect(isWithinLimit(names, 9)).toBe(false);
    expect(enforceLimit(names, 0)).toEqual([]);
  });
});

describe("parseText", () => {
  it("splits lines, cleans, drops blanks and missing values", () => {
    expect(parseText("Asha\n\n  Bharat \nnan\nChandra\r\n")).toEqual(["Asha", "Bharat", "Chandra"]);
  });

  it("handles 2000+ names", () => {
    const text = Array.from({ length: 2500 }, (_, i) => `Student ${i}`).join("\n");
    const names = parseText(text);
    expect(names).toHaveLength(2500);
    expect(enforceLimit(names)).toHaveLength(2000);
  });
});

describe("looksTabSeparated", () => {
  it("treats first line with tab and no comma as tab-separated", () => {
    expect(looksTabSeparated(utf8("name\tclass\nAsha\t10"))).toBe(true);
    expect(looksTabSeparated(utf8("name,class\nAsha,10"))).toBe(false);
    expect(looksTabSeparated(utf8("a\tb,c"))).toBe(false);
  });
});

describe("parseCsv", () => {
  it("handles UTF-8 BOM, Full Name header, duplicates and missing values", () => {
    const bytes = withBom(
      [
        "Full Name,Class",
        "Asha Nair,10",
        "Bharat Rao,11",
        "asha nair,10",
        "nan,0",
        "Chandra Das,12",
        "María García,9",
      ].join("\n"),
    );
    const parsed = parseCsv(bytes);
    expect(parsed.encoding).toBe("utf-8");
    expect(parsed.delimiter).toBe("comma");
    expect(parsed.names).toEqual([
      "Asha Nair",
      "Bharat Rao",
      "asha nair",
      "Chandra Das",
      "María García",
    ]);
    expect(parsed.names.some((n) => /^nan$/i.test(n))).toBe(false);
    expect(dedupeNames(parsed.names)).toHaveLength(4);
  });

  it("decodes cp1252 (no BOM) without mangling accents", () => {
    // "Name\r\nJosé Álvarez\r\nMüller\r\n"
    const bytes = cp1252Bytes([
      0x4e, 0x61, 0x6d, 0x65, 0x0d, 0x0a, 0x4a, 0x6f, 0x73, 0xe9, 0x20, 0xc1, 0x6c, 0x76, 0x61,
      0x72, 0x65, 0x7a, 0x0d, 0x0a, 0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72,
    ]);
    const parsed = parseCsv(bytes);
    expect(parsed.encoding).toBe("cp1252");
    expect(parsed.names).toEqual(["José Álvarez", "Müller"]);
  });

  it("detects tab-separated files and picks the name column", () => {
    const parsed = parseCsv(utf8("name\tclass\nAsha\t10\nBharat\t11"));
    expect(parsed.delimiter).toBe("tab");
    expect(parsed.names).toEqual(["Asha", "Bharat"]);
  });

  it("splits a single quoted multi-line cell into separate names", () => {
    const parsed = parseCsv(utf8('name\n"Asha\nBharat\nChandra"'));
    expect(parsed.names).toEqual(["Asha", "Bharat", "Chandra"]);
  });

  it("treats the first row as data when there is no known header", () => {
    const parsed = parseCsv(utf8("Asha,Bharat\nChandra,Divya"));
    expect(parsed.names).toEqual(["Asha", "Chandra"]);
  });

  it("returns an empty result for an empty file", () => {
    expect(parseCsv(utf8("")).names).toEqual([]);
  });
});

describe("parseXlsx", () => {
  const build = (rows: unknown[][]): Uint8Array => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer | number[];
    return out instanceof ArrayBuffer ? new Uint8Array(out) : Uint8Array.from(out);
  };

  it("reads the name column, keeps leading zeros and drops missing values", () => {
    const bytes = build([
      ["name", "roll"],
      ["Student 0", "007"],
      ["nan", "008"],
      ["Asha Nair", "009"],
    ]);
    const parsed = parseXlsx(bytes);
    expect(parsed.names).toEqual(["Student 0", "Asha Nair"]);
  });

  it("reads a headerless sheet and splits multi-line cells", () => {
    const bytes = build([["Asha\nBharat"], ["Chandra"]]);
    expect(parseXlsx(bytes).names).toEqual(["Asha", "Bharat", "Chandra"]);
  });

  it("handles thousands of rows", () => {
    const rows: unknown[][] = [["name"]];
    for (let i = 0; i < 2500; i++) rows.push([`Student ${i}`]);
    expect(parseXlsx(build(rows)).names).toHaveLength(2500);
  });
});
