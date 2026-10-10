import { AppError } from "./errors";
import {
  buildStyle,
  hexToRgb,
  isValidAlignment,
  isValidColor,
  isValidFontKey,
  normalizeColor,
  rgbToHex,
} from "./style";

describe("normalizeColor", () => {
  it("expands #rgb and lower-cases #rrggbb", () => {
    expect(normalizeColor("#fff")).toBe("#ffffff");
    expect(normalizeColor("#ABC")).toBe("#aabbcc");
    expect(normalizeColor("#4F46E5")).toBe("#4f46e5");
  });

  it("parses rgb()/rgba() and clamps channels", () => {
    expect(normalizeColor("rgb(79, 70, 229)")).toBe("#4f46e5");
    expect(normalizeColor("rgb(300, 0, 0)")).toBe("#ff0000");
    expect(normalizeColor("rgba(0,0,0,0.5)")).toBe("#000000");
  });

  it("rejects invalid input", () => {
    expect(normalizeColor("red")).toBeNull();
    expect(normalizeColor("#12")).toBeNull();
    expect(normalizeColor("#gggggg")).toBeNull();
    expect(normalizeColor("rgb(1,2)")).toBeNull();
    expect(isValidColor("#fff")).toBe(true);
    expect(isValidColor("nope")).toBe(false);
  });
});

describe("rgb conversions", () => {
  it("round-trips", () => {
    expect(hexToRgb("#4f46e5")).toEqual({ r: 79, g: 70, b: 229 });
    expect(rgbToHex({ r: 79, g: 70, b: 229 })).toBe("#4f46e5");
    expect(() => hexToRgb("bogus")).toThrow(AppError);
  });
});

describe("isValidFontKey / isValidAlignment", () => {
  it("accepts the 12 standard fonts", () => {
    expect(isValidFontKey("times-italic")).toBe(true);
    expect(isValidFontKey("helvetica-boldoblique")).toBe(true);
  });

  it("accepts custom: and bundled: ids but not empty ones", () => {
    expect(isValidFontKey("custom:ABC123")).toBe(true);
    expect(isValidFontKey("bundled:notosans-malayalam")).toBe(true);
    expect(isValidFontKey("custom:")).toBe(false);
    expect(isValidFontKey("bundled:")).toBe(false);
    expect(isValidFontKey("comic-sans")).toBe(false);
    expect(isValidFontKey(42)).toBe(false);
  });

  it("validates alignment", () => {
    expect(isValidAlignment("center")).toBe(true);
    expect(isValidAlignment("middle")).toBe(false);
  });
});

describe("buildStyle", () => {
  it("fills documented defaults", () => {
    expect(buildStyle()).toEqual({
      x: 50,
      y: 52,
      font: "times-italic",
      fontSize: 37,
      color: "#ffffff",
      alignment: "center",
    });
  });

  it("clamps x/y, fontSize and maxWidthPct", () => {
    const style = buildStyle({ x: 150, y: -20, fontSize: 999, maxWidthPct: 5 });
    expect(style.x).toBe(100);
    expect(style.y).toBe(0);
    expect(style.fontSize).toBe(200);
    expect(style.maxWidthPct).toBe(10);
  });

  it("omits maxWidthPct when not provided", () => {
    expect("maxWidthPct" in buildStyle()).toBe(false);
  });

  it("throws typed errors for invalid fields", () => {
    expect(() => buildStyle({ font: "comic-sans" as never })).toThrow(AppError);
    expect(() => buildStyle({ color: "red" })).toThrow(AppError);
    expect(() => buildStyle({ alignment: "middle" as never })).toThrow(AppError);
    try {
      buildStyle({ color: "red" });
    } catch (e) {
      expect((e as AppError).code).toBe("BAD_COLOR");
    }
  });
});
