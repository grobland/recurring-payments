import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function SubscriptionsLoading() {
  return (
    <>
      {/* Header Skeleton */}
      <div className="flex h-14 items-center justify-between border-b px-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>

          {/* Subscription List */}
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-5 w-20 ml-auto" />
                    <Skeleton className="h-4 w-28 ml-auto" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
