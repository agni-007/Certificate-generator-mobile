import { buildFileName, certificateBaseName, safeFilename, uniqueName } from "./filename";

describe("safeFilename", () => {
  it.each([
    ["Asha Nair", "Asha_Nair"],
    ["A  B", "A_B"],
    ["Asha", "Asha"],
    ["  Asha  ", "Asha"],
    ["A.B", "A_B"],
    ["A---B", "A_B"],
    ["A__B", "A_B"],
    ["José", "José"],
    ["മലയാളം", "മലയാളം"],
    ["Student #1", "Student_1"],
  ])("%s -> %s", (input, expected) => {
    expect(safeFilename(input)).toBe(expected);
  });

  it("removes path separators and traversal", () => {
    const out = safeFilename("../../etc/passwd");
    expect(out).not.toContain("/");
    expect(out).not.toContain("\\");
    expect(safeFilename(String.raw`C:\tmp\f`)).not.toContain("\\");
  });

  it("falls back to 'unnamed' when nothing usable remains", () => {
    expect(safeFilename("")).toBe("unnamed");
    expect(safeFilename("   ")).toBe("unnamed");
    expect(safeFilename("...")).toBe("unnamed");
    expect(safeFilename("😀😀")).toBe("unnamed");
  });

  it("caps length at 80 by default and honours a custom cap", () => {
    expect(safeFilename("x".repeat(200))).toHaveLength(80);
    expect(safeFilename("x".repeat(200), 10)).toHaveLength(10);
  });

  it("never returns empty, never keeps separators, always within cap", () => {
    const inputs = ["", "  ", "a/b\\c", "%%%", "Asha Nair", "😀", "x".repeat(500), "a...b"];
    for (const input of inputs) {
      const out = safeFilename(input);
      expect(out.length).toBeGreaterThan(0);
      expect(out.length).toBeLessThanOrEqual(80);
      expect(out).not.toMatch(/[/\\]/);
    }
  });
});

describe("uniqueName", () => {
  it("appends _2, _3, ... on collisions", () => {
    const used = new Set<string>();
    expect(uniqueName("Asha", used)).toBe("Asha");
    expect(uniqueName("Asha", used)).toBe("Asha_2");
    expect(uniqueName("Asha", used)).toBe("Asha_3");
    expect(uniqueName("Bharat", used)).toBe("Bharat");
  });

  it("skips over names already taken", () => {
    const used = new Set<string>(["Asha", "Asha_2", "Asha_4"]);
    expect(uniqueName("Asha", used)).toBe("Asha_3");
  });
});

describe("buildFileName", () => {
  it("substitutes {name} and falls back to the safe name", () => {
    expect(buildFileName("certificate_{name}", "Asha_Nair")).toBe("certificate_Asha_Nair");
    expect(buildFileName("plain", "Asha_Nair")).toBe("Asha_Nair");
  });
});

describe("certificateBaseName", () => {
  it("cleans, applies the pattern and resolves collisions", () => {
    const used = new Set<string>();
    expect(certificateBaseName("certificate_{name}", "Asha Nair", used)).toBe(
      "certificate_Asha_Nair",
    );
    expect(certificateBaseName("certificate_{name}", "asha nair", used)).toBe(
      "certificate_asha_nair",
    );
    expect(certificateBaseName("certificate_{name}", "ASHA NAIR", used)).toBe(
      "certificate_ASHA_NAIR",
    );
  });
});
