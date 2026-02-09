"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { transactionKeys } from "./use-transactions";
import { isRetryableError, getErrorMessage } from "@/lib/utils/errors";

type BulkTagInput = {
  transactionIds: string[];
  tagId: string;
  action: "add" | "remove";
};

type BulkTagResponse = {
  success: boolean;
  updatedCount: number;
};

async function bulkTagTransactions(
  input: BulkTagInput
): Promise<BulkTagResponse> {
  const response = await fetch("/api/transactions/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to bulk tag transactions");
  }

  return response.json();
}

/**
 * Bulk tag/untag multiple transactions at once.
 * Automatically invalidates transaction queries and shows toast on success.
 *
 * @example
 * ```tsx
 * const bulkTag = useBulkTagTransactions();
 *
 * // Add tag to multiple transactions
 * bulkTag.mutate({
 *   transactionIds: ['tx-1', 'tx-2', 'tx-3'],
 *   tagId: 'tag-456',
 *   action: 'add'
 * });
 * ```
 */
export function useBulkTagTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkTagTransactions,
    retry: (failureCount, error) => {
      // Only retry on network errors or 503
      if (!isRetryableError(error)) return false;
      // Retry up to 2 times (3 total attempts)
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s
      return Math.min(1000 * 2 ** attemptIndex, 2000);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error), {
        duration: 5000,
      });
    },
    onSuccess: (data) => {
      // Invalidate all transaction queries to refresh the data
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      toast.success(`Tagged ${data.updatedCount} transaction${data.updatedCount === 1 ? "" : "s"}`);
    },
  });
}
