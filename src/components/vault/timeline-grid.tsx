"use client";

import { eachMonthOfInterval, format, parseISO, getYear } from "date-fns";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VaultTimelineStatement } from "@/lib/hooks/use-vault-timeline";

interface TimelineGridProps {
  /** Only dated statements — dateless handled separately by parent */
  statements: VaultTimelineStatement[];
  selectedMonth: string | null;
  onSelectMonth: (key: string | null) => void;
}

/**
 * CSS Grid calendar view of statements grouped by year and month.
 *
 * - Year-by-year sections with bold year headers
 * - Each month cell is a button (filled or empty)
 * - Filled cells: FileText icon (green if any statement hasPdf, gray otherwise) + month name + count badge
 * - Empty cells: faded, non-interactive
 * - Selected cell: ring + tinted background
 */
export function TimelineGrid({
  statements,
  selectedMonth,
  onSelectMonth,
}: TimelineGridProps) {
  if (statements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No dated statements to display in timeline.
      </p>
    );
  }

  // Group statements by "yyyy-MM" key
  const byMonth = new Map<string, VaultTimelineStatement[]>();
  for (const stmt of statements) {
    // statementDate is guaranteed non-null here (parent filters)
    const key = format(parseISO(stmt.statementDate!), "yyyy-MM");
    const existing = byMonth.get(key) ?? [];
    existing.push(stmt);
    byMonth.set(key, existing);
  }

  // Compute date range
  const dates = statements
    .map((s) => parseISO(s.statementDate!))
    .sort((a, b) => a.getTime() - b.getTime());
  const earliest = dates[0];
  const latest = dates[dates.length - 1];

  // Generate all months in range
  const allMonths = eachMonthOfInterval({ start: earliest, end: latest });

  // Group months by year
  const byYear = new Map<number, Date[]>();
  for (const month of allMonths) {
    const year = getYear(month);
    const existing = byYear.get(year) ?? [];
    existing.push(month);
    byYear.set(year, existing);
  }

  // Sort years ascending
  const sortedYears = Array.from(byYear.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {sortedYears.map((year) => {
        const months = byYear.get(year)!;

        return (
          <div key={year}>
            {/* Year header */}
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              {year}
            </h3>

            {/* Month grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {months.map((month) => {
                const key = format(month, "yyyy-MM");
                const monthStatements = byMonth.get(key);
                const isFilled = !!monthStatements && monthStatements.length > 0;
                const isSelected = selectedMonth === key;
                const hasAnyPdf = isFilled && monthStatements.some((s) => s.hasPdf);

                if (!isFilled) {
                  // Empty month — faded, non-interactive
                  return (
                    <div
                      key={key}
                      className="flex flex-col items-center gap-1 rounded-md border bg-muted/20 px-2 py-2 opacity-30"
                      aria-label={format(month, "MMMM yyyy") + " — no statements"}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {format(month, "MMM")}
                      </span>
                    </div>
                  );
                }

                return (
                  <button
                    key={key}
                    onClick={() =>
                      onSelectMonth(isSelected ? null : key)
                    }
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border px-2 py-2 transition-colors",
                      "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "ring-2 ring-primary bg-primary/5 border-primary/30"
                        : "bg-background"
                    )}
                    aria-label={`${format(month, "MMMM yyyy")} — ${monthStatements.length} ${monthStatements.length === 1 ? "statement" : "statements"}`}
                    aria-pressed={isSelected}
                  >
                    <FileText
                      className={cn(
                        "h-4 w-4",
                        hasAnyPdf ? "text-green-500" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-xs font-medium">
                      {format(month, "MMM")}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0 h-4 min-w-[1.25rem] justify-center"
                    >
                      {monthStatements.length}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
