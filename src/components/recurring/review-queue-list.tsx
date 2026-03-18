"use client";

import { ClipboardCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ServiceUnavailable } from "@/components/shared/service-unavailable";
import { ReviewQueueCard } from "./review-queue-card";
import {
  useReviewQueue,
  useResolveReviewItem,
  useRecurringMasters,
} from "@/lib/hooks/use-recurring";
import { useDelayedLoading } from "@/lib/hooks";

// ============ Types ============

type ReviewQueueItem = {
  id: string;
  itemType: string;
  confidence: number | null;
  suggestedAction: string | null;
  recurringSeriesId: string | null;
  recurringMasterId: string | null;
  series: {
    merchantName: string;
    avgAmount: number | null;
    currency: string;
    cadence: string | null;
    transactionCount: number;
  } | null;
  createdAt: string;
};

type MasterOption = {
  id: string;
  name: string;
  recurringKind: string;
};

// ============ Skeleton ============

function ReviewQueueSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3">
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
            </div>
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============ Main Component ============

export function ReviewQueueList() {
  const {
    data: queueResponse,
    isLoading: queueLoading,
    error: queueError,
    refetch,
  } = useReviewQueue();

  const {
    data: mastersResponse,
    isLoading: mastersLoading,
  } = useRecurringMasters({});

  const resolveReviewItem = useResolveReviewItem();
  const showSkeleton = useDelayedLoading(queueLoading || mastersLoading);

  const items: ReviewQueueItem[] = (
    (queueResponse as { data?: ReviewQueueItem[] } | undefined)?.data ?? []
  ).slice().sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  const masters: MasterOption[] = (
    (mastersResponse as { data?: { masters: MasterOption[] } } | undefined)?.data
      ?.masters ?? []
  );

  if (showSkeleton) {
    return <ReviewQueueSkeleton />;
  }

  if (queueError) {
    return (
      <ServiceUnavailable
        serviceName="Review Queue"
        onRetry={() => refetch()}
        className="max-w-md mx-auto"
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No items to review"
        description="All recurring payment candidates have been reviewed. New items will appear here as your statements are processed."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {items.length} item{items.length === 1 ? "" : "s"} waiting for review, sorted by confidence
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ReviewQueueCard
            key={item.id}
            item={item}
            masters={masters}
            onResolve={(data) =>
              resolveReviewItem.mutate({ id: item.id, data })
            }
            isResolving={
              resolveReviewItem.isPending &&
              resolveReviewItem.variables?.id === item.id
            }
          />
        ))}
      </div>
    </div>
  );
}
