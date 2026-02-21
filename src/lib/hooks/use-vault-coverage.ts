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
 * A single source row in the coverage grid, with exactly 12 month cells.
 */
export interface CoverageSource {
  /** Source type identifier (e.g., "Chase Sapphire") */
  sourceType: string;
  /** Exactly 12 cells ordered oldest to newest */
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
  /** 12 month labels in display order (oldest first), e.g. ["2025-03", ..., "2026-02"] */
  months: string[];
}

export const vaultCoverageKeys = {
  all: () => ["vault", "coverage"] as const,
};

async function fetchVaultCoverage(): Promise<CoverageResponse> {
  const response = await fetch("/api/vault/coverage");
  if (!response.ok) {
    throw new Error("Failed to fetch vault coverage");
  }
  return response.json();
}

/**
 * TanStack Query hook for vault coverage grid data.
 * Returns per-source x 12-month coverage showing which cells have
 * PDFs, data only, or are missing entirely.
 */
export function useVaultCoverage() {
  return useQuery({
    queryKey: vaultCoverageKeys.all(),
    queryFn: fetchVaultCoverage,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
