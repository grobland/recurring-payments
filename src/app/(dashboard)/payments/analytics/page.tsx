"use client";

import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";

import { DashboardHeader } from "@/components/layout";
import { CategoryPieChart, SpendingTrendChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriptions, useUserStatus } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils/currency";
import { isRetryableError } from "@/lib/utils/errors";
import { ServiceUnavailable } from "@/components/shared/service-unavailable";
import { FeatureGate } from "@/components/features";
import { FEATURES } from "@/lib/features";

export default function AnalyticsPage() {
  const { data, isLoading, error, refetch } = useSubscriptions({ status: "active" });
  const { user } = useUserStatus();

  const subscriptions = data?.subscriptions ?? [];
  const displayCurrency = user?.displayCurrency ?? "USD";

  // Calculate category breakdown
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, { amount: number; color: string }>();

    subscriptions.forEach((sub) => {
      const categoryName = sub.category?.name ?? "Uncategorized";
      const categoryColor = sub.category?.color ?? "#9E9E9E";
      const monthlyAmount = parseFloat(sub.normalizedMonthlyAmount);

      const existing = categoryMap.get(categoryName);
      if (existing) {
        existing.amount += monthlyAmount;
      } else {
        categoryMap.set(categoryName, { amount: monthlyAmount, color: categoryColor });
      }
    });

    return Array.from(categoryMap.entries())
      .map(([name, { amount, color }]) => ({
        name,
        value: amount,
        color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [subscriptions]);

  // Calculate monthly trend (last 12 months based on when subscriptions started)
  const trendData = useMemo(() => {
    const months: { month: string; amount: number }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Calculate total monthly spend for subscriptions active during this month
      let monthlyTotal = 0;
      subscriptions.forEach((sub) => {
        const startDate = sub.startDate ? new Date(sub.startDate) : new Date(sub.createdAt);

        // Check if subscription was active during this month
        if (startDate <= monthEnd) {
          monthlyTotal += parseFloat(sub.normalizedMonthlyAmount);
        }
      });

      months.push({
        month: format(monthDate, "MMM"),
        amount: monthlyTotal,
      });
    }

    return months;
  }, [subscriptions]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalMonthly = subscriptions.reduce(
      (sum, sub) => sum + parseFloat(sub.normalizedMonthlyAmount),
      0
    );
    const totalYearly = totalMonthly * 12;

    // Compare to last month (simplified - just compare first and last trend points)
    const currentMonth = trendData[trendData.length - 1]?.amount ?? 0;
    const lastMonth = trendData[trendData.length - 2]?.amount ?? 0;
    const monthChange = lastMonth > 0 ? ((currentMonth - lastMonth) / lastMonth) * 100 : 0;

    // Average per subscription
    const avgPerSub = subscriptions.length > 0 ? totalMonthly / subscriptions.length : 0;

    // Most expensive subscription
    const mostExpensive = subscriptions.reduce(
      (max, sub) => {
        const monthly = parseFloat(sub.normalizedMonthlyAmount);
        return monthly > max.amount ? { name: sub.name, amount: monthly } : max;
      },
      { name: "", amount: 0 }
    );

    return {
      totalMonthly,
      totalYearly,
      monthChange,
      avgPerSub,
      mostExpensive,
      subscriptionCount: subscriptions.length,
    };
  }, [subscriptions, trendData]);

  const handleExport = () => {
    window.location.href = "/api/subscriptions/export";
  };

  // Handle service unavailable (503, network errors)
  if (error && isRetryableError(error)) {
    return (
      <>
        <DashboardHeader
          title="Analytics"
          breadcrumbs={[
            { label: "subs Dash", href: "/payments/dashboard" },
            { label: "Analytics" },
          ]}
        />
        <main className="flex-1 p-6">
          <ServiceUnavailable
            serviceName="Analytics"
            onRetry={() => refetch()}
            className="max-w-md mx-auto mt-8"
          />
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Analytics"
        breadcrumbs={[
          { label: "subs Dash", href: "/payments/dashboard" },
          { label: "Analytics" },
        ]}
      />
      <FeatureGate feature={FEATURES.BASIC_ANALYTICS}>
        <main className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
            <p className="text-muted-foreground">
              Understand your subscription spending patterns
            </p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Monthly</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalMonthly, displayCurrency)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Yearly</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalYearly, displayCurrency)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Month Change</CardTitle>
              {!isLoading && (
                <div className="text-muted-foreground">
                  {stats.monthChange > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : stats.monthChange < 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div
                  className={`text-2xl font-bold ${
                    stats.monthChange > 0
                      ? "text-red-500"
                      : stats.monthChange < 0
                      ? "text-green-500"
                      : ""
                  }`}
                >
                  {stats.monthChange > 0 ? "+" : ""}
                  {stats.monthChange.toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg per Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.avgPerSub, displayCurrency)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    across {stats.subscriptionCount} subscriptions
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {isLoading ? (
            <>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <CategoryPieChart
                data={categoryData}
                title="Spending by Category"
                currency={displayCurrency}
              />
              <SpendingTrendChart
                data={trendData}
                title="Monthly Spending Trend"
                currency={displayCurrency}
              />
            </>
          )}
        </div>

        {/* Most Expensive */}
        {!isLoading && stats.mostExpensive.name && (
          <Card>
            <CardHeader>
              <CardTitle>Top Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{stats.mostExpensive.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Your most expensive subscription
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.mostExpensive.amount, displayCurrency)}
                  </p>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </main>
      </FeatureGate>
    </>
  );
}
