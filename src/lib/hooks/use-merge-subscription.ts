import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { subscriptionKeys } from "./use-subscriptions";
import type { SubscriptionWithCategory } from "@/types/subscription";

// 24 hours in milliseconds
const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface MergeRequest {
  targetId: string;
  sourceId: string;
  selectedFields: {
    name: "target" | "source";
    amount: "target" | "source";
    frequency: "target" | "source";
    category: "target" | "source";
    nextRenewalDate: "target" | "source";
  };
}

interface MergeResponse {
  subscription: SubscriptionWithCategory;
}

async function mergeSubscriptions(data: MergeRequest): Promise<MergeResponse> {
  const response = await fetch("/api/subscriptions/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to merge subscriptions");
  }

  return response.json();
}

async function undoMerge(sourceId: string): Promise<MergeResponse> {
  const response = await fetch("/api/subscriptions/merge", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to undo merge");
  }

  return response.json();
}

interface MergeContext {
  sourceId: string;
  sourceName: string;
  mergedAt: Date;
}

/**
 * Hook for merging subscriptions with optimistic updates and undo capability
 */
export function useMergeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mergeSubscriptions,
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: subscriptionKeys.lists() });

      // Return context for rollback
      return { sourceId: data.sourceId };
    },
    onError: (_error, _variables, context) => {
      // Rollback handled by invalidation
      toast.error("Failed to merge subscriptions");
    },
    onSuccess: (result, variables) => {
      // Store merge context for undo
      const mergeContext: MergeContext = {
        sourceId: variables.sourceId,
        sourceName: result.subscription.name, // This is the merged name
        mergedAt: new Date(),
      };

      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });

      // Show success toast with undo action
      toast.success("Subscriptions merged", {
        description: "The duplicate has been merged successfully.",
        action: {
          label: "Undo",
          onClick: async () => {
            // Check if still within undo window
            const now = new Date();
            const timeSinceMerge = now.getTime() - mergeContext.mergedAt.getTime();

            if (timeSinceMerge > UNDO_WINDOW_MS) {
              toast.error("Undo window expired", {
                description: "Merges can only be undone within 24 hours.",
              });
              return;
            }

            try {
              await undoMerge(mergeContext.sourceId);
              queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
              toast.success("Merge undone", {
                description: "The subscription has been restored.",
              });
            } catch (error) {
              toast.error("Failed to undo merge", {
                description: error instanceof Error ? error.message : "An error occurred",
              });
            }
          },
        },
        duration: 10000, // 10 seconds to show undo option
      });
    },
  });
}
