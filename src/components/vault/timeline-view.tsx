"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useVaultTimeline } from "@/lib/hooks/use-vault-timeline";
import { TimelineGrid } from "@/components/vault/timeline-grid";
import { PdfViewerModal } from "@/components/statements/pdf-viewer-modal";
import { cn } from "@/lib/utils";
import type { VaultTimelineStatement } from "@/lib/hooks/use-vault-timeline";

/**
 * Timeline tab content.
 *
 * - Fetches all statements via useVaultTimeline
 * - Splits into dated (shown in calendar grid) and dateless (shown below)
 * - Clicking a grid cell expands a detail panel for that month
 * - Clicking the same cell again collapses the panel
 */
export function TimelineView() {
  const { data, isLoading, error } = useVaultTimeline();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6 pt-4">
        {/* Skeleton year header */}
        <Skeleton className="h-4 w-10" />
        {/* Skeleton month grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-sm text-destructive">
        Failed to load timeline: {error.message}
      </div>
    );
  }

  const allStatements = data?.statements ?? [];

  // Split into dated and dateless
  const datedStatements = allStatements.filter((s) => s.statementDate !== null);
  const datelessStatements = allStatements.filter(
    (s) => s.statementDate === null
  );

  // Statements for the selected month (client-side filter)
  const selectedMonthStatements =
    selectedMonth !== null
      ? datedStatements.filter((s) => {
          if (!s.statementDate) return false;
          return (
            format(parseISO(s.statementDate), "yyyy-MM") === selectedMonth
          );
        })
      : [];

  const selectedMonthLabel =
    selectedMonth !== null
      ? format(parseISO(selectedMonth + "-01"), "MMMM yyyy")
      : "";

  return (
    <div className="space-y-6 pt-4">
      {/* Calendar grid */}
      <TimelineGrid
        statements={datedStatements}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
      />

      {/* Detail panel — shown when a month is selected */}
      {selectedMonth !== null && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold">{selectedMonthLabel}</h3>
          {selectedMonthStatements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No statements for this month.
            </p>
          ) : (
            <div className="space-y-1">
              {selectedMonthStatements.map((stmt) => (
                <TimelineStatementRow key={stmt.id} statement={stmt} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Date Unknown section — always shown if there are dateless statements */}
      {datelessStatements.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Date Unknown
          </h3>
          <div className="rounded-lg border p-4 space-y-1">
            {datelessStatements.map((stmt) => (
              <TimelineStatementRow key={stmt.id} statement={stmt} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Statement row (same rich row format as folder-statements.tsx) ────────────

function PdfStatusIcon({ hasPdf }: { hasPdf: boolean }) {
  return (
    <FileText
      className={cn(
        "h-4 w-4 shrink-0",
        hasPdf ? "text-green-500" : "text-muted-foreground/40"
      )}
      aria-label={hasPdf ? "PDF stored" : "No file stored"}
    />
  );
}

interface TimelineStatementRowProps {
  statement: VaultTimelineStatement;
}

function TimelineStatementRow({ statement }: TimelineStatementRowProps) {
  const [pdfOpen, setPdfOpen] = useState(false);

  const { id, originalFilename, statementDate, sourceType, transactionCount, stats } =
    statement;

  // Format statement date: "Feb 2026" or "No date"
  const formattedDate = statementDate
    ? format(parseISO(statementDate), "MMM yyyy")
    : "No date";

  return (
    <>
      <div className="flex items-center justify-between rounded-md py-2 px-2 hover:bg-muted/50 transition-colors">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5">
            <button
              onClick={() => statement.hasPdf && setPdfOpen(true)}
              disabled={!statement.hasPdf}
              aria-label={statement.hasPdf ? "View PDF" : "No PDF stored"}
              className={cn(
                "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                statement.hasPdf
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default"
              )}
            >
              <PdfStatusIcon hasPdf={statement.hasPdf} />
            </button>
          </div>
          <div className="min-w-0 space-y-0.5">
            {/* Filename */}
            <p className="text-sm font-medium truncate">{originalFilename}</p>
            {/* Source type + date + transaction count */}
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{sourceType}</span>
              {" · "}
              {formattedDate}
              {" · "}
              {transactionCount}{" "}
              {transactionCount === 1 ? "transaction" : "transactions"}
            </p>
            {/* Status breakdown */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-green-600 dark:text-green-400">
                {stats.converted} converted
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {stats.skipped} skipped
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-yellow-600 dark:text-yellow-400">
                {stats.pending} pending
              </span>
            </div>
          </div>
        </div>
        <Link
          href={`/statements/${id}`}
          className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
        >
          View details
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {statement.hasPdf && (
        <PdfViewerModal
          statementId={statement.id}
          filename={statement.originalFilename}
          open={pdfOpen}
          onClose={() => setPdfOpen(false)}
        />
      )}
    </>
  );
}
