"use client";

import {
  TrendingUp,
  Calendar,
  CreditCard,
  Layers,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/lib/hooks/use-analytics";
import { useDelayedLoading } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils/currency";
import type { AnalyticsParams } from "@/types/analytics";

interface AnalyticsCardsProps {
  /** Analytics query parameters */
  params: AnalyticsParams;
}

/**
 * Analytics stat cards showing spending totals
 */
export function AnalyticsCards({ params }: AnalyticsCardsProps) {
  const { data, isLoading, isError, error } = useAnalytics(
    params.period,
    params.year,
    params.month,
    params.quarter
  );

  const showSkeleton = useDelayedLoading(isLoading);

  const displayCurrency = data?.displayCurrency ?? "USD";

  // Error state
  if (isError) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Error loading data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-destructive">
                {error instanceof Error ? error.message : "Failed to load"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Monthly Spending */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {showSkeleton ? (
            <>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="mt-2 h-3 w-20" />
            </>
          ) : (
            <div className="animate-in fade-in duration-150">
              <div className="text-2xl font-bold">
                {formatCurrency(data?.totalMonthly ?? 0, displayCurrency)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(data?.totalYearly ?? 0, displayCurrency)} per year
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yearly Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Yearly Total</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {showSkeleton ? (
            <>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="mt-2 h-3 w-24" />
            </>
          ) : (
            <div className="animate-in fade-in duration-150">
              <div className="text-2xl font-bold">
                {formatCurrency(data?.totalYearly ?? 0, displayCurrency)}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on {getPeriodLabel(params)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Subscriptions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Subscriptions
          </CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {showSkeleton ? (
            <>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-24" />
            </>
          ) : (
            <div className="animate-in fade-in duration-150">
              <div className="text-2xl font-bold">
                {data?.subscriptionCount ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {data?.categoryCount ?? 0} categories
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Category</CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {showSkeleton ? (
            <>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="mt-2 h-3 w-20" />
            </>
          ) : (
            <div className="animate-in fade-in duration-150">
              {data?.categories && data.categories.length > 0 ? (
                <>
                  <div className="text-2xl font-bold truncate">
                    {data.categories[0].name}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(data.categories[0].amount, displayCurrency)} (
                    {data.categories[0].percentage.toFixed(0)}%)
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">No spending data</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Get human-readable period label
 */
function getPeriodLabel(params: AnalyticsParams): string {
  switch (params.period) {
    case "month":
      return "current rates";
    case "quarter":
      return `Q${params.quarter} ${params.year}`;
    case "year":
      return `${params.year}`;
    default:
      return "selected period";
  }
}
