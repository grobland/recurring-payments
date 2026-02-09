"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSources } from "@/lib/hooks/use-sources";
import { SourceList } from "./source-list";

/**
 * Source dashboard component showing all statement sources with coverage statistics.
 * Uses useSources hook to fetch data and renders an accordion-based source list.
 */
export function SourceDashboard() {
  const { data, isLoading, error } = useSources();
  const sources = data?.sources ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <SourceDashboardSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-destructive">
            <p className="font-medium">Failed to load sources</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <SourceList sources={sources} />
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for the source dashboard.
 */
function SourceDashboardSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border-b pb-4 last:border-b-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default SourceDashboard;
