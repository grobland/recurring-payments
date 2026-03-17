import { startOfMonth } from "date-fns";

/**
 * Attempt to extract a statement date from a PDF filename.
 *
 * Supports common patterns:
 *   "fd statement 3736 19122025.pdf"  → 2025-12-19 → start of Dec 2025
 *   "statement-2025-03.pdf"           → 2025-03-01
 *   "lloyds_202501.pdf"               → 2025-01-01
 *   "bank_jan_2025.pdf"               → 2025-01-01
 *   "statement_03-2025.pdf"           → 2025-03-01
 *
 * Returns the first day of the detected month, or null if no date found.
 */
export function parseFilenameDate(filename: string): Date | null {
  // Strip extension
  const name = filename.replace(/\.[^.]+$/, "").toLowerCase();

  // Pattern 1: DDMMYYYY (e.g. "19122025" → 19 Dec 2025)
  const ddmmyyyy = name.match(/(\d{2})(\d{2})(20\d{2})/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    const day = parseInt(dd, 10);
    const month = parseInt(mm, 10);
    const year = parseInt(yyyy, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return startOfMonth(new Date(year, month - 1, 1));
    }
  }

  // Pattern 2: YYYY-MM or YYYYMM (e.g. "2025-03" or "202503")
  const yyyymm = name.match(/(20\d{2})[-_]?(\d{2})(?!\d)/);
  if (yyyymm) {
    const year = parseInt(yyyymm[1], 10);
    const month = parseInt(yyyymm[2], 10);
    if (month >= 1 && month <= 12) {
      return startOfMonth(new Date(year, month - 1, 1));
    }
  }

  // Pattern 3: MM-YYYY or MM_YYYY (e.g. "03-2025")
  const mmyyyy = name.match(/(?<!\d)(\d{2})[-_](20\d{2})/);
  if (mmyyyy) {
    const month = parseInt(mmyyyy[1], 10);
    const year = parseInt(mmyyyy[2], 10);
    if (month >= 1 && month <= 12) {
      return startOfMonth(new Date(year, month - 1, 1));
    }
  }

  // Pattern 4: Month name + year (e.g. "jan_2025", "january 2025")
  const monthNames: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  const monthNamePattern = name.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b.*?(20\d{2})/
  );
  if (monthNamePattern) {
    const monthIdx = monthNames[monthNamePattern[1]];
    const year = parseInt(monthNamePattern[2], 10);
    if (monthIdx !== undefined) {
      return startOfMonth(new Date(year, monthIdx, 1));
    }
  }

  return null;
}
