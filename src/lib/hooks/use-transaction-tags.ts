"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { transactionKeys } from "./use-transactions";
import { isRetryableError, getErrorMessage } from "@/lib/utils/errors";

type ToggleTagInput = {
  transactionId: string;
  tagId: string;
  action: "add" | "remove";
};

type ToggleTagResponse = {
  success: boolean;
};

async function toggleTransactionTag(
  input: ToggleTagInput
): Promise<ToggleTagResponse> {
  const response = await fetch(`/api/transactions/${input.transactionId}/tags`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tagId: input.tagId,
      action: input.action,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update tag");
  }

  return response.json();
}

/**
 * Toggle a tag on/off for a transaction.
 * Automatically invalidates transaction queries on success.
 *
 * @example
 * ```tsx
 * const toggleTag = useToggleTransactionTag();
 *
 * // Add a tag
 * toggleTag.mutate({
 *   transactionId: 'tx-123',
 *   tagId: 'tag-456',
 *   action: 'add'
 * });
 *
 * // Remove a tag
 * toggleTag.mutate({
 *   transactionId: 'tx-123',
 *   tagId: 'tag-456',
 *   action: 'remove'
 * });
 * ```
 */
export function useToggleTransactionTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleTransactionTag,
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
    onSuccess: () => {
      // Invalidate all transaction queries to refresh the data
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}
