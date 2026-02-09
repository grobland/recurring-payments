"use client";

// Placeholder - will be implemented in Task 3
// This file exists to allow the index.ts export to work

import type { TransactionFilters } from "@/types/transaction";

// Query keys for transaction queries
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters: TransactionFilters) =>
    [...transactionKeys.lists(), filters] as const,
};

// Placeholder hook - will be implemented in Task 3
export function useTransactions(_filters: TransactionFilters) {
  throw new Error("useTransactions not yet implemented - see Task 3");
}
