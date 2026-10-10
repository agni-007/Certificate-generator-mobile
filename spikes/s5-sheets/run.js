"use strict";
/* Spike S5: spreadsheet / CSV parsing (port of the web app rules, Section 2.1).
 * Generates fixtures, parses them, runs assertions, and records timings.
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const Papa = require("papaparse");
const jschardet = require("jschardet");
const { outPath, nowMs, writeJson } = require("../lib/util");

const MISSING = new Set(["nan", "none", "null", "nat"]);
const CP1252 = {
  0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡",
  0x88: "ˆ", 0x89: "‰", 0x8a: "Š", 0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž", 0x91: "‘",
  0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—", 0x98: "˜",
  0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ", 0x9e: "ž", 0x9f: "Ÿ",
};

function decodeUtf8Strict(bytes) {
  // strip BOM
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    bytes = bytes.subarray(3);
  }
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" };
  } catch {
    return null;
  }
}

function decodeCp1252(bytes) {
  let out = "";
  for (const b of bytes) out += CP1252[b] !== undefined ? CP1252[b] : String.fromCharCode(b);
  return out;
}

function decodeBytes(bytes) {
  const utf8 = decodeUtf8Strict(bytes);
  if (utf8) return utf8;
  return { text: decodeCp1252(bytes), encoding: "cp1252" };
}

function cleanName(s) {
  return s
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .normalize("NFC")
    .trim()
    .slice(0, 120);
}

function isMissing(s) {
  return MISSING.has(s.trim().toLowerCase());
}

const NAME_HEADERS = ["name", "names", "full name", "fullname", "student name"];

function selectNameColumn(headers) {
  const norm = headers.map((h) => String(h == null ? "" : h).trim().toLowerCase());
  for (const w of NAME_HEADERS) {
    const i = norm.indexOf(w);
    if (i !== -1) return i;
  }
  return 0;
}

function headerLooksReal(headers) {
  return headers.some((h) => NAME_HEADERS.includes(String(h == null ? "" : h).trim().toLowerCase()));
}

// Select the name column (not all columns), split multi-line cells, clean, drop missing.
function extractNames(rows) {
  if (!rows.length) return { names: [], headers: [] };
  const headers = rows[0].map((c) => String(c == null ? "" : c));
  const real = headerLooksReal(headers);
  const dataRows = real ? rows.slice(1) : rows;
  const idx = real ? selectNameColumn(headers) : 0;
  const names = dataRows
    .map((r) => String(r[idx] == null ? "" : r[idx]))
    .flatMap((c) => c.split(/\r?\n/))
    .map(cleanName)
    .filter((n) => n.length > 0 && !isMissing(n));
  return { names, headers };
}

function looksTabSeparated(bytes) {
  const firstLine = decodeBytes(bytes).text.split(/\r?\n/)[0] || "";
  return firstLine.includes("\t") && !firstLine.includes(",");
}

function dedupe(names) {
  const seen = new Set();
  const out = [];
  for (const n of names) {
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

function parseCsv(bytes) {
  const { text, encoding } = decodeBytes(bytes);
  const tab = looksTabSeparated(bytes);
  const res = Papa.parse(text.replace(/^\uFEFF/, ""), {
    delimiter: tab ? "\t" : ",",
    skipEmptyLines: true,
  });
  const { names, headers } = extractNames(res.data);
  return { names, encoding, delimiter: tab ? "tab" : "comma", headers };
}

function parseXlsx(bytes) {
  const wb = XLSX.read(bytes, { type: "buffer", sheetRows: 100000, cellText: true, cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  return extractNames(rows);
}

function makeFixtures(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const out = {};

  // 1. xlsx 5000 rows
  const rows = [["name", "class", "roll"]];
  for (let i = 0; i < 5000; i++) rows.push([`Student ${i}`, `C${i % 12}`, String(1000 + i)]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  const xlsxPath = path.join(dir, "names-5000.xlsx");
  XLSX.writeFile(wb, xlsxPath);
  out.xlsx = xlsxPath;

  // 2. UTF-8 BOM CSV with "Full Name" header + duplicates + missing
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const bomCsv = bomCsvText();
  out.bomCsv = path.join(dir, "names-bom.csv");
  fs.writeFileSync(out.bomCsv, bomCsv);

  // 3. cp1252 CSV (no BOM): "José", "Müller"
  const cp1252Text = ["Name", "José Álvarez", "Müller", "Renée"].join("\r\n");
  const cp1252Bytes = Buffer.from(encodeCp1252(cp1252Text));
  out.cp1252Csv = path.join(dir, "names-cp1252.csv");
  fs.writeFileSync(out.cp1252Csv, cp1252Bytes);

  // 4. tab-separated
  const tabs = ["name\tclass", "Asha\t10", "Bharat\t11"].join("\n");
  out.tabTsv = path.join(dir, "names.tsv");
  fs.writeFileSync(out.tabTsv, tabs);

  // 5. single cell with multi-line block
  const block = ['"name"', '"Asha\\nBharat\\nChandra"'].join("\n").replace(/\\n/g, "\n");
  out.blockCsv = path.join(dir, "names-block.csv");
  fs.writeFileSync(out.blockCsv, block);

  return out;
}

function bomCsvText() {
  return [
    "Full Name,Class",
    "Asha Nair,10",
    "Bharat Rao,11",
    "asha nair,10", // duplicate (case-insensitive)
    "nan,0", // missing value
    "Chandra Das,12",
    "María García,9",
  ].join("\n");
}

function encodeCp1252(str) {
  const rev = {};
  for (const [k, v] of Object.entries(CP1252)) rev[v] = Number(k);
  const bytes = [];
  for (const ch of str) {
    const code = ch.codePointAt(0);
    if (rev[ch] !== undefined) bytes.push(rev[ch]);
    else if (code < 256) bytes.push(code);
    else bytes.push(0x3f);
  }
  return bytes;
}

(async () => {
  const dir = outPath("s5");
  const fixtures = makeFixtures(dir);
  const results = { runtime: process.version, fixtures: {}, checks: [] };
  const record = (name, pass, detail) => {
    results.checks.push({ name, pass, detail });
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}  ${detail}`);
  };

  // XLSX 5000
  let bytes = fs.readFileSync(fixtures.xlsx);
  let t0 = nowMs();
  let r = parseXlsx(bytes);
  let ms = nowMs() - t0;
  results.xlsx = { ms: +ms.toFixed(1), names: r.names.length, headers: r.headers };
  record("xlsx 5000 rows", r.names.length === 5000 && r.names[0] === "Student 0", `${r.names.length} names in ${ms.toFixed(0)} ms`);

  // BOM CSV + full name header + dedupe + missing
  const bom = parseCsv(fs.readFileSync(fixtures.bomCsv));
  const bomDeduped = dedupe(bom.names);
  results.bomCsv = { encoding: bom.encoding, names: bom.names, deduped: bomDeduped };
  record("utf-8 BOM CSV", bom.encoding === "utf-8" && !bom.names[0].includes("\uFEFF") && bom.names.includes("María García"), `encoding=${bom.encoding}`);
  record("Full Name header + missing nan dropped", !bom.names.some((n) => /^nan$/i.test(n)), `names=${bom.names.length}`);
  record("dedupe case-insensitive", bom.names.length === 5 && bomDeduped.length === 4, `${bom.names.length} -> ${bomDeduped.length}`);

  // cp1252
  const cp = parseCsv(fs.readFileSync(fixtures.cp1252Csv));
  const det = jschardet.detect(fs.readFileSync(fixtures.cp1252Csv));
  results.cp1252 = { encoding: cp.encoding, names: cp.names, jschardet: det };
  record("cp1252 CSV decoded", cp.encoding === "cp1252" && cp.names.includes("José Álvarez") && cp.names.includes("Müller"), `encoding=${cp.encoding}, jschardet=${det.encoding}(${det.confidence && det.confidence.toFixed(2)})`);

  // tab separated
  const tabBytes = fs.readFileSync(fixtures.tabTsv);
  const tab = parseCsv(tabBytes);
  results.tab = { delimiter: tab.delimiter, names: tab.names };
  record("tab-separated detection", looksTabSeparated(tabBytes) && tab.delimiter === "tab", `delimiter=${tab.delimiter}`);

  // single multi-line cell
  const block = parseCsv(fs.readFileSync(fixtures.blockCsv));
  results.block = { names: block.names };
  record("single multi-line cell split", block.names.length === 3, `names=${JSON.stringify(block.names)}`);

  // NFC + NBSP
  const messy = cleanName("  A\u00a0\u00a0B   C  ") + "|" + cleanName("e\u0301".normalize("NFD"));
  results.clean = messy;
  record("cleanName NBSP+collapse+NFC", messy.startsWith("A B C|") && messy.split("|")[1] === "é", messy);

  writeJson(path.join(dir, "results.json"), results);
  const failed = results.checks.filter((c) => !c.pass).length;
  console.log(`\n=== S5 parsing spike: ${results.checks.length - failed}/${results.checks.length} checks passed ===\n`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("S5 FAILED:", e);
  process.exit(1);
});
