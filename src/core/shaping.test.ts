import {
  classifyChar,
  classifyCodePoint,
  complexScriptIn,
  coverageCoversText,
  isScriptless,
  needsShaping,
  scriptsInText,
  type FontCoverage,
} from "./shaping";

const LATIN_ONLY: FontCoverage = { scripts: ["latin"], standard: true };

describe("classifyCodePoint", () => {
  it("classifies Latin letters and script-neutral characters", () => {
    expect(classifyCodePoint(0x41)).toBe("latin"); // A
    expect(classifyCodePoint(0x61)).toBe("latin"); // a
    expect(classifyCodePoint(0x20)).toBe("common"); // space
    expect(classifyCodePoint(0x31)).toBe("common"); // digit 1
    expect(classifyCodePoint(0x2c)).toBe("common"); // comma
    expect(classifyCodePoint(0x0301)).toBe("common"); // combining acute
    expect(classifyCodePoint(0x200d)).toBe("common"); // ZWJ
  });

  it("classifies complex-script code points", () => {
    expect(classifyCodePoint(0x0d2e)).toBe("malayalam");
    expect(classifyCodePoint(0x0bae)).toBe("tamil");
    expect(classifyCodePoint(0x0939)).toBe("devanagari");
    expect(classifyCodePoint(0x0985)).toBe("bengali");
    expect(classifyCodePoint(0x0c15)).toBe("telugu");
    expect(classifyCodePoint(0x0c95)).toBe("kannada");
    expect(classifyCodePoint(0x0a95)).toBe("gujarati");
    expect(classifyCodePoint(0x0a15)).toBe("gurmukhi");
    expect(classifyCodePoint(0x0627)).toBe("arabic");
    expect(classifyCodePoint(0x0e01)).toBe("thai");
  });

  it("returns 'other' for unsupported code points", () => {
    expect(classifyCodePoint(0x1f600)).toBe("other"); // emoji
    expect(classifyCodePoint(-1)).toBe("other");
    expect(classifyCodePoint(Number.NaN)).toBe("other");
    expect(classifyChar("😀")).toBe("other");
    expect(classifyChar("")).toBe("other");
  });

  it("does not misclassify currency and punctuation as Latin", () => {
    expect(classifyCodePoint(0x20b9)).toBe("common"); // ₹ rupee
    expect(classifyCodePoint(0x2014)).toBe("common"); // em dash
    expect(classifyCodePoint(0x00a3)).toBe("common"); // £ pound
  });
});

describe("scriptsInText", () => {
  it("collects distinct scripts and ignores script-neutral characters", () => {
    expect([...scriptsInText("Asha Nair 123")]).toEqual(["latin"]);
    expect([...scriptsInText("മലയാളം")]).toEqual(["malayalam"]);
    expect([...scriptsInText("A \u0D2E B \u0D4A")].sort()).toEqual(["latin", "malayalam"]);
    expect(scriptsInText("123 — !?").size).toBe(0);
  });

  it("isScriptless is true only for script-neutral text", () => {
    expect(isScriptless("123 — ")).toBe(true);
    expect(isScriptless("A")).toBe(false);
  });
});

describe("coverageCoversText", () => {
  it("covers Latin with the standard coverage but not Indic", () => {
    expect(coverageCoversText(LATIN_ONLY, "Asha")).toBe(true);
    expect(coverageCoversText(LATIN_ONLY, "മലയാളം")).toBe(false);
    expect(coverageCoversText({ scripts: ["malayalam", "latin"] }, "A മ")).toBe(true);
  });

  it("never covers 'other' code points", () => {
    expect(coverageCoversText({ scripts: ["latin"] }, "😀")).toBe(false);
  });
});

describe("needsShaping", () => {
  it("is false for Latin text", () => {
    expect(needsShaping("Asha Nair")).toBe(false);
    expect(needsShaping("Asha", { coverage: LATIN_ONLY })).toBe(false);
  });

  it("is true for any complex script regardless of coverage", () => {
    expect(needsShaping("മലയാളം")).toBe(true);
    expect(needsShaping("தமிழ்")).toBe(true);
    expect(needsShaping("हिन्दी")).toBe(true);
  });

  it("routes to shaping when the selected font lacks a character", () => {
    expect(needsShaping("Привет", { coverage: LATIN_ONLY })).toBe(true);
    expect(needsShaping("😀", { coverage: LATIN_ONLY })).toBe(true);
  });

  it("is false for script-neutral text", () => {
    expect(needsShaping("123 — ")).toBe(false);
  });
});

describe("complexScriptIn", () => {
  it("returns the complex script or null", () => {
    expect(complexScriptIn("A മ B")).toBe("malayalam");
    expect(complexScriptIn("Asha")).toBeNull();
  });
});
