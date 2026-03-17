"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CoverageGrid } from "@/components/vault/coverage-grid";
import { useAccountCoverage } from "@/lib/hooks/use-account-coverage";
import type { FinancialAccount } from "@/lib/db/schema";
import type { CoverageCellClickInfo } from "@/components/vault/coverage-grid";

interface AccountCoverageTabProps {
  accountId: string;
  account: FinancialAccount;
  onNavigateToTransactions: (dateFrom: string, dateTo: string) => void;
}

export function AccountCoverageTab({
  accountId,
  account,
  onNavigateToTransactions,
}: AccountCoverageTabProps) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useAccountCoverage(accountId);

  function handleCellClick(info: CoverageCellClickInfo) {
    if (info.state === "missing") {
      // Gap cell: navigate to historical upload pre-filtered to source
      router.push(`/vault/load?source=${encodeURIComponent(info.sourceType)}`);
      return;
    }
    // Cell with data: navigate to Transactions tab with month date range
    // Parse month string "yyyy-MM" to dateFrom (first day) and dateTo (last day)
    // Build strings directly to avoid local-to-UTC timezone shift
    const year = parseInt(info.month.substring(0, 4));
    const monthIdx = parseInt(info.month.substring(5, 7)) - 1;
    const mm = String(monthIdx + 1).padStart(2, "0");
    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
    const dateFrom = `${year}-${mm}-01`;
    const dateTo = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
    onNavigateToTransactions(dateFrom, dateTo);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center py-12">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <h3 className="text-base font-semibold">Error loading coverage</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {error?.message || "Something went wrong."}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  // Empty state: no sources returned by the API (account has no linked statements)
  const sources = data?.sources ?? [];
  const months = data?.months ?? [];

  if (sources.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No statements linked to this account yet.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/vault/load")}
        >
          Import Statements
        </Button>
      </div>
    );
  }

  return (
    <div>
      <CoverageGrid
        sources={sources}
        months={months}
        onCellClick={handleCellClick}
      />
    </div>
  );
}
