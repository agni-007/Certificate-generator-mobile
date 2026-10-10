/**
 * Error catalogue (implementation.md Appendix A). Messages are reused verbatim
 * where applicable. Pure TypeScript: no react-native/expo imports.
 */

export type ErrorCode =
  | "NO_TEMPLATE"
  | "BAD_TEMPLATE"
  | "NO_NAMES"
  | "EMPTY_SHEET"
  | "BAD_SHEET"
  | "BAD_SHEET_FORMAT"
  | "GENERATION_FAILED"
  | "TEMPLATE_TOO_LARGE"
  | "SHEET_TOO_LARGE"
  | "TOO_MANY_NAMES"
  | "BAD_FILE"
  | "BAD_COLOR"
  | "BAD_FONT"
  | "BAD_ALIGNMENT"
  | "NO_UNICODE_FONT"
  | "LOW_STORAGE";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NO_TEMPLATE: "Please select a certificate template.",
  BAD_TEMPLATE: "Unsupported template format. Please select PDF, PNG, JPG, or JPEG.",
  NO_NAMES: "Please enter at least one name.",
  EMPTY_SHEET: "No valid names were found in the selected file.",
  BAD_SHEET: "Unable to read the selected Excel file. Please check the file and try again.",
  BAD_SHEET_FORMAT: "Unsupported file format. Please select an .xlsx or .csv file.",
  GENERATION_FAILED: "Something went wrong while generating the certificates. Please try again.",
  TEMPLATE_TOO_LARGE: "The certificate template is too large.",
  SHEET_TOO_LARGE: "The selected Excel/CSV file is too large.",
  TOO_MANY_NAMES: "Too many names in one request.",
  BAD_FILE: "The selected file appears to be corrupted or is not a valid file.",
  BAD_COLOR: "Invalid text colour. Please choose a colour.",
  BAD_FONT: "Unsupported font. Please choose one of the listed fonts.",
  BAD_ALIGNMENT: "Unsupported alignment. Use left, center or right.",
  NO_UNICODE_FONT:
    "This name uses characters the selected font cannot show. Choose a font that supports this script.",
  LOW_STORAGE: "Not enough free space for this batch. Free up space or reduce the number of names.",
};

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, cause?: unknown) {
    super(ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    if (cause !== undefined) {
      // Avoid overriding the stack that Error already produced.
      (this as { cause?: unknown }).cause = cause;
    }
  }

  /** User-facing message (what to show in the UI). */
  get userMessage(): string {
    return ERROR_MESSAGES[this.code];
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function messageFor(code: ErrorCode): string {
  return ERROR_MESSAGES[code];
}
