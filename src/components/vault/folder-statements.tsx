"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSourceStatements } from "@/lib/hooks/use-source-statements";
import { PdfViewerModal } from "@/components/statements/pdf-viewer-modal";
import { cn } from "@/lib/utils";
import type { StatementSummary } from "@/types/source";

interface FolderStatementsProps {
  sourceType: string;
}

export function FolderStatements({ sourceType }: FolderStatementsProps) {
  const { data, isLoading, error } = useSourceStatements(sourceType);
  const statements = data?.statements ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3 px-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 px-2 text-sm text-destructive">
        Failed to load statements: {error.message}
      </div>
    );
  }

  if (statements.length === 0) {
    return (
      <div className="py-4 px-2 text-sm text-muted-foreground">
        No statements found for this source.
      </div>
    );
  }

  // Sort by statement date descending (newest first), dateless last
  const sortedStatements = [...statements].sort((a, b) => {
    const dateA = a.statementDate ? new Date(a.statementDate).getTime() : 0;
    const dateB = b.statementDate ? new Date(b.statementDate).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="space-y-1">
      {sortedStatements.map((statement) => (
        <StatementRow key={statement.id} statement={statement} />
      ))}
    </div>
  );
}

interface StatementRowProps {
  statement: StatementSummary;
}

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

function StatementRow({ statement }: StatementRowProps) {
  const [pdfOpen, setPdfOpen] = useState(false);

  const { id, originalFilename, statementDate, transactionCount, stats } =
    statement;

  // Format statement date: "Feb 2026"
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
            {/* Date and transaction count */}
            <p className="text-xs text-muted-foreground">
              {formattedDate} •{" "}
              {transactionCount}{" "}
              {transactionCount === 1 ? "transaction" : "transactions"}
            </p>
            {/* Status breakdown */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-green-600 dark:text-green-400">
                {stats.converted} converted
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {stats.skipped} skipped
              </span>
              <span className="text-muted-foreground">•</span>
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
