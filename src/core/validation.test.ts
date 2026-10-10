import { AppError } from "./errors";
import {
  detectTemplateFormat,
  extensionOf,
  isSupportedTemplateName,
  isZipContainer,
  startsWith,
  validateSheet,
  validateTemplate,
} from "./validation";

const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

describe("extensionOf", () => {
  it.each([
    ["certificate.PDF", "pdf"],
    ["photo.jpg", "jpg"],
    ["photo.jpeg", "jpeg"],
    ["a.b.c.png", "png"],
    ["no-extension", ""],
    ["/path/to/names.CSV", "csv"],
    [String.raw`C:\Users\me\names.xlsx`, "xlsx"],
  ])("%s -> %s", (name, expected) => {
    expect(extensionOf(name)).toBe(expected);
  });
});

describe("detectTemplateFormat", () => {
  it("detects the three supported formats", () => {
    expect(detectTemplateFormat(pdfBytes)).toBe("pdf");
    expect(detectTemplateFormat(pngBytes)).toBe("png");
    expect(detectTemplateFormat(jpegBytes)).toBe("jpeg");
  });

  it("returns null for unknown or truncated input", () => {
    expect(detectTemplateFormat(new Uint8Array())).toBeNull();
    expect(detectTemplateFormat(new Uint8Array([0x25, 0x50]))).toBeNull();
    expect(detectTemplateFormat(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
  });
});

describe("startsWith / isZipContainer", () => {
  it("compares signatures", () => {
    expect(startsWith(pdfBytes, [0x25, 0x50, 0x44, 0x46])).toBe(true);
    expect(startsWith(pdfBytes, [0x25, 0x50, 0x44, 0x47])).toBe(false);
    expect(isZipContainer(zipBytes)).toBe(true);
    expect(isZipContainer(pngBytes)).toBe(false);
  });
});

describe("validateTemplate", () => {
  it("accepts matching extension + magic bytes", () => {
    expect(validateTemplate("cert.pdf", pdfBytes)).toEqual({ format: "pdf", kind: "pdf" });
    expect(validateTemplate("cert.PNG", pngBytes)).toEqual({ format: "png", kind: "image" });
    expect(validateTemplate("cert.jpeg", jpegBytes)).toEqual({ format: "jpeg", kind: "image" });
    expect(validateTemplate("cert.jpg", jpegBytes)).toEqual({ format: "jpeg", kind: "image" });
  });

  it("rejects unsupported extensions", () => {
    expect(() => validateTemplate("cert.svg", pdfBytes)).toThrow(AppError);
    try {
      validateTemplate("cert.svg", pdfBytes);
    } catch (e) {
      expect((e as AppError).code).toBe("BAD_TEMPLATE");
    }
  });

  it("rejects an extension/magic-byte mismatch", () => {
    try {
      validateTemplate("cert.pdf", pngBytes);
    } catch (e) {
      expect((e as AppError).code).toBe("BAD_TEMPLATE");
    }
    try {
      validateTemplate("cert.png", jpegBytes);
    } catch (e) {
      expect((e as AppError).code).toBe("BAD_TEMPLATE");
    }
  });

  it("rejects files larger than the 25 MB cap", () => {
    const big = new Uint8Array(25 * 1024 * 1024 + 1);
    big.set(pdfBytes, 0);
    try {
      validateTemplate("cert.pdf", big);
    } catch (e) {
      expect((e as AppError).code).toBe("TEMPLATE_TOO_LARGE");
    }
  });
});

describe("validateSheet", () => {
  it("accepts csv/tsv/txt with no magic-byte requirement", () => {
    expect(validateSheet("names.csv", new Uint8Array([0x61]))).toEqual({ extension: "csv" });
    expect(validateSheet("names.tsv", new Uint8Array([0x61]))).toEqual({ extension: "tsv" });
    expect(validateSheet("names.txt", new Uint8Array([0x61]))).toEqual({ extension: "txt" });
  });

  it("accepts a real xlsx (zip) container", () => {
    expect(validateSheet("names.xlsx", zipBytes)).toEqual({ extension: "xlsx" });
  });

  it("rejects xlsx without a zip signature", () => {
    try {
      validateSheet("names.xlsx", new Uint8Array([0x61, 0x62]));
    } catch (e) {
      expect((e as AppError).code).toBe("BAD_SHEET");
    }
  });

  it("rejects unsupported extensions and oversized files", () => {
    try {
      validateSheet("names.pdf", pdfBytes);
    } catch (e) {
      expect((e as AppError).code).toBe("BAD_SHEET_FORMAT");
    }
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(zipBytes, 0);
    try {
      validateSheet("names.xlsx", big);
    } catch (e) {
      expect((e as AppError).code).toBe("SHEET_TOO_LARGE");
    }
  });
});

describe("isSupportedTemplateName", () => {
  it("recognises supported extensions only", () => {
    expect(isSupportedTemplateName("a.pdf")).toBe(true);
    expect(isSupportedTemplateName("a.JPEG")).toBe(true);
    expect(isSupportedTemplateName("a.gif")).toBe(false);
  });
});
