/**
 * Escapes a value for CSV format
 * Wraps in quotes if contains comma, quote, or newline
 */
function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // Check if value needs to be quoted
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    // Escape quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
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
 * Creates a downloadable CSV response
 */
export function createCSVResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
