/**
 * Offline audit (implementation.md Section 9.3).
 *
 * Fails the build if our own source/config contains networking primitives, known
 * telemetry SDKs, remote URLs, or OTA configuration. This is one half of the
 * "no network" guarantee; the Android manifest block is the other half.
 *
 * Run: npm run offline-audit
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "app", "scripts"];
const SCAN_ROOT_FILES = [
  "app.config.ts",
  "app.json",
  "eas.json",
  "metro.config.js",
  "babel.config.js",
];
const SOURCE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"]);
const IGNORE_BASENAMES = new Set(["offline-audit.ts"]);
const IGNORE_DIRS = new Set(["node_modules", ".expo", "dist", "coverage", "ios", "android"]);

interface Allowlist {
  urls: string[];
  code: string[];
  packages: string[];
}

interface Violation {
  file: string;
  line: number;
  rule: string;
  detail: string;
}

const CODE_RULES: { rule: string; re: RegExp }[] = [
  { rule: "network:fetch", re: /\bfetch\s*\(/ },
  { rule: "network:xhr", re: /\bXMLHttpRequest\b/ },
  { rule: "network:websocket", re: /\bWebSocket\b/ },
  { rule: "network:beacon", re: /sendBeacon\s*\(/ },
  { rule: "network:axios", re: /\baxios\b/ },
  { rule: "network:http-module", re: /require\(\s*["'](https?|node:https?)["']\s*\)/ },
  { rule: "ota:expo-updates", re: /expo-updates/ },
  { rule: "telemetry:sentry", re: /\bsentry\b/i },
  { rule: "telemetry:firebase", re: /\bfirebase\b/i },
  { rule: "telemetry:analytics", re: /\banalytics\b/i },
  { rule: "telemetry:crashlytics", re: /crashlytics/i },
  { rule: "telemetry:amplitude", re: /\bamplitude\b/i },
];

const URL_RE = /https?:\/\/[^\s"'`)<>\]]+/g;

const FORBIDDEN_PACKAGES = [
  "expo-updates",
  "@sentry/react-native",
  "sentry-expo",
  "firebase",
  "@react-native-firebase/app",
  "axios",
];

function loadJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (SOURCE_EXT.has(extname(entry))) {
      out.push(full);
    }
  }
}

function scanFile(file: string, allow: Allowlist): Violation[] {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (IGNORE_BASENAMES.has(rel.split("/").pop() ?? "")) return [];
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const violations: Violation[] = [];

  lines.forEach((line, i) => {
    for (const { rule, re } of CODE_RULES) {
      if (re.test(line) && !allow.code.some((a) => line.includes(a))) {
        violations.push({ file: rel, line: i + 1, rule, detail: line.trim().slice(0, 120) });
      }
    }
    URL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = URL_RE.exec(line)) !== null) {
      const url = m[0];
      if (!allow.urls.some((a) => url.startsWith(a))) {
        violations.push({ file: rel, line: i + 1, rule: "remote-url", detail: url });
      }
    }
  });

  return violations;
}

function scanPackages(allow: Allowlist): Violation[] {
  const pkgPath = join(ROOT, "package.json");
  if (!existsSync(pkgPath)) return [];
  const pkg = loadJson<{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }>(pkgPath, {});
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const violations: Violation[] = [];
  for (const name of Object.keys(deps)) {
    const forbidden = FORBIDDEN_PACKAGES.some((f) => name === f || name.startsWith(`${f}/`));
    if (forbidden && !allow.packages.includes(name)) {
      violations.push({
        file: "package.json",
        line: 1,
        rule: "forbidden-dependency",
        detail: name,
      });
    }
  }
  return violations;
}

function main(): void {
  const allow = loadJson<Allowlist>(join(ROOT, "scripts", "offline-audit.allowlist.json"), {
    urls: [],
    code: [],
    packages: [],
  });

  const files: string[] = [];
  for (const dir of SCAN_DIRS) walk(join(ROOT, dir), files);
  for (const f of SCAN_ROOT_FILES) {
    const p = join(ROOT, f);
    if (existsSync(p)) files.push(p);
  }

  const violations = [...files.flatMap((f) => scanFile(f, allow)), ...scanPackages(allow)];

  if (violations.length === 0) {
    console.log(`offline-audit: OK (${files.length} files scanned, no network usage found).`);
    return;
  }

  console.error(`offline-audit: FAILED with ${violations.length} violation(s):`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}]  ${v.detail}`);
  }
  process.exitCode = 1;
}

main();
