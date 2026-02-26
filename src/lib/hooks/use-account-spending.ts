"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Aggregate spending response from GET /api/accounts/[id]/spending
 */
export interface AccountSpendingResponse {
  /** Total spent across all transactions from this account */
  totalSpent: number;
  /** Average monthly spend (totalSpent / number of months with data) */
  monthlyAverage: number;
  /** Top merchant by total spend, or null if no transactions */
  topMerchant: string | null;
  /** Total amount spent at top merchant */
  topMerchantAmount: number;
  /** Monthly breakdown ordered oldest to newest */
  monthlyBreakdown: { month: string; amount: number }[];
}

export const accountSpendingKeys = {
  spending: (accountId: string) => ["accounts", accountId, "spending"] as const,
};

async function fetchAccountSpending(accountId: string): Promise<AccountSpendingResponse> {
  const res = await fetch(`/api/accounts/${accountId}/spending`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to fetch account spending" }));
    throw new Error(error.error || "Failed to fetch account spending");
  }
  return res.json();
}

/**
 * TanStack Query hook for account-scoped spending aggregates.
 * Returns totalSpent, monthlyAverage, topMerchant, topMerchantAmount, and monthlyBreakdown.
 */
export function useAccountSpending(accountId: string) {
  return useQuery({
    queryKey: accountSpendingKeys.spending(accountId),
    queryFn: () => fetchAccountSpending(accountId),
    staleTime: 2 * 60 * 1000,
    enabled: !!accountId,
  });
}
