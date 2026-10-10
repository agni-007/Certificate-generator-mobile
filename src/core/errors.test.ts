import { AppError, ERROR_MESSAGES, isAppError, messageFor } from "./errors";
import type { ErrorCode } from "./errors";

const ALL_CODES: ErrorCode[] = [
  "NO_TEMPLATE",
  "BAD_TEMPLATE",
  "NO_NAMES",
  "EMPTY_SHEET",
  "BAD_SHEET",
  "BAD_SHEET_FORMAT",
  "GENERATION_FAILED",
  "TEMPLATE_TOO_LARGE",
  "SHEET_TOO_LARGE",
  "TOO_MANY_NAMES",
  "BAD_FILE",
  "BAD_COLOR",
  "BAD_FONT",
  "BAD_ALIGNMENT",
  "NO_UNICODE_FONT",
  "LOW_STORAGE",
];

describe("error catalogue", () => {
  it("has a verbatim, non-empty message for every code", () => {
    for (const code of ALL_CODES) {
      expect(typeof ERROR_MESSAGES[code]).toBe("string");
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
      expect(messageFor(code)).toBe(ERROR_MESSAGES[code]);
    }
    expect(Object.keys(ERROR_MESSAGES).sort()).toEqual([...ALL_CODES].sort());
  });

  it("reuses the exact wording from Appendix A for key messages", () => {
    expect(ERROR_MESSAGES.BAD_TEMPLATE).toBe(
      "Unsupported template format. Please select PDF, PNG, JPG, or JPEG.",
    );
    expect(ERROR_MESSAGES.NO_NAMES).toBe("Please enter at least one name.");
    expect(ERROR_MESSAGES.TOO_MANY_NAMES).toBe("Too many names in one request.");
  });

  it("constructs an AppError with the catalogue message and code", () => {
    const err = new AppError("NO_TEMPLATE");
    expect(isAppError(err)).toBe(true);
    expect(err.code).toBe("NO_TEMPLATE");
    expect(err.userMessage).toBe(ERROR_MESSAGES.NO_TEMPLATE);
    expect(err).toBeInstanceOf(Error);
    expect(isAppError(new Error("nope"))).toBe(false);
  });
});
