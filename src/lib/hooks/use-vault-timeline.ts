"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * A single statement entry in the vault timeline response
 */
export interface VaultTimelineStatement {
  /** Statement UUID */
  id: string;
  /** Source type (e.g., "Chase Sapphire") */
  sourceType: string;
  /** Original uploaded filename */
  originalFilename: string;
  /** Statement date as ISO string, or null if unknown */
  statementDate: string | null;
  /** Number of transactions in this statement */
  transactionCount: number;
  /** Whether the original PDF is stored in Supabase Storage */
  hasPdf: boolean;
  /** Transaction status breakdown */
  stats: {
    converted: number;
    skipped: number;
    pending: number;
  };
}

/**
 * Full response from GET /api/vault/timeline
 */
export interface VaultTimelineResponse {
  statements: VaultTimelineStatement[];
  /** Number of distinct source types */
  totalSources: number;
  /** Total statement count */
  totalStatements: number;
  /** Count of statements with PDF stored */
  totalPdfs: number;
}

export const vaultKeys = {
  timeline: () => ["vault", "timeline"] as const,
};

async function fetchVaultTimeline(): Promise<VaultTimelineResponse> {
  const response = await fetch("/api/vault/timeline");
  if (!response.ok) {
    throw new Error("Failed to fetch vault timeline");
  }
  return response.json();
}

/**
 * TanStack Query hook for vault timeline data.
 * Fetches all user statements across all sources with transaction stats
 * and aggregate counts.
 */
export function useVaultTimeline() {
  return useQuery({
    queryKey: vaultKeys.timeline(),
    queryFn: fetchVaultTimeline,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
