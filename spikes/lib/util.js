"use strict";
const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function outPath(...parts) {
  const p = path.join(__dirname, "..", "out", ...parts);
  ensureDir(path.dirname(p));
  return p;
}

function fixturePath(...parts) {
  return path.join(__dirname, "..", "fixtures", ...parts);
}

function readProcStatus() {
  try {
    const txt = fs.readFileSync("/proc/self/status", "utf8");
    const get = (k) => {
      const m = txt.match(new RegExp("^" + k + ":\\s*(\\d+)\\s*kB", "m"));
      return m ? Number(m[1]) : null;
    };
    return { rssKb: get("VmRSS"), peakKb: get("VmHWM") };
  } catch {
    const rss = process.memoryUsage().rss / 1024;
    return { rssKb: Math.round(rss), peakKb: Math.round(rss) };
  }
}

function nowMs() {
  return Number(process.hrtime.bigint()) / 1e6;
}

function fmtKb(kb) {
  if (kb == null) return "n/a";
  return (kb / 1024).toFixed(1) + " MB";
}

function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  return file;
}

module.exports = { ensureDir, outPath, fixturePath, readProcStatus, nowMs, fmtKb, writeJson };
