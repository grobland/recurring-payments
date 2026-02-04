"use client";

import Link from "next/link";
import {
  CreditCard,
  TrendingUp,
  Calendar,
  AlertCircle,
  Plus,
  ArrowRight,
} from "lucide-react";

import { DashboardHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriptions, useUserStatus, useDelayedLoading } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils/currency";
import { formatRelativeDate, getDaysUntil } from "@/lib/utils/dates";
import { isRetryableError } from "@/lib/utils/errors";
import { ServiceUnavailable } from "@/components/shared/service-unavailable";

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useSubscriptions({ status: "active" });
  const { user, isTrialActive, daysLeftInTrial } = useUserStatus();
  const showSkeleton = useDelayedLoading(isLoading);

  const summary = data?.summary;
  const subscriptions = data?.subscriptions ?? [];

  // Get upcoming renewals (next 7 days)
  const upcomingRenewals = subscriptions
    .filter((sub) => {
      const days = getDaysUntil(sub.nextRenewalDate);
      return days >= 0 && days <= 7;
    })
    .sort(
      (a, b) =>
        new Date(a.nextRenewalDate).getTime() -
        new Date(b.nextRenewalDate).getTime()
    )
    .slice(0, 5);

  // Get subscriptions needing attention
  const needsAttention = subscriptions.filter((sub) => sub.needsUpdate);

  const displayCurrency = user?.displayCurrency ?? "USD";

  // Handle service unavailable (503, network errors)
  if (error && isRetryableError(error)) {
    return (
      <>
        <DashboardHeader title="Dashboard" />
        <main className="flex-1 p-6">
          <ServiceUnavailable
            serviceName="Dashboard"
            onRetry={() => refetch()}
            className="max-w-md mx-auto mt-8"
          />
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="Dashboard" />
      <main className="flex-1 space-y-6 p-6">
        {/* Trial Banner */}
        {isTrialActive && daysLeftInTrial <= 7 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Your trial ends in {daysLeftInTrial} days
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Upgrade now to keep access to all features
                  </p>
                </div>
              </div>
              <Button asChild size="sm">
                <Link href="/settings/billing">Upgrade</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Spending
              </CardTitle>
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
                    {formatCurrency(summary?.totalMonthly ?? 0, displayCurrency)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(
                      (summary?.totalMonthly ?? 0) * 12,
                      displayCurrency
                    )}{" "}
                    per year
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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
                    {summary?.activeCount ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary?.pausedCount ?? 0} paused,{" "}
                    {summary?.cancelledCount ?? 0} cancelled
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Renewing Soon
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
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
                    {summary?.upcomingRenewals?.next7Days ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary?.upcomingRenewals?.next30Days ?? 0} in the next 30
                    days
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Needs Attention
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
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
                    {needsAttention.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Subscriptions with outdated info
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Renewals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Renewals</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/subscriptions">
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {showSkeleton ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : upcomingRenewals.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No upcoming renewals in the next 7 days
                </p>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {upcomingRenewals.map((sub) => {
                    const daysUntil = getDaysUntil(sub.nextRenewalDate);
                    return (
                      <Link
                        key={sub.id}
                        href={`/subscriptions/${sub.id}`}
                        className="flex items-center gap-4 rounded-lg p-2 transition-colors hover:bg-muted"
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: sub.category?.color ?? "#9E9E9E",
                          }}
                        >
                          <CreditCard className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{sub.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {sub.category?.name ?? "Uncategorized"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(
                              parseFloat(sub.amount),
                              sub.currency
                            )}
                          </p>
                          <Badge
                            variant={daysUntil <= 1 ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {daysUntil === 0
                              ? "Today"
                              : daysUntil === 1
                              ? "Tomorrow"
                              : `In ${daysUntil} days`}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/subscriptions/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add new subscription
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/import">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Import from bank statement
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/analytics">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View spending analytics
                </Link>
              </Button>

              {needsAttention.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {needsAttention.length} subscription
                      {needsAttention.length > 1 ? "s" : ""} need
                      {needsAttention.length === 1 ? "s" : ""} attention
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Review and update outdated subscription details
                  </p>
                  <Button
                    size="sm"
                    variant="link"
                    className="mt-2 h-auto p-0 text-amber-700 dark:text-amber-300"
                    asChild
                  >
                    <Link href="/subscriptions?filter=needs-attention">
                      Review now
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
