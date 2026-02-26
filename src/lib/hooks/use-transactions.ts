"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type {
  TransactionFilters,
  TransactionPage,
  TransactionCursor,
  TransactionWithSource,
} from "@/types/transaction";

// Query keys for transaction queries
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters: TransactionFilters) =>
    [...transactionKeys.lists(), filters] as const,
};

/**
 * Fetch paginated transactions with filters using infinite query.
 * Implements cursor-based pagination for consistent performance with large datasets.
 *
 * @param filters - Optional filters for sourceType, tagStatus, date range, and search
 * @returns useInfiniteQuery result with additional computed helpers
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isLoading } = useTransactions({
 *   tagStatus: 'unreviewed',
 *   search: debouncedSearch,
 * })
 *
 * // Flatten all pages into single array
 * const allTransactions = data?.pages.flatMap(p => p.transactions) ?? []
 * ```
 */
export function useTransactions(filters: TransactionFilters = {}) {
  const query = useInfiniteQuery<
    TransactionPage,
    Error,
    { pages: TransactionPage[]; pageParams: (TransactionCursor | null)[] },
    ReturnType<typeof transactionKeys.list>,
    TransactionCursor | null
  >({
    queryKey: transactionKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();

      // Add filters to query string
      if (filters.sourceType) {
        params.set("sourceType", filters.sourceType);
      }
      if (filters.tagStatus && filters.tagStatus !== "all") {
        params.set("tagStatus", filters.tagStatus);
      }
      if (filters.dateFrom) {
        params.set("dateFrom", filters.dateFrom);
      }
      if (filters.dateTo) {
        params.set("dateTo", filters.dateTo);
      }
      if (filters.search) {
        params.set("search", filters.search);
      }
      if (filters.accountId) {
        params.set("accountId", filters.accountId);
      }

      // Add cursor if not first page
      if (pageParam) {
        params.set("cursorDate", pageParam.transactionDate);
        params.set("cursorId", pageParam.id);
      }

      const url = `/api/transactions${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to fetch transactions" }));
        throw new Error(error.error || "Failed to fetch transactions");
      }

      return res.json() as Promise<TransactionPage>;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      // Return cursor for next page if more data exists
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
  });

  // Computed helpers
  const allTransactions: TransactionWithSource[] =
    query.data?.pages.flatMap((page) => page.transactions) ?? [];

  const totalLoaded = allTransactions.length;

  return {
    ...query,
    /** Flattened array of all loaded transactions */
    allTransactions,
    /** Count of loaded transactions across all pages */
    totalLoaded,
  };
}
