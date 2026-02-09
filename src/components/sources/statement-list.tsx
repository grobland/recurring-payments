"use client";

import { format, parseISO } from "date-fns";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSourceStatements } from "@/lib/hooks/use-source-statements";
import type { StatementSummary } from "@/types/source";

interface StatementListProps {
  /** Source type identifier to fetch statements for */
  sourceType: string;
}

/**
 * Displays a list of statements for a specific source.
 * Lazily loads statements when the source accordion is expanded.
 */
export function StatementList({ sourceType }: StatementListProps) {
  const { data, isLoading, error } = useSourceStatements(sourceType);
  const statements = data?.statements ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3 pl-4">
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
      <div className="py-4 pl-4 text-sm text-destructive">
        Failed to load statements: {error.message}
      </div>
    );
  }

  if (statements.length === 0) {
    return (
      <div className="py-4 pl-4 text-sm text-muted-foreground">
        No statements found for this source.
      </div>
    );
  }

  // Sort by statement date descending (newest first)
  const sortedStatements = [...statements].sort((a, b) => {
    return new Date(b.statementDate).getTime() - new Date(a.statementDate).getTime();
  });

  return (
    <div className="space-y-1 pl-4">
      {sortedStatements.map((statement) => (
        <StatementRow key={statement.id} statement={statement} />
      ))}
    </div>
  );
}

interface StatementRowProps {
  statement: StatementSummary;
}

function StatementRow({ statement }: StatementRowProps) {
  const {
    id,
    originalFilename,
    statementDate,
    transactionCount,
    stats,
  } = statement;

  // Format statement date: "Feb 2026"
  const formattedDate = format(parseISO(statementDate), "MMM yyyy");

  return (
    <div className="flex items-center justify-between rounded-md py-2 px-2 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0 space-y-0.5">
          {/* Filename */}
          <p className="text-sm font-medium truncate">
            {originalFilename}
          </p>
          {/* Date and transaction count */}
          <p className="text-xs text-muted-foreground">
            {formattedDate} • {transactionCount} {transactionCount === 1 ? "transaction" : "transactions"}
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
        href={`/transactions?statementId=${id}`}
        className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
      >
        View details
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

export default StatementList;
