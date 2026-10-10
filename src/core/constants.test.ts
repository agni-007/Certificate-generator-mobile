import { A4, DEFAULT_OUTPUT, DEFAULT_STYLE, LIMITS, STANDARD_FONTS } from "./constants";

describe("constants", () => {
  it("offers exactly the 12 standard fonts with unique keys", () => {
    expect(STANDARD_FONTS).toHaveLength(12);
    const keys = new Set(STANDARD_FONTS.map((f) => f.key));
    expect(keys.size).toBe(12);
    const pdfNames = new Set(STANDARD_FONTS.map((f) => f.pdfName));
    expect(pdfNames.size).toBe(12);
  });

  it("uses the documented default style (x=50, y=52, times-italic, 37pt, #ffffff, center)", () => {
    expect(DEFAULT_STYLE).toEqual({
      x: 50,
      y: 52,
      font: "times-italic",
      fontSize: 37,
      color: "#ffffff",
      alignment: "center",
    });
  });

  it("uses the documented default output settings", () => {
    expect(DEFAULT_OUTPUT).toMatchObject({
      format: "pdf-individual",
      imageDpi: 300,
      normaliseToA4: true,
      zip: true,
      fileNamePattern: "certificate_{name}",
    });
  });

  it("exposes the A4 page size in points", () => {
    expect(A4.widthPt).toBeCloseTo(595.28, 2);
    expect(A4.heightPt).toBeCloseTo(841.89, 2);
  });

  it("caps limits at the documented values", () => {
    expect(LIMITS.maxTemplateBytes).toBe(25 * 1024 * 1024);
    expect(LIMITS.maxNameLength).toBe(120);
    expect(LIMITS.maxNames).toBe(2000);
  });
});
