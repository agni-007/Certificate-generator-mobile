import {
  BUNDLED_FONTS,
  bundledFontForScript,
  bundledFontKeys,
  bundledKey,
  findBundledFont,
  fontCoverage,
  fontSupports,
} from "./fontCatalog";

describe("bundled font catalogue", () => {
  it("has unique ids, keys and file names", () => {
    expect(BUNDLED_FONTS.length).toBe(12);
    const ids = new Set(BUNDLED_FONTS.map((f) => f.id));
    const keys = new Set(BUNDLED_FONTS.map((f) => f.key));
    const files = new Set(BUNDLED_FONTS.map((f) => f.fileName));
    expect(ids.size).toBe(BUNDLED_FONTS.length);
    expect(keys.size).toBe(BUNDLED_FONTS.length);
    expect(files.size).toBe(BUNDLED_FONTS.length);
  });

  it("keys are prefixed with 'bundled:'", () => {
    for (const font of BUNDLED_FONTS) {
      expect(font.key).toBe(bundledKey(font.id));
      expect(font.key.startsWith("bundled:")).toBe(true);
      expect(font.scripts.length).toBeGreaterThan(0);
    }
  });

  it("finds fonts by id or key and lists keys", () => {
    expect(findBundledFont("malayalam")?.family).toBe("Noto Sans Malayalam");
    expect(findBundledFont("bundled:malayalam")?.id).toBe("malayalam");
    expect(findBundledFont("nope")).toBeUndefined();
    expect(bundledFontKeys()).toContain("bundled:latin-script");
  });

  it("resolves a bundled font per script", () => {
    expect(bundledFontForScript("malayalam")?.id).toBe("malayalam");
    expect(bundledFontForScript("tamil")?.id).toBe("tamil");
    expect(bundledFontForScript("latin")?.id).toBe("latin-serif");
  });
});

describe("fontCoverage / fontSupports", () => {
  it("treats standard fonts as Latin-only (WinAnsi)", () => {
    expect(fontCoverage("times")).toEqual({ scripts: ["latin"], standard: true });
    expect(fontSupports("times", "Asha Nair 123")).toBe(true);
    expect(fontSupports("times", "മലയാളം")).toBe(false);
  });

  it("uses the declared scripts for bundled fonts", () => {
    expect(fontCoverage("bundled:malayalam")).toEqual({ scripts: ["malayalam", "latin"] });
    expect(fontSupports("bundled:malayalam", "മലയാളം Name")).toBe(true);
    expect(fontSupports("bundled:malayalam", "தமிழ்")).toBe(false);
  });

  it("returns unknown coverage for custom fonts and unsupported chars", () => {
    expect(fontCoverage("custom:myfont")).toBeUndefined();
    expect(fontSupports("custom:myfont", "A")).toBe(false);
    expect(fontSupports("bundled:tamil", "😀")).toBe(false);
  });

  it("returns empty coverage for an unknown bundled key", () => {
    expect(fontCoverage("bundled:does-not-exist")).toEqual({ scripts: [] });
  });
});
