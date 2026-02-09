"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { transactionKeys } from "./use-transactions";
import { subscriptionKeys } from "./use-subscriptions";
import { isRetryableError, getErrorMessage } from "@/lib/utils/errors";
import type { Transaction, Subscription } from "@/lib/db/schema";

// Response types
interface ConvertResponse {
  success: boolean;
  subscription: Subscription;
  transaction: Transaction;
}

interface UndoConvertResponse {
  success: boolean;
  transaction: Transaction;
}

// API functions
async function convertTransaction(transactionId: string): Promise<ConvertResponse> {
  const response = await fetch(`/api/transactions/${transactionId}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to convert transaction");
  }

  return response.json();
}

async function undoConversion(transactionId: string): Promise<UndoConvertResponse> {
  const response = await fetch(`/api/transactions/${transactionId}/convert`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to undo conversion");
  }

  return response.json();
}

/**
 * Mutation hook to convert a transaction to a subscription.
 * Shows toast with undo action that persists for 8 seconds.
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useConvertTransaction();
 *
 * <Button
 *   onClick={() => mutate({
 *     transactionId: transaction.id,
 *     merchantName: transaction.merchantName,
 *   })}
 *   disabled={isPending}
 * >
 *   Convert
 * </Button>
 * ```
 */
export function useConvertTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId }: { transactionId: string; merchantName: string }) =>
      convertTransaction(transactionId),
    retry: (failureCount, error) => {
      if (!isRetryableError(error)) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 2000),
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });

      // Show success toast with undo action
      toast.success(`Converted "${variables.merchantName}" to subscription`, {
        duration: 8000,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await undoConversion(variables.transactionId);
              // Invalidate queries after undo
              queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
              queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
              toast.info("Conversion undone");
            } catch (error) {
              toast.error(getErrorMessage(error));
            }
          },
        },
      });
    },
  });
}

/**
 * Mutation hook to undo a transaction conversion.
 * Use this for direct undo (not via toast action).
 *
 * @example
 * ```tsx
 * const { mutate } = useUndoConversion();
 * mutate(transactionId);
 * ```
 */
export function useUndoConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: undoConversion,
    retry: (failureCount, error) => {
      if (!isRetryableError(error)) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 2000),
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      toast.info("Conversion undone");
    },
  });
}
