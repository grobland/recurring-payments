"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { patternKeys } from "./use-pattern-suggestions";

interface BulkAcceptResult {
  acceptedCount: number;
  subscriptionIds: string[];
}

interface BulkDismissResult {
  dismissedCount: number;
}

/**
 * Bulk accept multiple pattern suggestions at once.
 * Creates subscriptions for each accepted pattern.
 * Automatically invalidates pattern and subscription queries.
 *
 * @example
 * ```tsx
 * const bulkAccept = useBulkAcceptPatterns();
 *
 * bulkAccept.mutate({
 *   patternIds: ['pattern-1', 'pattern-2', 'pattern-3']
 * });
 * ```
 */
export function useBulkAcceptPatterns() {
  const queryClient = useQueryClient();

  return useMutation<BulkAcceptResult, Error, { patternIds: string[] }>({
    mutationFn: async ({ patternIds }) => {
      const response = await fetch("/api/patterns/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternIds, action: "accept" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept patterns");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: patternKeys.all });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success(
        `Accepted ${data.acceptedCount} suggestion${data.acceptedCount !== 1 ? "s" : ""}`,
        {
          action: {
            label: "View Subscriptions",
            onClick: () => {
              window.location.href = "/payments/subscriptions";
            },
          },
        }
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to accept patterns");
    },
  });
}

/**
 * Bulk dismiss multiple pattern suggestions at once.
 * Marks patterns as dismissed so they no longer appear.
 * Automatically invalidates pattern queries.
 *
 * @example
 * ```tsx
 * const bulkDismiss = useBulkDismissPatterns();
 *
 * bulkDismiss.mutate({
 *   patternIds: ['pattern-1', 'pattern-2', 'pattern-3']
 * });
 * ```
 */
export function useBulkDismissPatterns() {
  const queryClient = useQueryClient();

  return useMutation<BulkDismissResult, Error, { patternIds: string[] }>({
    mutationFn: async ({ patternIds }) => {
      const response = await fetch("/api/patterns/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternIds, action: "dismiss" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to dismiss patterns");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: patternKeys.all });
      toast.success(
        `Dismissed ${data.dismissedCount} suggestion${data.dismissedCount !== 1 ? "s" : ""}`
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to dismiss patterns");
    },
  });
}
