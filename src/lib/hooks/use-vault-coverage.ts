"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * A single month cell in the coverage grid for a source.
 */
export interface CoverageCell {
  /** Month label in "yyyy-MM" format, e.g. "2026-02" */
  month: string;
  /** Cell state based on statement and PDF availability */
  state: "pdf" | "data" | "missing";
  /** Statement UUID, or null if no statement exists for this cell */
  statementId: string | null;
  /** Number of transactions in the statement for this cell */
  transactionCount: number;
  /** ISO date string of the statement date, or null (used for tooltip) */
  statementDate: string | null;
}

/**
 * A single source row in the coverage grid.
 */
export interface CoverageSource {
  /** Source type identifier (e.g., "Chase Sapphire") */
  sourceType: string;
  /** Cells ordered oldest to newest (count matches months.length) */
  cells: CoverageCell[];
}

/**
 * Full response from GET /api/vault/coverage
 */
export interface CoverageResponse {
  /** Per-source coverage rows */
  sources: CoverageSource[];
  /** Total count of "missing" cells across all sources */
  gapCount: number;
  /** Month labels in display order (oldest first), e.g. ["2025-03", ..., "2026-02"] */
  months: string[];
  /** Global date range of the user's earliest and latest statements */
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
}

/** Date range parameters for the coverage query */
export interface CoverageDateRange {
  /** Start month in yyyy-MM format */
  from: string;
  /** End month in yyyy-MM format */
  to: string;
}

export const vaultCoverageKeys = {
  all: () => ["vault", "coverage"] as const,
  range: (from: string, to: string) => ["vault", "coverage", from, to] as const,
};

async function fetchVaultCoverage(range?: CoverageDateRange): Promise<CoverageResponse> {
  const params = new URLSearchParams();
  if (range) {
    params.set("from", range.from);
    params.set("to", range.to);
  }
  const qs = params.toString();
  const url = qs ? `/api/vault/coverage?${qs}` : "/api/vault/coverage";

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch vault coverage");
  }
  return response.json();
}

/**
 * TanStack Query hook for vault coverage grid data.
 * Accepts optional date range; defaults to last 12 months on the server.
 */
export function useVaultCoverage(range?: CoverageDateRange) {
  return useQuery({
    queryKey: range
      ? vaultCoverageKeys.range(range.from, range.to)
      : vaultCoverageKeys.all(),
    queryFn: () => fetchVaultCoverage(range),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
