"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { StatementTransaction } from "@/types/source";

// Query keys for statement transaction queries
export const statementTransactionKeys = {
  all: ["statementTransactions"] as const,
  lists: () => [...statementTransactionKeys.all, "list"] as const,
  list: (statementId: string) =>
    [...statementTransactionKeys.lists(), statementId] as const,
};

// Response types
type StatementTransactionsResponse = {
  transactions: StatementTransaction[];
};

// API function
async function fetchStatementTransactions(
  statementId: string
): Promise<StatementTransactionsResponse> {
  const response = await fetch(`/api/statements/${statementId}/transactions`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Failed to fetch transactions",
    }));
    throw new Error(error.error || "Failed to fetch transactions");
  }
  return response.json();
}

/**
 * Fetch all transactions for a specific statement
 *
 * @param statementId - The statement UUID
 * @returns useQuery result with transactions array
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useStatementTransactions(selectedStatementId)
 *
 * // Access transactions (only when statementId is provided)
 * const transactions = data?.transactions ?? []
 * ```
 */
export function useStatementTransactions(
  statementId: string | undefined,
  options?: Omit<
    UseQueryOptions<StatementTransactionsResponse, Error>,
    "queryKey" | "queryFn" | "enabled"
  >
) {
  return useQuery({
    queryKey: statementTransactionKeys.list(statementId ?? ""),
    queryFn: () => fetchStatementTransactions(statementId!),
    enabled: !!statementId,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    ...options,
  });
}
