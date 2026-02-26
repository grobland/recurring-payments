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
  onNavigateToDetails: () => void;
}

export function AccountCoverageTab({
  accountId,
  account,
  onNavigateToTransactions,
  onNavigateToDetails,
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
    const year = parseInt(info.month.substring(0, 4));
    const monthIdx = parseInt(info.month.substring(5, 7)) - 1;
    const dateFrom = new Date(year, monthIdx, 1).toISOString().split("T")[0];
    const dateTo = new Date(year, monthIdx + 1, 0).toISOString().split("T")[0];
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

  // Empty state: no linked source
  if (!account.linkedSourceType) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No statement source linked to this account.
        </p>
        <Button variant="outline" className="mt-4" onClick={onNavigateToDetails}>
          Go to Details to link a source
        </Button>
      </div>
    );
  }

  return (
    <div>
      <CoverageGrid
        sources={data?.sources ?? []}
        months={data?.months ?? []}
        onCellClick={handleCellClick}
      />
    </div>
  );
}
