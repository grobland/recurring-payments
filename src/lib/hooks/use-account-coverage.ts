"use client";

import { useQuery } from "@tanstack/react-query";
import type { CoverageResponse } from "@/lib/hooks/use-vault-coverage";

export const accountCoverageKeys = {
  coverage: (accountId: string) => ["accounts", accountId, "coverage"] as const,
};

async function fetchAccountCoverage(accountId: string): Promise<CoverageResponse> {
  const res = await fetch(`/api/accounts/${accountId}/coverage`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to fetch account coverage" }));
    throw new Error(error.error || "Failed to fetch account coverage");
  }
  return res.json();
}

/**
 * TanStack Query hook for account-scoped coverage grid data.
 * Returns a CoverageResponse with at most 1 source (the account's linked source)
 * and exactly 12 month cells — same shape as useVaultCoverage for CoverageGrid.
 *
 * staleTime matches useVaultCoverage (2 minutes).
 */
export function useAccountCoverage(accountId: string) {
  return useQuery({
    queryKey: accountCoverageKeys.coverage(accountId),
    queryFn: () => fetchAccountCoverage(accountId),
    staleTime: 2 * 60 * 1000, // Match vault coverage staleTime
    enabled: !!accountId,
  });
}
