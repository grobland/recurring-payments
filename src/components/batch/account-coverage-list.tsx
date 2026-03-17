"use client";

import { FileCheck, FileText, FileX } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountCoverage } from "@/lib/hooks/use-account-coverage";
import { cn } from "@/lib/utils";

interface AccountCoverageListProps {
  accountId: string;
}

function StateIcon({ state }: { state: "pdf" | "data" | "missing" }) {
  if (state === "pdf") {
    return <FileCheck className="size-4 text-green-600 dark:text-green-400" />;
  }
  if (state === "data") {
    return <FileText className="size-4 text-amber-500 dark:text-amber-400" />;
  }
  return <FileX className="size-4 text-muted-foreground/50" />;
}

function stateLabel(state: "pdf" | "data" | "missing") {
  if (state === "pdf") return "PDF stored";
  if (state === "data") return "Data only";
  return "Missing";
}

/**
 * Vertical scrollable list showing 12-month coverage for a selected account.
 * Uses the same data source as the vault coverage grid (useAccountCoverage)
 * but renders as a compact vertical list with icons instead of colored blocks.
 */
export function AccountCoverageList({ accountId }: AccountCoverageListProps) {
  const { data, isLoading } = useAccountCoverage(accountId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    );
  }

  const source = data?.sources?.[0];
  const cells = source?.cells ?? [];

  if (cells.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        No coverage data for this account yet.
      </p>
    );
  }

  // Reverse so newest month is at top
  const reversed = [...cells].reverse();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          Document coverage (last 12 months)
        </p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><FileCheck className="size-3 text-green-600 dark:text-green-400" /> PDF</span>
          <span className="flex items-center gap-1"><FileText className="size-3 text-amber-500 dark:text-amber-400" /> Data</span>
          <span className="flex items-center gap-1"><FileX className="size-3 text-muted-foreground/50" /> Missing</span>
        </div>
      </div>
      <div className="max-h-52 overflow-y-auto rounded-md border bg-muted/20">
        {reversed.map((cell) => {
          const monthDate = parseISO(cell.month + "-01");
          return (
            <div
              key={cell.month}
              className={cn(
                "flex items-center gap-3 px-3 py-1.5 text-sm",
                "border-b last:border-b-0",
              )}
            >
              <StateIcon state={cell.state} />
              <span className="font-medium w-20">
                {format(monthDate, "MMM yyyy")}
              </span>
              <span className="text-xs text-muted-foreground">
                {stateLabel(cell.state)}
                {cell.transactionCount > 0 && ` · ${cell.transactionCount} txns`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
