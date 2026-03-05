"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountSpending } from "@/lib/hooks/use-account-spending";

const AccountSpendingChart = dynamic(
  () => import("./account-spending-chart").then((m) => ({ default: m.AccountSpendingChart })),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
);

interface AccountSpendingTabProps {
  accountId: string;
}

export function AccountSpendingTab({ accountId }: AccountSpendingTabProps) {
  const { data, isLoading, isError, error, refetch } = useAccountSpending(accountId);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center py-16">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <h3 className="text-base font-semibold">Error loading spending data</h3>
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

  // Empty state: no spending data
  if (!data || data.totalSpent === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">
          No spending data yet. Link a source and import statements to see spending for this account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Three stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.totalSpent)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.monthlyAverage)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Merchant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold truncate">{data.topMerchant ?? "—"}</p>
            {data.topMerchant && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(data.topMerchantAmount)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly bar chart */}
      <AccountSpendingChart data={data.monthlyBreakdown} />
    </div>
  );
}
