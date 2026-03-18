"use client";

import Link from "next/link";
import { RefreshCcw, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRecurringDashboard } from "@/lib/hooks/use-recurring";
import { useDelayedLoading } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils/currency";

type DashboardData = {
  activeCount: number;
  monthlyTotal: number;
  upcomingCount: number;
  needsReviewCount: number;
  upcomingPayments: Array<{
    id: string;
    name: string;
    expectedAmount: number | null;
    currency: string;
    nextExpectedDate: string | null;
    recurringKind: string;
  }>;
  amountChanges: Array<{
    id: string;
    recurringMasterId: string;
    masterName: string;
    eventType: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }>;
  needsReviewItems: Array<{
    id: string;
    itemType: string;
    confidence: number | null;
    suggestedAction: string | null;
    createdAt: string;
  }>;
};

export function RecurringDashboardCard() {
  const { data: response, isLoading, error } = useRecurringDashboard();
  const showSkeleton = useDelayedLoading(isLoading);

  // Additive pattern: return null on error so the card just doesn't render
  if (error) return null;

  const data = (response as { data?: DashboardData } | undefined)?.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <RefreshCcw className="h-5 w-5 text-muted-foreground" />
        <CardTitle>Recurring Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Active count */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Active</p>
            {showSkeleton ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {data?.activeCount ?? 0}
              </p>
            )}
          </div>

          {/* Monthly total */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Monthly Total</p>
            {showSkeleton ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-2xl font-semibold">
                {formatCurrency(data?.monthlyTotal ?? 0, "USD")}
              </p>
            )}
          </div>

          {/* Upcoming */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Upcoming (7d)</p>
            {showSkeleton ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              <p className="text-2xl font-semibold">{data?.upcomingCount ?? 0}</p>
            )}
          </div>

          {/* Needs review */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Needs Review</p>
            {showSkeleton ? (
              <Skeleton className="h-7 w-10" />
            ) : (data?.needsReviewCount ?? 0) > 0 ? (
              <Link href="/recurring/review">
                <Badge
                  variant="outline"
                  className="border-orange-300 bg-orange-50 text-orange-700 text-lg px-2 py-0.5 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300"
                >
                  {data?.needsReviewCount}
                </Badge>
              </Link>
            ) : (
              <p className="text-2xl font-semibold">0</p>
            )}
          </div>
        </div>

        {/* Amount changes alert */}
        {!showSkeleton && (data?.amountChanges?.length ?? 0) > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Recent amount changes
                </p>
                {data?.amountChanges.map((change) => (
                  <p
                    key={change.id}
                    className="text-xs text-amber-600 dark:text-amber-400"
                  >
                    {change.masterName}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer link */}
        <Button variant="ghost" size="sm" className="w-full justify-between" asChild>
          <Link href="/recurring">
            <span>View all recurring</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
