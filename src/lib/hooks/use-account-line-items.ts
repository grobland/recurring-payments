"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { LineItem } from "./use-statement-line-items";

export interface AccountLineItemFilters {
  accountId: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: "debit" | "credit" | "all";
}

export interface AccountLineItem extends LineItem {
  sourceType: string | null;
  originalFilename: string | null;
}

interface AccountLineItemsPage {
  lineItems: AccountLineItem[];
  nextCursor: { transactionDate: string; id: string } | null;
  hasMore: boolean;
}

export const accountLineItemKeys = {
  all: ["account-line-items"] as const,
  list: (filters: AccountLineItemFilters) =>
    [...accountLineItemKeys.all, filters] as const,
};

export function useAccountLineItems(filters: AccountLineItemFilters) {
  const query = useInfiniteQuery<
    AccountLineItemsPage,
    Error,
    { pages: AccountLineItemsPage[]; pageParams: (null | { transactionDate: string; id: string })[] },
    ReturnType<typeof accountLineItemKeys.list>,
    { transactionDate: string; id: string } | null
  >({
    queryKey: accountLineItemKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();

      if (filters.search) params.set("search", filters.search);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.type && filters.type !== "all") params.set("type", filters.type);

      if (pageParam) {
        params.set("cursorDate", pageParam.transactionDate);
        params.set("cursorId", pageParam.id);
      }

      const url = `/api/accounts/${filters.accountId}/line-items${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to fetch" }));
        throw new Error(err.error || "Failed to fetch line items");
      }
      return res.json();
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!filters.accountId,
  });

  const allLineItems: AccountLineItem[] =
    query.data?.pages.flatMap((p) => p.lineItems) ?? [];

  return {
    ...query,
    allLineItems,
    totalLoaded: allLineItems.length,
  };
}
