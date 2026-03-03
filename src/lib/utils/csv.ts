/**
 * Sanitizes a string value to prevent CSV formula injection (CWE-1236).
 * Cells starting with =, +, -, @, \t, or \r are prefixed with a tab character.
 * The tab is invisible in spreadsheet apps and does not alter the displayed value.
 * This is the OWASP-recommended approach for preventing formula injection.
 */
function sanitizeFormulaInjection(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `\t${value}`;
  }
  return value;
}

/**
 * Escapes a value for CSV format with formula injection protection.
 * Applies sanitizeFormulaInjection first, then wraps in quotes if the
 * (possibly sanitized) value contains comma, quote, or newline.
 */
function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const sanitized = sanitizeFormulaInjection(String(value));

  // Check if sanitized value needs to be quoted
  if (
    sanitized.includes(",") ||
    sanitized.includes('"') ||
    sanitized.includes("\n") ||
    sanitized.includes("\r")
  ) {
    // Escape quotes by doubling them
    return `"${sanitized.replace(/"/g, '""')}"`;
  }

  return sanitized;
}

/**
 * Converts an array of objects to CSV format
 */
export function objectsToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) {
    return columns.map((col) => escapeCSVValue(col.header)).join(",");
  }

  // Header row
  const header = columns.map((col) => escapeCSVValue(col.header)).join(",");

  // Data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        return escapeCSVValue(value as string | number | null | undefined);
      })
      .join(",")
  );

  return [header, ...rows].join("\n");
}

/**
 * Creates a downloadable CSV response with UTF-8 BOM for Excel compatibility.
 * BOM (\uFEFF) signals UTF-8 encoding to Excel and prevents mojibake for
 * international characters (accented names, non-USD currencies, etc.).
 * BOM is added here (transport level) not in objectsToCSV (data level)
 * to prevent double-BOM if the CSV string is used elsewhere.
 */
export function createCSVResponse(csv: string, filename: string): Response {
  const BOM = "\uFEFF";
  return new Response(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
