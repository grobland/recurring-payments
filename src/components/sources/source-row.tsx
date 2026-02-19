"use client";

import { format, parseISO } from "date-fns";
import { CoverageGapWarning } from "./coverage-gap-warning";
import type { SourceCoverage } from "@/types/source";

interface SourceRowProps {
  /** Source coverage data */
  source: SourceCoverage;
}

/**
 * Displays a single source row with coverage summary.
 * Shows source name, date range, counts, status stats, and gap warnings.
 */
export function SourceRow({ source }: SourceRowProps) {
  const {
    sourceType,
    earliestStatementDate,
    latestStatementDate,
    statementCount,
    transactionCount,
    lastImportDate,
    stats,
    gaps,
  } = source;

  // Format date range: "Jan 2024 - Feb 2026"
  const formatDateRange = (): string => {
    if (!earliestStatementDate || !latestStatementDate) return "No dates yet";
    const earliest = parseISO(earliestStatementDate);
    const latest = parseISO(latestStatementDate);
    if (isNaN(earliest.getTime()) || isNaN(latest.getTime())) return "No dates yet";
    return `${format(earliest, "MMM yyyy")} - ${format(latest, "MMM yyyy")}`;
  };

  // Format last import date
  const formatLastImport = (): string => {
    if (!lastImportDate) return "Unknown";
    const date = parseISO(lastImportDate);
    if (isNaN(date.getTime())) return "Unknown";
    return format(date, "MMM d, yyyy");
  };

  return (
    <div className="flex w-full flex-col gap-1 text-left">
      {/* Header row: source name + gap badge */}
      <div className="flex items-center gap-2">
        <span className="font-medium">{sourceType}</span>
        <CoverageGapWarning gaps={gaps} />
      </div>

      {/* Date range */}
      <span className="text-sm text-muted-foreground">
        {formatDateRange()}
      </span>

      {/* Counts */}
      <span className="text-sm text-muted-foreground">
        {statementCount} {statementCount === 1 ? "statement" : "statements"} / {transactionCount} transactions
      </span>

      {/* Status breakdown */}
      <div className="flex items-center gap-1 text-sm">
        <span className="text-green-600 dark:text-green-400">
          {stats.converted} converted
        </span>
        <span className="text-muted-foreground">•</span>
        <span className="text-yellow-600 dark:text-yellow-400">
          {stats.pending} pending
        </span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">
          {stats.skipped} skipped
        </span>
      </div>

      {/* Last import */}
      <span className="text-xs text-muted-foreground">
        Last import: {formatLastImport()}
      </span>
    </div>
  );
}

export default SourceRow;
