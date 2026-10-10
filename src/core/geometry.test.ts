import { readFileSync } from "node:fs";
import { join } from "node:path";

import { A4 } from "./constants";
import { clampDpi, fitPage, imagePageSizePt, pageSizeFromImage, placeText } from "./geometry";
import type { Alignment } from "./types";

interface PlacementCase {
  id: string;
  x: number;
  y: number;
  fontSize: number;
  textWidth: number;
  alignment: Alignment;
  expected: { x: number; baselineFromTop: number; yPdf: number };
}
interface PlacementFixture {
  page: { widthPt: number; heightPt: number };
  cases: PlacementCase[];
}

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), "scripts", "parity-fixtures", "placement.json"), "utf8"),
) as PlacementFixture;

const TOLERANCE_PT = 0.5;

describe("geometry parity fixtures (web-app formula)", () => {
  it("uses the documented A4 page size", () => {
    expect(fixture.page.widthPt).toBeCloseTo(A4.widthPt, 2);
    expect(fixture.page.heightPt).toBeCloseTo(A4.heightPt, 2);
  });

  it.each(fixture.cases.map((c) => [c.id, c] as const))("case %s", (_id, c) => {
    const result = placeText({
      pageW: fixture.page.widthPt,
      pageH: fixture.page.heightPt,
      x: c.x,
      y: c.y,
      fontSize: c.fontSize,
      textWidth: c.textWidth,
      alignment: c.alignment,
    });
    expect(Math.abs(result.x - c.expected.x)).toBeLessThanOrEqual(TOLERANCE_PT);
    expect(Math.abs(result.yPdf - c.expected.yPdf)).toBeLessThanOrEqual(TOLERANCE_PT);
    expect(Math.abs(result.baselineFromTop - c.expected.baselineFromTop)).toBeLessThanOrEqual(
      TOLERANCE_PT,
    );
  });
});

describe("placeText", () => {
  it("centres, right-aligns and left-aligns around the anchor", () => {
    const base = { pageW: 500, pageH: 1000, x: 50, y: 50, fontSize: 30, textWidth: 100 } as const;
    expect(placeText({ ...base, alignment: "left" }).x).toBe(250);
    expect(placeText({ ...base, alignment: "center" }).x).toBe(200);
    expect(placeText({ ...base, alignment: "right" }).x).toBe(150);
  });

  it("clamps the start X at 0 and never returns negative x", () => {
    const p = placeText({
      pageW: 500,
      pageH: 1000,
      x: 0,
      y: 50,
      fontSize: 30,
      textWidth: 100,
      alignment: "right",
    });
    expect(p.startX).toBe(-100);
    expect(p.x).toBe(0);
  });
});

describe("fitPage", () => {
  it("fits landscape and portrait A4 in their own orientation, never enlarging", () => {
    const landscape = fitPage(2000, 1000);
    expect(landscape.widthPt).toBeCloseTo(841.89, 2);
    expect(landscape.heightPt).toBeCloseTo(420.945, 2);
    expect(landscape.scale).toBeCloseTo(0.420945, 5);

    const portrait = fitPage(1000, 2000);
    expect(portrait.widthPt).toBeCloseTo(420.945, 2);
    expect(portrait.heightPt).toBeCloseTo(841.89, 2);
  });

  it("leaves small images unchanged (never enlarge)", () => {
    const small = fitPage(300, 200);
    expect(small.widthPt).toBe(300);
    expect(small.heightPt).toBe(200);
    expect(small.scale).toBe(1);
  });

  it("returns the original size when normaliseToA4 is off", () => {
    const raw = fitPage(2000, 1000, { normaliseToA4: false });
    expect(raw.widthPt).toBe(2000);
    expect(raw.heightPt).toBe(1000);
  });

  it("is a no-op for degenerate sizes", () => {
    expect(fitPage(0, 0)).toEqual({ widthPt: 0, heightPt: 0, scale: 1 });
  });
});

describe("DPI handling", () => {
  it("clamps into 72..600 with a 300 default", () => {
    expect(clampDpi(undefined)).toBe(300);
    expect(clampDpi(50)).toBe(72);
    expect(clampDpi(900)).toBe(600);
    expect(clampDpi(300)).toBe(300);
    expect(clampDpi(Number.NaN)).toBe(300);
  });

  it("converts pixels to points at the given DPI", () => {
    expect(imagePageSizePt(3000, 2000, 300)).toEqual({ widthPt: 720, heightPt: 480 });
    expect(imagePageSizePt(2480, 3508, 300).widthPt).toBeCloseTo(595.2, 1);
  });

  it("applies the A4 fit rule end-to-end", () => {
    const fitted = pageSizeFromImage(6000, 3000, 300, true);
    expect(fitted.widthPt).toBeCloseTo(841.89, 2);
    expect(fitted.heightPt).toBeCloseTo(420.945, 2);
    expect(pageSizeFromImage(6000, 3000, 300, false)).toEqual({ widthPt: 1440, heightPt: 720 });
  });
});
